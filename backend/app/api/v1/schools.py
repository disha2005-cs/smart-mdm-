from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.database import get_db
from app.models.school import School as SchoolModel
from app.schemas.school import School, SchoolCreate, SchoolUpdate

router = APIRouter()


@router.get("/", response_model=List[School])
def read_schools(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    from app.models.user import UserRole
    
    query = db.query(SchoolModel)

    if current_user.role == UserRole.SCHOOL:
        query = query.filter(SchoolModel.id == current_user.school_id)

    schools = query.order_by(SchoolModel.school_name.asc()).offset(skip).limit(limit).all()
    
    # Enrich with admin info
    result = []
    for school in schools:
        school_dict = {
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
            "created_at": school.created_at,
            "updated_at": school.updated_at,
            "has_admin": school.admin is not None,
            "admin_name": school.admin.full_name if school.admin else None,
            "admin_employee_id": school.admin.employee_id if school.admin else None
        }
        result.append(school_dict)
    
    return result


@router.post("/", response_model=School, status_code=status.HTTP_201_CREATED)
def create_school(
    *,
    school_in: SchoolCreate,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_gov_admin),
):
    existing_school = db.query(SchoolModel).filter(SchoolModel.udise_code == school_in.udise_code).first()
    if existing_school:
        raise HTTPException(status_code=400, detail="A school with this UDISE code already exists")

    school = SchoolModel(**school_in.model_dump())
    db.add(school)
    db.commit()
    db.refresh(school)
    return school


@router.get("/{id}", response_model=School)
def read_school(
    id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    """
    Get school by ID.
    """
    from app.models.user import UserRole
    
    school = db.query(SchoolModel).filter(SchoolModel.id == id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    # School admins can only access their own school
    if current_user.role == UserRole.SCHOOL and current_user.school_id != id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return school


@router.put("/{id}", response_model=School)
def update_school(
    *,
    id: int,
    school_in: SchoolUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_gov_admin),
):
    """
    Update school.
    """
    school = db.query(SchoolModel).filter(SchoolModel.id == id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    # Check if UDISE code is being changed to one that already exists
    if school_in.udise_code and school_in.udise_code != school.udise_code:
        existing_school = db.query(SchoolModel).filter(
            SchoolModel.udise_code == school_in.udise_code
        ).first()
        if existing_school:
            raise HTTPException(status_code=400, detail="A school with this UDISE code already exists")
    
    # Update school fields
    update_data = school_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(school, field, value)
    
    db.commit()
    db.refresh(school)
    return school


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_school(
    id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_gov_admin),
):
    """
    Delete school and its associated admin.
    """
    from app.models.user import User
    
    school = db.query(SchoolModel).filter(SchoolModel.id == id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    # Delete associated admin first (if exists)
    admin = db.query(User).filter(User.school_id == id).first()
    if admin:
        db.delete(admin)
    
    # Delete the school
    db.delete(school)
    db.commit()
    return None
