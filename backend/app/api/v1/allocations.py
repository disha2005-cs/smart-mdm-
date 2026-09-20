from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api import deps
from app.core.validators import (
    ALLOCATION_UNITS,
    INVENTORY_CATEGORIES,
    bad_request,
    clean_str,
    validate_choice,
    validate_positive,
)
from app.database import get_db
from app.models.food_allocation import AllocationStatus, FoodAllocation
from app.models.inventory import Inventory
from app.models.school import School
from app.models.user import UserRole
from app.schemas.food_allocation import (
    FoodAllocation as FoodAllocationSchema,
    FoodAllocationCreate,
    FoodAllocationUpdate,
)

router = APIRouter()

MAX_ALLOCATION_QUANTITY = 1_000_000.0


class RejectRequest(BaseModel):
    reason: Optional[str] = Field(default=None, max_length=200)


def _normalise_item_name(name: Optional[str]) -> str:
    name = clean_str(name)
    if not name:
        raise bad_request("Item name is required")
    if len(name) > 80:
        raise bad_request("Item name must be at most 80 characters")
    return name


@router.post("/", response_model=FoodAllocationSchema, status_code=status.HTTP_201_CREATED)
def create_allocation(
    *,
    db: Session = Depends(get_db),
    allocation_in: FoodAllocationCreate,
    current_user=Depends(deps.get_current_gov_admin),
):
    """Allocate food to a school (Government Admin only)."""
    item_name = _normalise_item_name(allocation_in.item_name)
    category = validate_choice(allocation_in.category, INVENTORY_CATEGORIES, "Category")
    unit = validate_choice(allocation_in.unit, ALLOCATION_UNITS, "Unit")
    quantity = validate_positive(allocation_in.quantity, "Quantity", max_value=MAX_ALLOCATION_QUANTITY)

    school = db.query(School).filter(School.id == allocation_in.school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    if not school.is_active:
        raise bad_request("Cannot allocate food to an inactive school")

    existing = db.query(FoodAllocation).filter(
        FoodAllocation.school_id == allocation_in.school_id,
        func.lower(FoodAllocation.item_name) == item_name.lower(),
        FoodAllocation.status == AllocationStatus.PENDING,
    ).first()

    if existing:
        raise bad_request(
            f"A pending allocation of {item_name} to {school.school_name} already exists. "
            "Approve or reject it before creating another."
        )

    allocation = FoodAllocation(
        school_id=allocation_in.school_id,
        item_name=item_name,
        category=category,
        quantity=quantity,
        unit=unit,
        notes=clean_str(allocation_in.notes),
        allocation_date=date.today(),
        status=AllocationStatus.PENDING,
    )
    db.add(allocation)
    db.commit()
    db.refresh(allocation)
    return allocation


@router.get("/", response_model=List[FoodAllocationSchema])
def get_allocations(
    skip: int = 0,
    limit: int = 100,
    school_id: Optional[int] = None,
    status_filter: Optional[AllocationStatus] = None,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    """Government admins see every allocation; schools see their own."""
    if skip < 0 or limit < 1 or limit > 500:
        raise bad_request("skip must be >= 0 and limit between 1 and 500")

    query = db.query(FoodAllocation)

    if current_user.role == UserRole.SCHOOL:
        query = query.filter(FoodAllocation.school_id == current_user.school_id)
    elif school_id is not None:
        query = query.filter(FoodAllocation.school_id == school_id)

    if status_filter:
        query = query.filter(FoodAllocation.status == status_filter)

    return query.order_by(FoodAllocation.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/summary")
def get_allocation_summary(
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_gov_admin),
):
    """Allocation rollup for the government dashboard."""
    status_counts = db.query(
        FoodAllocation.status,
        func.count(FoodAllocation.id).label("count"),
        func.coalesce(func.sum(FoodAllocation.quantity), 0.0).label("total_quantity"),
    ).group_by(FoodAllocation.status).all()

    category_breakdown = db.query(
        FoodAllocation.category,
        func.coalesce(func.sum(FoodAllocation.quantity), 0.0).label("total_quantity"),
        func.count(func.distinct(FoodAllocation.school_id)).label("schools_count"),
    ).filter(
        FoodAllocation.status.in_([AllocationStatus.APPROVED, AllocationStatus.DELIVERED])
    ).group_by(FoodAllocation.category).all()

    # Report every status, including those with no rows, so the UI does not
    # have to distinguish "zero" from "missing".
    counts_by_status = {row[0]: row for row in status_counts}

    return {
        "status_summary": [{
            "status": member.value,
            "count": int(counts_by_status[member][1]) if member in counts_by_status else 0,
            "total_quantity": round(float(counts_by_status[member][2]), 2) if member in counts_by_status else 0.0,
        } for member in AllocationStatus],
        "category_breakdown": [{
            "category": row[0],
            "total_quantity": round(float(row[1] or 0), 2),
            "schools_covered": int(row[2]),
        } for row in category_breakdown],
        "total_allocations": int(sum(row[1] for row in status_counts)) if status_counts else 0,
    }


@router.get("/{id}", response_model=FoodAllocationSchema)
def get_allocation(
    id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    allocation = db.query(FoodAllocation).filter(FoodAllocation.id == id).first()
    if not allocation:
        raise HTTPException(status_code=404, detail="Allocation not found")

    if current_user.role == UserRole.SCHOOL and allocation.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    return allocation


@router.put("/{id}", response_model=FoodAllocationSchema)
def update_allocation(
    id: int,
    allocation_in: FoodAllocationUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_gov_admin),
):
    """Update a pending allocation's quantity, notes or status."""
    allocation = db.query(FoodAllocation).filter(FoodAllocation.id == id).with_for_update().first()
    if not allocation:
        raise HTTPException(status_code=404, detail="Allocation not found")

    update_data = allocation_in.model_dump(exclude_unset=True)
    if not update_data:
        raise bad_request("No fields to update")

    # Quantities feed the school's stock on approval, so they are frozen once
    # the allocation has been approved or delivered.
    if "quantity" in update_data and update_data["quantity"] is not None:
        if allocation.status != AllocationStatus.PENDING:
            raise bad_request(f"Cannot change the quantity of a {allocation.status.value.lower()} allocation")
        allocation.quantity = validate_positive(
            update_data["quantity"], "Quantity", max_value=MAX_ALLOCATION_QUANTITY
        )

    if "notes" in update_data:
        allocation.notes = clean_str(update_data["notes"])

    if "status" in update_data and update_data["status"] is not None:
        new_status = update_data["status"]
        if new_status == AllocationStatus.APPROVED:
            raise bad_request("Use POST /allocations/{id}/approve so the stock is added to the school")
        if allocation.status == AllocationStatus.DELIVERED and new_status != AllocationStatus.DELIVERED:
            raise bad_request("A delivered allocation cannot change status")
        if new_status == AllocationStatus.DELIVERED and allocation.status != AllocationStatus.APPROVED:
            raise bad_request("Only an approved allocation can be marked delivered")
        allocation.status = new_status

    db.commit()
    db.refresh(allocation)
    return allocation


@router.post("/{id}/approve", response_model=FoodAllocationSchema)
def approve_allocation(
    id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_gov_admin),
):
    """Approve an allocation and add the quantity to the school's inventory."""
    allocation = db.query(FoodAllocation).filter(
        FoodAllocation.id == id
    ).with_for_update().first()

    if not allocation:
        raise HTTPException(status_code=404, detail="Allocation not found")

    if allocation.status != AllocationStatus.PENDING:
        raise bad_request(f"Cannot approve an allocation that is already {allocation.status.value.lower()}")

    # Match the existing stock row case-insensitively so "Rice" tops up "rice"
    # instead of creating a second row the meal planner would then double-count.
    inventory_item = db.query(Inventory).filter(
        Inventory.school_id == allocation.school_id,
        func.lower(Inventory.item_name) == allocation.item_name.lower(),
    ).with_for_update().first()

    if inventory_item:
        if (inventory_item.unit or "").lower() != allocation.unit.lower():
            raise bad_request(
                f"Unit mismatch: {inventory_item.item_name} is stocked in "
                f"{inventory_item.unit} but this allocation is in {allocation.unit}."
            )
        inventory_item.quantity = round((inventory_item.quantity or 0) + allocation.quantity, 3)
    else:
        inventory_item = Inventory(
            school_id=allocation.school_id,
            item_name=allocation.item_name,
            category=allocation.category,
            quantity=allocation.quantity,
            unit=allocation.unit,
            # 20% of the first delivery is a sensible reorder point, with a
            # floor so tiny allocations do not produce a zero threshold.
            threshold=max(round(allocation.quantity * 0.2, 3), 1.0),
        )
        db.add(inventory_item)

    allocation.status = AllocationStatus.APPROVED

    db.commit()
    db.refresh(allocation)
    return allocation


@router.post("/{id}/reject", response_model=FoodAllocationSchema)
def reject_allocation(
    id: int,
    payload: RejectRequest,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_gov_admin),
):
    """Reject a pending allocation."""
    allocation = db.query(FoodAllocation).filter(FoodAllocation.id == id).with_for_update().first()
    if not allocation:
        raise HTTPException(status_code=404, detail="Allocation not found")

    if allocation.status != AllocationStatus.PENDING:
        raise bad_request(f"Cannot reject an allocation that is already {allocation.status.value.lower()}")

    allocation.status = AllocationStatus.REJECTED
    reason = clean_str(payload.reason)
    if reason:
        allocation.notes = f"{allocation.notes + ' | ' if allocation.notes else ''}Rejected: {reason}"

    db.commit()
    db.refresh(allocation)
    return allocation


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_allocation(
    id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_gov_admin),
):
    """
    Delete an allocation.

    Approved and delivered allocations have already moved stock, so deleting
    them would leave the school's inventory overstated; they are kept.
    """
    allocation = db.query(FoodAllocation).filter(FoodAllocation.id == id).first()
    if not allocation:
        raise HTTPException(status_code=404, detail="Allocation not found")

    if allocation.status in (AllocationStatus.APPROVED, AllocationStatus.DELIVERED):
        raise bad_request(
            f"This allocation is {allocation.status.value.lower()} and has already updated the school's stock, "
            "so it cannot be deleted."
        )

    db.delete(allocation)
    db.commit()
    return None
