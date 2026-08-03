from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.database import get_db
from app.models.school import School as SchoolModel
from app.schemas.school import School, SchoolCreate

router = APIRouter()


@router.get("/", response_model=List[School])
def read_schools(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    query = db.query(SchoolModel)

    if current_user.role == "SCHOOL":
        query = query.filter(SchoolModel.id == current_user.school_id)

    return query.order_by(SchoolModel.school_name.asc()).offset(skip).limit(limit).all()


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
