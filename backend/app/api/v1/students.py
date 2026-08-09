from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import os
from pathlib import Path
from loguru import logger
import io

from app.database import get_db
from app.api import deps
from app.schemas.student import Student, StudentCreate, StudentUpdate
from app.models.student import Student as StudentModel
from app.models.face_encoding import FaceEncoding as FaceEncodingModel
from app.services.face_recognition_service import get_face_recognition_service

router = APIRouter()

# Upload directory for student photos (kept for backward compatibility)
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
    Create new student with optional photo upload. Photos are stored in database.
    If photo is provided, automatically generate face encoding.
    """
    # Handle photo upload if provided
    photo_data = None
    photo_mime_type = None
    temp_file_path = None
    
    if photo:
        try:
            # Validate file type
            if not photo.content_type.startswith('image/'):
                raise HTTPException(status_code=400, detail="File must be an image")
            
            # Read photo data into memory
            contents = await photo.read()
            photo_data = contents
            photo_mime_type = photo.content_type
            
            # Save to temp file for face encoding generation
            file_extension = photo.filename.split('.')[-1]
            unique_filename = f"{uuid.uuid4()}.{file_extension}"
            temp_file_path = UPLOAD_DIR / unique_filename
            
            with open(temp_file_path, 'wb') as f:
                f.write(contents)
            
            logger.info(f"Photo uploaded and stored in database")
            
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
        photo_data=photo_data,
        photo_mime_type=photo_mime_type
    )
    db.add(student)
    db.flush()  # Get the student.id before commit
    
    # If photo is provided, generate face encoding
    if temp_file_path:
        try:
            face_service = get_face_recognition_service()
            encoding = face_service.generate_encoding_from_file(str(temp_file_path))
            
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
                
            # Clean up temp file
            os.remove(temp_file_path)
        except Exception as e:
            logger.error(f"Error generating face encoding: {e}")
            # Don't fail student creation if encoding fails
            if temp_file_path and os.path.exists(temp_file_path):
                os.remove(temp_file_path)
    
    db.commit()
    db.refresh(student)
    return student


@router.get("/{id}/photo")
def get_student_photo(
    id: int,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Get student photo from database or fallback to file system.
    """
    from app.models.user import UserRole
    
    student = db.query(StudentModel).filter(StudentModel.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    if current_user.role == UserRole.SCHOOL and student.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Try photo_data first (new method)
    if student.photo_data:
        return StreamingResponse(
            io.BytesIO(student.photo_data),
            media_type=student.photo_mime_type or "image/jpeg"
        )
    
    # Fallback to photo_path (old method) for backward compatibility
    if student.photo_path and os.path.exists(student.photo_path):
        return StreamingResponse(
            open(student.photo_path, "rb"),
            media_type="image/jpeg"
        )
    
    # No photo available
    raise HTTPException(status_code=404, detail="Student has no photo")

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
    from app.models.user import UserRole
    
    query = db.query(StudentModel)
    
    if current_user.role == UserRole.SCHOOL:
        query = query.filter(StudentModel.school_id == current_user.school_id)
        
    students = query.offset(skip).limit(limit).all()
    
    # Add has_photo field to response
    result = []
    for student in students:
        student_dict = {
            "id": student.id,
            "student_id": student.student_id,
            "school_id": student.school_id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "date_of_birth": student.date_of_birth,
            "gender": student.gender,
            "grade": student.grade,
            "section": student.section,
            "parent_name": student.parent_name,
            "parent_phone": student.parent_phone,
            "photo_path": student.photo_path,
            "has_allergies": student.has_allergies,
            "dietary_preferences": student.dietary_preferences,
            "is_active": student.is_active,
            "created_at": student.created_at,
            "updated_at": student.updated_at,
            "has_photo": bool(student.photo_data or student.photo_path)  # Add indicator
        }
        result.append(student_dict)
    
    return result

@router.get("/{id}", response_model=Student)
def read_student(
    id: int,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Get student by ID.
    """
    from app.models.user import UserRole
    
    student = db.query(StudentModel).filter(StudentModel.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    if current_user.role == UserRole.SCHOOL and student.school_id != current_user.school_id:
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
    Update student. If photo is uploaded, regenerate face encoding. Photos stored in database.
    """
    from app.models.user import UserRole
    
    student = db.query(StudentModel).filter(StudentModel.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Verify student belongs to admin's school
    if current_user.role == UserRole.SCHOOL and student.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Handle photo upload if provided
    photo_updated = False
    temp_file_path = None
    
    if photo:
        try:
            # Validate file type
            if not photo.content_type.startswith('image/'):
                raise HTTPException(status_code=400, detail="File must be an image")
            
            # Read photo data into memory
            contents = await photo.read()
            student.photo_data = contents
            student.photo_mime_type = photo.content_type
            
            # Save to temp file for face encoding generation
            file_extension = photo.filename.split('.')[-1]
            unique_filename = f"{uuid.uuid4()}.{file_extension}"
            temp_file_path = UPLOAD_DIR / unique_filename
            
            with open(temp_file_path, 'wb') as f:
                f.write(contents)
            
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
    if photo_updated and temp_file_path:
        try:
            face_service = get_face_recognition_service()
            encoding = face_service.generate_encoding_from_file(str(temp_file_path))
            
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
                
            # Clean up temp file
            os.remove(temp_file_path)
        except Exception as e:
            logger.error(f"Error updating face encoding: {e}")
            # Don't fail update if encoding fails
            if temp_file_path and os.path.exists(temp_file_path):
                os.remove(temp_file_path)
    
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
    Delete student and associated data.
    """
    student = db.query(StudentModel).filter(StudentModel.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Verify student belongs to admin's school
    if student.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Delete face encoding first (if exists)
    face_encoding = db.query(FaceEncodingModel).filter(
        FaceEncodingModel.student_id == id
    ).first()
    if face_encoding:
        db.delete(face_encoding)
        db.flush()
    
    # Delete student
    db.delete(student)
    db.commit()
    return None
