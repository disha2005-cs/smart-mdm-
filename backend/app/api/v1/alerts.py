from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.core.validators import bad_request, clean_str, validate_choice
from app.database import get_db
from app.models.alert import Alert as AlertModel
from app.models.inventory import Inventory
from app.models.school import School
from app.models.user import UserRole
from app.schemas.alert import Alert, AlertCreate, AlertUpdate

router = APIRouter()

SEVERITIES = {"HIGH", "MEDIUM", "LOW"}
STATUSES = {"UNREAD", "READ"}


@router.get("/", response_model=List[Alert])
def read_alerts(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    """Government admins see every alert; school admins see their own."""
    if skip < 0 or limit < 1 or limit > 500:
        raise bad_request("skip must be >= 0 and limit between 1 and 500")

    query = db.query(AlertModel)

    if current_user.role == UserRole.SCHOOL:
        query = query.filter(AlertModel.school_id == current_user.school_id)

    if clean_str(status_filter):
        query = query.filter(AlertModel.status == validate_choice(status_filter, STATUSES, "Status"))

    return query.order_by(AlertModel.created_at.desc()).offset(skip).limit(limit).all()


@router.post("/", response_model=Alert, status_code=status.HTTP_201_CREATED)
def create_alert(
    alert_in: AlertCreate,
    school_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    """
    Raise an alert.

    Government admins may target any school; school admins can only raise
    alerts against their own school.
    """
    if current_user.role == UserRole.SCHOOL:
        target_school_id = current_user.school_id
    else:
        if school_id is None:
            raise bad_request("school_id is required when raising an alert as a government admin")
        if not db.query(School).filter(School.id == school_id).first():
            raise HTTPException(status_code=404, detail="School not found")
        target_school_id = school_id

    message = clean_str(alert_in.message)
    if not message:
        raise bad_request("Message is required")

    alert = AlertModel(
        school_id=target_school_id,
        alert_type=clean_str(alert_in.alert_type) or "GENERAL",
        message=message,
        severity=validate_choice(alert_in.severity, SEVERITIES, "Severity", required=False) or "LOW",
        status="UNREAD",
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


@router.post("/scan-low-stock")
def scan_low_stock(
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    """
    Raise a LOW_STOCK alert for every item at or below its threshold.

    Re-running this is safe: an item that already has an unread low-stock
    alert is skipped rather than alerted again.
    """
    query = db.query(Inventory).filter(Inventory.quantity <= Inventory.threshold)
    if current_user.role == UserRole.SCHOOL:
        query = query.filter(Inventory.school_id == current_user.school_id)

    low_items = query.all()

    existing_messages = {
        (alert.school_id, alert.message)
        for alert in db.query(AlertModel).filter(
            AlertModel.alert_type == "LOW_STOCK",
            AlertModel.status == "UNREAD",
        ).all()
    }

    created = 0
    for item in low_items:
        out_of_stock = (item.quantity or 0) <= 0
        message = (
            f"{item.item_name} is out of stock"
            if out_of_stock
            else f"{item.item_name} is low: {item.quantity} {item.unit} left (threshold {item.threshold})"
        )
        if (item.school_id, message) in existing_messages:
            continue
        db.add(AlertModel(
            school_id=item.school_id,
            alert_type="LOW_STOCK",
            severity="HIGH" if out_of_stock else "MEDIUM",
            message=message,
            status="UNREAD",
        ))
        created += 1

    db.commit()

    return {
        "message": f"{created} new low-stock alert(s) raised",
        "items_below_threshold": len(low_items),
        "alerts_created": created,
    }


@router.put("/{id}", response_model=Alert)
def update_alert_status(
    id: int,
    alert_in: AlertUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    """Update an alert's status (e.g. mark it READ)."""
    alert = db.query(AlertModel).filter(AlertModel.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if current_user.role == UserRole.SCHOOL and alert.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    alert.status = validate_choice(alert_in.status, STATUSES, "Status")
    db.commit()
    db.refresh(alert)
    return alert


@router.put("/read-all/bulk")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    """Mark every alert visible to the caller as read."""
    query = db.query(AlertModel).filter(AlertModel.status == "UNREAD")
    if current_user.role == UserRole.SCHOOL:
        query = query.filter(AlertModel.school_id == current_user.school_id)

    updated = query.update({AlertModel.status: "READ"}, synchronize_session=False)
    db.commit()

    return {"message": f"{updated} alert(s) marked as read", "updated": updated}


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alert(
    id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    """Delete an alert."""
    alert = db.query(AlertModel).filter(AlertModel.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if current_user.role == UserRole.SCHOOL and alert.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    db.delete(alert)
    db.commit()
    return None
