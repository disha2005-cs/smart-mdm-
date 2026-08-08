from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import os
from pathlib import Path
from loguru import logger

from app.database import get_db
from app.api import deps
from app.schemas.student import Student, StudentCreate, StudentUpdate
from app.models.student import Student as StudentModel
from app.models.face_encoding import FaceEncoding as FaceEncodingModel
from app.services.face_recognition_service import get_face_recognition_service

router = APIRouter()

# Upload directory for student photos
UPLOAD_DIR = Path("uploads/students")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/", response_model=Student, status_code=status.HTTP_201_CREATED)
async def create_student(
    *,
    db: Session = Depends(get_db),
    first_name: str = Form(...),
    last_name: str = Form(...),
    student_id: str = Form(...),
    school_id: int = Form(...),
    date_of_birth: str = Form(None),
    gender: str = Form(None),
    grade: str = Form(None),
    parent_name: str = Form(None),
    parent_phone: str = Form(None),
    photo: UploadFile = File(None),
    current_user = Depends(deps.get_current_school_admin)
):
    """
    Create new student with optional photo upload. If photo is provided, automatically generate face encoding.
    """
    # Handle photo upload if provided
    photo_path = None
    if photo:
        try:
            # Validate file type
            if not photo.content_type.startswith('image/'):
                raise HTTPException(status_code=400, detail="File must be an image")
            
            # Generate unique filename
            file_extension = photo.filename.split('.')[-1]
            unique_filename = f"{uuid.uuid4()}.{file_extension}"
            file_path = UPLOAD_DIR / unique_filename
            
            # Save file
            contents = await photo.read()
            with open(file_path, 'wb') as f:
                f.write(contents)
            
            photo_path = str(file_path).replace('\\', '/')
            logger.info(f"Photo saved to {photo_path}")
            
        except Exception as e:
            logger.error(f"Error uploading photo: {e}")
            raise HTTPException(status_code=500, detail="Error uploading photo")
    
    # Create student record
    student = StudentModel(
        student_id=student_id,
        school_id=school_id,
        first_name=first_name,
        last_name=last_name,
        date_of_birth=date_of_birth if date_of_birth else None,
        gender=gender if gender else None,
        grade=grade if grade else None,
        parent_name=parent_name if parent_name else None,
        parent_phone=parent_phone if parent_phone else None,
        photo_path=photo_path
    )
    db.add(student)
    db.flush()  # Get the student.id before commit
    
    # If photo is provided, generate face encoding
    if photo_path:
        try:
            face_service = get_face_recognition_service()
            encoding = face_service.generate_encoding_from_file(photo_path)
            
            if encoding is not None:
                # Store encoding in database as a list (for Vector type)
                encoding_list = encoding.tolist()  # Convert numpy array to list
                face_encoding = FaceEncodingModel(
                    student_id=student.id,
                    encoding=encoding_list
                )
                db.add(face_encoding)
                logger.info(f"Face encoding generated for student {student_id}")
            else:
                logger.warning(f"No face detected in photo for student {student_id}")
        except Exception as e:
            logger.error(f"Error generating face encoding: {e}")
            # Don't fail student creation if encoding fails
    
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
async def update_student(
    *,
    id: int,
    db: Session = Depends(get_db),
    first_name: Optional[str] = Form(None),
    last_name: Optional[str] = Form(None),
    date_of_birth: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    grade: Optional[str] = Form(None),
    parent_name: Optional[str] = Form(None),
    parent_phone: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    current_user = Depends(deps.get_current_school_admin)
):
    """
    Update student. If photo is uploaded, regenerate face encoding.
    """
    student = db.query(StudentModel).filter(StudentModel.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Verify student belongs to admin's school
    if student.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Handle photo upload if provided
    photo_updated = False
    if photo:
        try:
            # Validate file type
            if not photo.content_type.startswith('image/'):
                raise HTTPException(status_code=400, detail="File must be an image")
            
            # Generate unique filename
            file_extension = photo.filename.split('.')[-1]
            unique_filename = f"{uuid.uuid4()}.{file_extension}"
            file_path = UPLOAD_DIR / unique_filename
            
            # Save file
            contents = await photo.read()
            with open(file_path, 'wb') as f:
                f.write(contents)
            
            student.photo_path = str(file_path).replace('\\', '/')
            photo_updated = True
            logger.info(f"Photo updated for student {student.student_id}")
            
        except Exception as e:
            logger.error(f"Error uploading photo: {e}")
            raise HTTPException(status_code=500, detail="Error uploading photo")
    
    # Update other fields if provided
    if first_name is not None:
        student.first_name = first_name
    if last_name is not None:
        student.last_name = last_name
    if date_of_birth is not None:
        student.date_of_birth = date_of_birth if date_of_birth else None
    if gender is not None:
        student.gender = gender
    if grade is not None:
        student.grade = grade
    if parent_name is not None:
        student.parent_name = parent_name
    if parent_phone is not None:
        student.parent_phone = parent_phone
    
    # If photo updated, regenerate face encoding
    if photo_updated and student.photo_path:
        try:
            face_service = get_face_recognition_service()
            encoding = face_service.generate_encoding_from_file(student.photo_path)
            
            if encoding is not None:
                # Delete old encoding if exists
                old_encoding = db.query(FaceEncodingModel).filter(
                    FaceEncodingModel.student_id == student.id
                ).first()
                if old_encoding:
                    db.delete(old_encoding)
                    db.flush()  # Ensure deletion is committed before insert
                
                # Create new encoding as a list (for Vector type)
                encoding_list = encoding.tolist()  # Convert numpy array to list
                face_encoding = FaceEncodingModel(
                    student_id=student.id,
                    encoding=encoding_list
                )
                db.add(face_encoding)
                logger.info(f"Face encoding updated for student {student.student_id}")
            else:
                logger.warning(f"No face detected in new photo for student {student.student_id}")
        except Exception as e:
            logger.error(f"Error updating face encoding: {e}")
            # Don't fail update if encoding fails
    
    db.commit()
    db.refresh(student)
    return student


@router.post("/upload-photo")
async def upload_student_photo(
    file: UploadFile = File(...),
    current_user = Depends(deps.get_current_school_admin)
):
    """
    Upload student photo and return the file path.
    Validates that the photo contains a detectable face.
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Generate unique filename
        file_extension = file.filename.split('.')[-1]
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Save file
        contents = await file.read()
        with open(file_path, 'wb') as f:
            f.write(contents)
        
        # Validate face detection
        face_service = get_face_recognition_service()
        encoding = face_service.generate_encoding_from_file(str(file_path))
        
        if encoding is None:
            # Delete the file if no face detected
            os.remove(file_path)
            raise HTTPException(
                status_code=400, 
                detail="No face detected in the image. Please upload a clear photo with a visible face."
            )
        
        # Return the relative path for storage in database
        relative_path = str(file_path).replace('\\', '/')
        return {"file_path": relative_path, "message": "Photo uploaded successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading photo: {e}")
        raise HTTPException(status_code=500, detail="Error uploading photo")


@router.post("/{id}/regenerate-encoding", status_code=status.HTTP_200_OK)
def regenerate_face_encoding(
    id: int,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_school_admin)
):
    """
    Manually regenerate face encoding for a student.
    Useful if photo was updated externally or encoding failed initially.
    """
    student = db.query(StudentModel).filter(StudentModel.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if student.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    if not student.photo_path:
        raise HTTPException(status_code=400, detail="Student has no photo")
    
    try:
        face_service = get_face_recognition_service()
        encoding = face_service.generate_encoding_from_file(student.photo_path)
        
        if encoding is None:
            raise HTTPException(status_code=400, detail="No face detected in student photo")
        
        # Delete old encoding if exists
        old_encoding = db.query(FaceEncodingModel).filter(
            FaceEncodingModel.student_id == student.id
        ).first()
        if old_encoding:
            db.delete(old_encoding)
        
        # Create new encoding
        encoding_str = face_service.encoding_to_base64(encoding)
        face_encoding = FaceEncodingModel(
            student_id=student.id,
            encoding=encoding_str
        )
        db.add(face_encoding)
        db.commit()
        
        return {"message": "Face encoding regenerated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error regenerating face encoding: {e}")
        raise HTTPException(status_code=500, detail="Error regenerating face encoding")


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
