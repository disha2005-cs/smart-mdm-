from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.api import deps
from app.schemas.inventory import Inventory, InventoryCreate, InventoryUpdate
from app.models.inventory import Inventory as InventoryModel
from app.models.user import UserRole

router = APIRouter()

@router.post("/", response_model=Inventory, status_code=status.HTTP_201_CREATED)
def create_inventory_item(
    *,
    db: Session = Depends(get_db),
    item_in: InventoryCreate,
    current_user = Depends(deps.get_current_school_admin)
):
    """
    Create a new inventory item.
    """
    item = db.query(InventoryModel).filter(
        InventoryModel.school_id == current_user.school_id,
        InventoryModel.item_name == item_in.item_name
    ).first()
    if item:
        raise HTTPException(status_code=400, detail="Item already exists in inventory")

    new_item = InventoryModel(
        school_id=current_user.school_id,
        **item_in.model_dump()
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.get("/", response_model=List[Inventory])
def read_inventory(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Retrieve inventory. Government Admin can see all, School Admin sees their own.
    """
    query = db.query(InventoryModel)
    
    if current_user.role == UserRole.SCHOOL:
        query = query.filter(InventoryModel.school_id == current_user.school_id)
        
    items = query.offset(skip).limit(limit).all()
    return items

@router.put("/{id}", response_model=Inventory)
def update_inventory_item(
    id: int,
    item_in: InventoryUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_school_admin)
):
    """
    Update an inventory item quantity or threshold.
    """
    item = db.query(InventoryModel).filter(InventoryModel.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    if item.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    if item_in.quantity is not None:
        item.quantity = item_in.quantity
    if item_in.threshold is not None:
        item.threshold = item_in.threshold
        
    db.commit()
    db.refresh(item)
    
    return item
