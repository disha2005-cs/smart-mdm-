from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database import get_db
from app.api import deps
from app.schemas.student import Student, StudentCreate, StudentUpdate
from app.models.student import Student as StudentModel

router = APIRouter()

@router.post("/", response_model=Student, status_code=status.HTTP_201_CREATED)
def create_student(
    *,
    db: Session = Depends(get_db),
    student_in: StudentCreate,
    current_user = Depends(deps.get_current_school_admin)
):
    """
    Create new student.
    """
    # Generate unique student ID (e.g., STU-XXXX)
    student_id = f"STU-{uuid.uuid4().hex[:8].upper()}"
    
    student = StudentModel(
        student_id=student_id,
        school_id=current_user.school_id,
        **student_in.model_dump()
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student

@router.get("/", response_model=List[Student])
def read_students(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Retrieve students. School Admins can only see their school's students.
    """
    query = db.query(StudentModel)
    
    if current_user.role == "SCHOOL":
        query = query.filter(StudentModel.school_id == current_user.school_id)
        
    students = query.offset(skip).limit(limit).all()
    return students

@router.get("/{id}", response_model=Student)
def read_student(
    id: int,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Get student by ID.
    """
    student = db.query(StudentModel).filter(StudentModel.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    if current_user.role == "SCHOOL" and student.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    return student


@router.put("/{id}", response_model=Student)
def update_student(
    *,
    id: int,
    student_in: StudentUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_school_admin)
):
    """
    Update student.
    """
    student = db.query(StudentModel).filter(StudentModel.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Verify student belongs to admin's school
    if student.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Update student fields
    update_data = student_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(student, field, value)
    
    db.commit()
    db.refresh(student)
    return student


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    id: int,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_school_admin)
):
    """
    Delete student.
    """
    student = db.query(StudentModel).filter(StudentModel.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Verify student belongs to admin's school
    if student.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db.delete(student)
    db.commit()
    return None
