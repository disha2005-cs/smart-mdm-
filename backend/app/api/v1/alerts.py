from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.api import deps
from app.schemas.alert import Alert, AlertCreate, AlertUpdate
from app.models.alert import Alert as AlertModel

router = APIRouter()

@router.get("/", response_model=List[Alert])
def read_alerts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Retrieve alerts. Government Admin can see all, School Admin sees their own.
    """
    query = db.query(AlertModel)
    
    if current_user.role == "SCHOOL":
        query = query.filter(AlertModel.school_id == current_user.school_id)
        
    items = query.order_by(AlertModel.created_at.desc()).offset(skip).limit(limit).all()
    return items

@router.put("/{id}", response_model=Alert)
def update_alert_status(
    id: int,
    alert_in: AlertUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Update an alert status (e.g. mark as READ).
    """
    alert = db.query(AlertModel).filter(AlertModel.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    if current_user.role == "SCHOOL" and alert.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    alert.status = alert_in.status
    db.commit()
    db.refresh(alert)
    
    return alert
