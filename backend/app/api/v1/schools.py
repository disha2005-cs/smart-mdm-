from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api import deps
from app.core.validators import (
    bad_request,
    clean_str,
    validate_coordinates,
    validate_email,
    validate_name,
    validate_phone,
    validate_pin_code,
    validate_udise,
)
from app.database import get_db
from app.models.school import School as SchoolModel
from app.models.user import UserRole
from app.schemas.school import School, SchoolCreate, SchoolUpdate

router = APIRouter()

SCHOOL_STATUSES = {"Active", "Inactive"}


def _serialise(school: SchoolModel) -> dict:
    return {
        "id": school.id,
        "udise_code": school.udise_code,
        "school_name": school.school_name,
        "district": school.district,
        "taluk": school.taluk,
        "village": school.village,
        "address": school.address,
        "pin_code": school.pin_code,
        "principal_name": school.principal_name,
        "principal_phone": school.principal_phone,
        "email": school.email,
        "phone": school.phone,
        "latitude": school.latitude,
        "longitude": school.longitude,
        "status": school.status,
        "is_active": school.is_active,
        "created_at": school.created_at,
        "updated_at": school.updated_at,
        "has_admin": school.admin is not None,
        "admin_name": school.admin.full_name if school.admin else None,
        "admin_employee_id": school.admin.employee_id if school.admin else None,
    }


def _validated_school_fields(data: dict, *, partial: bool) -> dict:
    """Validate the subset of school fields present in ``data``."""
    cleaned = {}

    if "udise_code" in data and data["udise_code"] is not None:
        cleaned["udise_code"] = validate_udise(data["udise_code"])

    for field, label in (("school_name", "School name"), ("district", "District"),
                         ("taluk", "Taluk"), ("village", "Village")):
        if field in data and data[field] is not None:
            value = clean_str(data[field])
            if not value:
                raise bad_request(f"{label} is required")
            if len(value) > 120:
                raise bad_request(f"{label} must be at most 120 characters")
            cleaned[field] = value
        elif not partial and field not in cleaned:
            raise bad_request(f"{label} is required")

    if "principal_name" in data:
        value = clean_str(data["principal_name"])
        cleaned["principal_name"] = validate_name(value, "Principal name") if value else None

    if "principal_phone" in data:
        cleaned["principal_phone"] = validate_phone(data["principal_phone"], "Principal phone")

    if "phone" in data:
        cleaned["phone"] = validate_phone(data["phone"], "School phone")

    if "email" in data:
        cleaned["email"] = validate_email(data["email"])

    if "pin_code" in data:
        cleaned["pin_code"] = validate_pin_code(data["pin_code"])

    if "address" in data:
        address = clean_str(data["address"])
        if address and len(address) > 300:
            raise bad_request("Address must be at most 300 characters")
        cleaned["address"] = address

    latitude = data.get("latitude")
    longitude = data.get("longitude")
    if "latitude" in data or "longitude" in data:
        validate_coordinates(latitude, longitude)
        if "latitude" in data:
            cleaned["latitude"] = latitude
        if "longitude" in data:
            cleaned["longitude"] = longitude

    if "status" in data and data["status"] is not None:
        value = clean_str(data["status"])
        match = next((s for s in SCHOOL_STATUSES if s.lower() == (value or "").lower()), None)
        if match is None:
            raise bad_request("Status must be Active or Inactive")
        cleaned["status"] = match
        # Keep the boolean flag and the label from drifting apart - the
        # dashboards filter on is_active while the UI shows status.
        cleaned["is_active"] = match == "Active"

    return cleaned


@router.get("/", response_model=List[School])
def read_schools(
    skip: int = 0,
    limit: int = 100,
    district: Optional[str] = None,
    search: Optional[str] = None,
    include_inactive: bool = True,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    """List schools. School admins only ever see their own."""
    if skip < 0 or limit < 1 or limit > 500:
        raise bad_request("skip must be >= 0 and limit between 1 and 500")

    query = db.query(SchoolModel)

    if current_user.role == UserRole.SCHOOL:
        query = query.filter(SchoolModel.id == current_user.school_id)

    if not include_inactive:
        query = query.filter(SchoolModel.is_active.is_(True))

    if clean_str(district):
        query = query.filter(func.lower(SchoolModel.district) == district.strip().lower())

    if clean_str(search):
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            func.lower(SchoolModel.school_name).like(term)
            | func.lower(SchoolModel.udise_code).like(term)
            | func.lower(SchoolModel.village).like(term)
        )

    schools = query.order_by(SchoolModel.school_name.asc()).offset(skip).limit(limit).all()
    return [_serialise(school) for school in schools]


