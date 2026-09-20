from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api import deps
from app.core.validators import (
    INVENTORY_CATEGORIES,
    INVENTORY_UNITS,
    bad_request,
    clean_str,
    validate_choice,
    validate_positive,
)
from app.database import get_db
from app.models.inventory import Inventory as InventoryModel
from app.models.user import UserRole
from app.schemas.inventory import Inventory, InventoryCreate, InventoryUpdate

router = APIRouter()

MAX_QUANTITY = 1_000_000.0
MAX_COST_PER_UNIT = 100_000.0


def _normalise_item_name(name: Optional[str]) -> str:
    name = clean_str(name)
    if not name:
        raise bad_request("Item name is required")
    if len(name) > 80:
        raise bad_request("Item name must be at most 80 characters")
    return name


@router.post("/", response_model=Inventory, status_code=status.HTTP_201_CREATED)
def create_inventory_item(
    *,
    db: Session = Depends(get_db),
    item_in: InventoryCreate,
    current_user=Depends(deps.get_current_school_admin),
):
    """Create a new inventory item for the caller's school."""
    item_name = _normalise_item_name(item_in.item_name)
    category = validate_choice(item_in.category, INVENTORY_CATEGORIES, "Category")
    unit = validate_choice(item_in.unit, INVENTORY_UNITS, "Unit")
    quantity = validate_positive(item_in.quantity, "Quantity", allow_zero=True, max_value=MAX_QUANTITY)
    threshold = validate_positive(item_in.threshold, "Threshold", max_value=MAX_QUANTITY)
    cost_per_unit = (
        None if item_in.cost_per_unit is None
        else validate_positive(item_in.cost_per_unit, "Cost per unit", allow_zero=True, max_value=MAX_COST_PER_UNIT)
    )

    if threshold > quantity * 10 and quantity > 0:
        raise bad_request("Threshold is unrealistically high compared to the quantity in stock")

    # Case-insensitive duplicate check: "Rice" and "rice" are the same item.
    existing = db.query(InventoryModel).filter(
        InventoryModel.school_id == current_user.school_id,
        func.lower(InventoryModel.item_name) == item_name.lower(),
    ).first()

    if existing:
        raise bad_request(
            f"'{existing.item_name}' already exists in inventory. Edit that item to add more stock."
        )

    new_item = InventoryModel(
        school_id=current_user.school_id,
        item_name=item_name,
        category=category,
        quantity=quantity,
        unit=unit,
        threshold=threshold,
        supplier=clean_str(item_in.supplier),
        cost_per_unit=cost_per_unit,
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item


@router.get("/", response_model=List[Inventory])
def read_inventory(
    skip: int = 0,
    limit: int = 100,
    school_id: Optional[int] = None,
    low_stock_only: bool = False,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    """Government admins see every school's stock; school admins see their own."""
    if skip < 0 or limit < 1 or limit > 500:
        raise bad_request("skip must be >= 0 and limit between 1 and 500")

    query = db.query(InventoryModel)

    if current_user.role == UserRole.SCHOOL:
        query = query.filter(InventoryModel.school_id == current_user.school_id)
    elif school_id is not None:
        query = query.filter(InventoryModel.school_id == school_id)

    if low_stock_only:
        query = query.filter(InventoryModel.quantity <= InventoryModel.threshold)

    return query.order_by(InventoryModel.item_name.asc()).offset(skip).limit(limit).all()


@router.get("/summary")
def inventory_summary(
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    """Aggregate stock value and health, used by the dashboards."""
    query = db.query(InventoryModel)
    if current_user.role == UserRole.SCHOOL:
        query = query.filter(InventoryModel.school_id == current_user.school_id)

    items = query.all()

    total_value = sum((item.quantity or 0) * (item.cost_per_unit or 0) for item in items)
    low_stock = [item for item in items if (item.quantity or 0) <= (item.threshold or 0)]
    out_of_stock = [item for item in items if (item.quantity or 0) <= 0]

    by_category = {}
    for item in items:
        bucket = by_category.setdefault(item.category or "Other", {"items": 0, "quantity": 0.0, "value": 0.0})
        bucket["items"] += 1
        bucket["quantity"] += item.quantity or 0
        bucket["value"] += (item.quantity or 0) * (item.cost_per_unit or 0)

    return {
        "total_items": len(items),
        "total_stock_value": round(total_value, 2),
        "low_stock_count": len(low_stock),
        "out_of_stock_count": len(out_of_stock),
        "low_stock_items": [
            {
                "id": item.id,
                "item_name": item.item_name,
                "quantity": item.quantity,
                "threshold": item.threshold,
                "unit": item.unit,
            }
            for item in low_stock
        ],
        "by_category": [
            {
                "category": name,
                "items": data["items"],
                "quantity": round(data["quantity"], 2),
                "value": round(data["value"], 2),
            }
            for name, data in sorted(by_category.items())
        ],
    }


@router.get("/{id}", response_model=Inventory)
def read_inventory_item(
    id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    item = db.query(InventoryModel).filter(InventoryModel.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if current_user.role == UserRole.SCHOOL and item.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return item


@router.put("/{id}", response_model=Inventory)
def update_inventory_item(
    id: int,
    item_in: InventoryUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_school_admin),
):
    """Update an inventory item."""
    item = db.query(InventoryModel).filter(InventoryModel.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if item.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    update_data = item_in.model_dump(exclude_unset=True)
    # school_id is never client-controlled: an item stays with its school.
    update_data.pop("school_id", None)

    if not update_data:
        raise bad_request("No fields to update")

    if "item_name" in update_data:
        new_name = _normalise_item_name(update_data["item_name"])
        clash = db.query(InventoryModel).filter(
            InventoryModel.school_id == item.school_id,
            func.lower(InventoryModel.item_name) == new_name.lower(),
            InventoryModel.id != item.id,
        ).first()
        if clash:
            raise bad_request(f"Another item named '{clash.item_name}' already exists")
        item.item_name = new_name

    if "category" in update_data:
        item.category = validate_choice(update_data["category"], INVENTORY_CATEGORIES, "Category")

    if "unit" in update_data:
        item.unit = validate_choice(update_data["unit"], INVENTORY_UNITS, "Unit")

    if "quantity" in update_data:
        item.quantity = validate_positive(
            update_data["quantity"], "Quantity", allow_zero=True, max_value=MAX_QUANTITY
        )

    if "threshold" in update_data:
        item.threshold = validate_positive(update_data["threshold"], "Threshold", max_value=MAX_QUANTITY)

    if "supplier" in update_data:
        item.supplier = clean_str(update_data["supplier"])

    if "cost_per_unit" in update_data:
        value = update_data["cost_per_unit"]
        item.cost_per_unit = (
            None if value is None
            else validate_positive(value, "Cost per unit", allow_zero=True, max_value=MAX_COST_PER_UNIT)
        )

    db.commit()
    db.refresh(item)
    return item


@router.post("/{id}/adjust", response_model=Inventory)
def adjust_inventory_quantity(
    id: int,
    delta: float,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_school_admin),
):
    """
    Add to or remove from stock atomically.

    Editing the absolute quantity from two devices loses one of the changes;
    applying a delta under a row lock does not.
    """
    if delta == 0:
        raise bad_request("Adjustment must be non-zero")

    item = db.query(InventoryModel).filter(
        InventoryModel.id == id,
        InventoryModel.school_id == current_user.school_id,
    ).with_for_update().first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    new_quantity = (item.quantity or 0) + delta
    if new_quantity < 0:
        raise bad_request(
            f"Cannot remove {abs(delta)} {item.unit} of {item.item_name}: only {item.quantity} in stock"
        )
    if new_quantity > MAX_QUANTITY:
        raise bad_request(f"Resulting quantity exceeds the maximum of {MAX_QUANTITY:,.0f}")

    item.quantity = round(new_quantity, 3)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inventory_item(
    id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_school_admin),
):
    """Delete an inventory item."""
    item = db.query(InventoryModel).filter(InventoryModel.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if item.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    db.delete(item)
    db.commit()
    return None
