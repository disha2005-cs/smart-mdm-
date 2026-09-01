from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.api import deps
from app.database import get_db
from app.models.food_allocation import FoodAllocation, AllocationStatus
from app.models.inventory import Inventory
from app.models.school import School
from app.models.user import UserRole
from app.schemas.food_allocation import (
    FoodAllocation as FoodAllocationSchema,
    FoodAllocationCreate,
    FoodAllocationUpdate
)

router = APIRouter()

@router.post("/", response_model=FoodAllocationSchema, status_code=status.HTTP_201_CREATED)
def create_allocation(
    *,
    db: Session = Depends(get_db),
    allocation_in: FoodAllocationCreate,
    current_user = Depends(deps.get_current_gov_admin)
):
    """
    Government admin allocates food to schools.
    """
    # Verify school exists
    school = db.query(School).filter(School.id == allocation_in.school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    # Check for duplicate allocation (same school, item, status=PENDING)
    existing = db.query(FoodAllocation).filter(
        FoodAllocation.school_id == allocation_in.school_id,
        FoodAllocation.item_name == allocation_in.item_name,
        FoodAllocation.status == AllocationStatus.PENDING
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Pending allocation already exists for {allocation_in.item_name} to this school. "
                   f"Approve or reject it first before creating a new one."
        )
    
    allocation = FoodAllocation(**allocation_in.model_dump())
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
    current_user = Depends(deps.get_current_user)
):
    """
    Get food allocations. Government sees all, schools see their own.
    """
    query = db.query(FoodAllocation)
    
    # School admins can only see their own allocations
    if current_user.role == UserRole.SCHOOL:
        query = query.filter(FoodAllocation.school_id == current_user.school_id)
    elif school_id:
        # Government can filter by school
        query = query.filter(FoodAllocation.school_id == school_id)
    
    if status_filter:
        query = query.filter(FoodAllocation.status == status_filter)
    
    allocations = query.order_by(FoodAllocation.created_at.desc()).offset(skip).limit(limit).all()
    return allocations


@router.put("/{id}", response_model=FoodAllocationSchema)
def update_allocation(
    id: int,
    allocation_in: FoodAllocationUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_gov_admin)
):
    """
    Update allocation status or quantity.
    """
    allocation = db.query(FoodAllocation).filter(FoodAllocation.id == id).first()
    if not allocation:
        raise HTTPException(status_code=404, detail="Allocation not found")
    
    update_data = allocation_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(allocation, field, value)
    
    db.commit()
    db.refresh(allocation)
    return allocation


@router.post("/{id}/approve", response_model=FoodAllocationSchema)
def approve_allocation(
    id: int,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_gov_admin)
):
    """
    Approve food allocation and add to school's inventory.
    """
    allocation = db.query(FoodAllocation).filter(FoodAllocation.id == id).first()
    if not allocation:
        raise HTTPException(status_code=404, detail="Allocation not found")
    
    if allocation.status != AllocationStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Cannot approve allocation in {allocation.status} status")
    
    # Add to school's inventory
    inventory_item = db.query(Inventory).filter(
        Inventory.school_id == allocation.school_id,
        Inventory.item_name == allocation.item_name
    ).first()
    
    if inventory_item:
        # Update existing inventory
        inventory_item.quantity += allocation.quantity
    else:
        # Create new inventory item
        inventory_item = Inventory(
            school_id=allocation.school_id,
            item_name=allocation.item_name,
            category=allocation.category,
            quantity=allocation.quantity,
            unit=allocation.unit,
            threshold=allocation.quantity * 0.2  # 20% of allocated as threshold
        )
        db.add(inventory_item)
    
    # Update allocation status
    allocation.status = AllocationStatus.APPROVED
    
    db.commit()
    db.refresh(allocation)
    
    return allocation


@router.get("/summary")
def get_allocation_summary(
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_gov_admin)
):
    """
    Get summary of food allocations for government dashboard.
    """
    # Total allocations by status
    status_counts = db.query(
        FoodAllocation.status,
        func.count(FoodAllocation.id).label("count"),
        func.sum(FoodAllocation.quantity).label("total_quantity")
    ).group_by(FoodAllocation.status).all()
    
    # Category-wise breakdown
    category_breakdown = db.query(
        FoodAllocation.category,
        func.sum(FoodAllocation.quantity).label("total_quantity"),
        func.count(func.distinct(FoodAllocation.school_id)).label("schools_count")
    ).filter(FoodAllocation.status.in_([AllocationStatus.APPROVED, AllocationStatus.DELIVERED]))\
     .group_by(FoodAllocation.category).all()
    
    return {
        "status_summary": [
            {
                "status": s[0],
                "count": s[1],
                "total_quantity": float(s[2]) if s[2] else 0
            }
            for s in status_counts
        ],
        "category_breakdown": [
            {
                "category": c[0],
                "total_quantity": float(c[1]) if c[1] else 0,
                "schools_covered": c[2]
            }
            for c in category_breakdown
        ]
    }