@router.get("/districts")
def list_districts(
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_gov_admin),
):
    """Distinct districts with their school counts, for filters and charts."""
    rows = db.query(
        SchoolModel.district, func.count(SchoolModel.id)
    ).filter(SchoolModel.is_active.is_(True)).group_by(SchoolModel.district).order_by(SchoolModel.district).all()

    return [{"district": row[0], "schools": row[1]} for row in rows]


@router.post("/", response_model=School, status_code=status.HTTP_201_CREATED)
def create_school(
    *,
    school_in: SchoolCreate,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_gov_admin),
):
    """Register a new school (Government Admin only)."""
    fields = _validated_school_fields(school_in.model_dump(), partial=False)

    existing = db.query(SchoolModel).filter(
        SchoolModel.udise_code == fields["udise_code"]
    ).first()
    if existing:
        raise bad_request(
            f"UDISE code {fields['udise_code']} is already registered to {existing.school_name}"
        )

    fields.setdefault("status", "Active")
    fields.setdefault("is_active", True)

    school = SchoolModel(**fields)
    db.add(school)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise bad_request("A school with this UDISE code already exists")

    db.refresh(school)
    return _serialise(school)


@router.get("/{id}", response_model=School)
def read_school(
    id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    """Get a school by ID."""
    school = db.query(SchoolModel).filter(SchoolModel.id == id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    if current_user.role == UserRole.SCHOOL and current_user.school_id != id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    return _serialise(school)


@router.put("/{id}", response_model=School)
def update_school(
    *,
    id: int,
    school_in: SchoolUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_gov_admin),
):
    """Update a school (Government Admin only)."""
    school = db.query(SchoolModel).filter(SchoolModel.id == id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    submitted = school_in.model_dump(exclude_unset=True)
    if not submitted:
        raise bad_request("No fields to update")

    submitted_udise = clean_str(submitted.get("udise_code"))
    if submitted_udise and submitted_udise == school.udise_code:
        submitted.pop("udise_code", None)

    fields = _validated_school_fields(submitted, partial=True)

    # Only re-validate the UDISE code when it is actually being changed, so
    # schools registered before the 11-digit rule can still be edited.
    if fields.get("udise_code") == school.udise_code:
        fields.pop("udise_code", None)

    new_udise = fields.get("udise_code")
    if new_udise and new_udise != school.udise_code:
        clash = db.query(SchoolModel).filter(
            SchoolModel.udise_code == new_udise, SchoolModel.id != id
        ).first()
        if clash:
            raise bad_request(f"UDISE code {new_udise} is already registered to {clash.school_name}")

    for field, value in fields.items():
        setattr(school, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise bad_request("A school with this UDISE code already exists")

    db.refresh(school)
    return _serialise(school)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_school(
    id: int,
    confirm: bool = False,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_gov_admin),
):
    """
    Delete a school and everything attached to it.

    Requires ``?confirm=true`` whenever the school holds any data, so an
    accidental click cannot wipe a year of attendance.
    """
    from app.models.attendance import Attendance
    from app.models.budget import Budget
    from app.models.daily_meal import DailyMeal
    from app.models.food_allocation import FoodAllocation
    from app.models.inventory import Inventory
    from app.models.student import Student
    from app.models.user import User

    school = db.query(SchoolModel).filter(SchoolModel.id == id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    counts = {
        "students": db.query(func.count(Student.id)).filter(Student.school_id == id).scalar() or 0,
        "attendance_records": db.query(func.count(Attendance.id)).filter(Attendance.school_id == id).scalar() or 0,
        "inventory_items": db.query(func.count(Inventory.id)).filter(Inventory.school_id == id).scalar() or 0,
        "budgets": db.query(func.count(Budget.id)).filter(Budget.school_id == id).scalar() or 0,
        "meal_records": db.query(func.count(DailyMeal.id)).filter(DailyMeal.school_id == id).scalar() or 0,
        "allocations": db.query(func.count(FoodAllocation.id)).filter(FoodAllocation.school_id == id).scalar() or 0,
        "admins": db.query(func.count(User.id)).filter(User.school_id == id).scalar() or 0,
    }

    # Previously only students and attendance were checked, so a school with
    # budgets or stock could be deleted without any warning.
    if not confirm and any(counts.values()):
        detail = ", ".join(f"{value} {key.replace('_', ' ')}" for key, value in counts.items() if value)
        raise bad_request(
            f"{school.school_name} still has {detail}. Add ?confirm=true to delete the school and all of its data."
        )

    db.delete(school)
    db.commit()
    return None
