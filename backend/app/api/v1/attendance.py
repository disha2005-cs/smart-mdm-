from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import select

import uuid
import numpy as np
from datetime import datetime

from app.database import get_db
from app.api import deps
from app.models.student import Student
from app.models.face_encoding import FaceEncoding

router = APIRouter()

@router.post("/register/{student_id}", status_code=status.HTTP_201_CREATED)
async def register_face(
    student_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_school_admin)
):
    """
    Register a face encoding for a student.
    MOCKED IMPLEMENTATION due to TensorFlow compatibility issues on Windows.
    """
    student = db.query(Student).filter(Student.id == student_id, Student.school_id == current_user.school_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found or unauthorized")
        
    # Check if encoding already exists
    existing = db.query(FaceEncoding).filter(FaceEncoding.student_id == student_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Face already registered for this student")

    # MOCK: In a real scenario we'd use DeepFace.represent(img_path) to get a 512-d array.
    # We generate a random normalized 512-dimensional vector.
    random_vector = np.random.rand(512)
    normalized_vector = random_vector / np.linalg.norm(random_vector)
    
    encoding = FaceEncoding(
        student_id=student_id,
        encoding=normalized_vector.tolist()
    )
    
    db.add(encoding)
    db.commit()
    
    return {"message": "Face registered successfully (Mocked)", "student_id": student.student_id}


@router.post("/verify")
async def verify_face(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_school_admin)
):
    """
    Verify a face and mark attendance.
    MOCKED IMPLEMENTATION due to TensorFlow compatibility issues on Windows.
    """
    # MOCK: Generate a random vector and find the closest match using pgvector
    random_vector = np.random.rand(512)
    normalized_vector = random_vector / np.linalg.norm(random_vector)
    
    # In PostgreSQL with pgvector, we can order by Euclidean distance (<->), cosine distance (<=>) or inner product (<#>)
    # For normalized vectors, cosine distance is equivalent to Euclidean. We use <=> for cosine distance.
    closest_match = db.query(FaceEncoding).order_by(
        FaceEncoding.encoding.cosine_distance(normalized_vector.tolist())
    ).first()
    
    if not closest_match:
        raise HTTPException(status_code=404, detail="No face encodings found in database")
        
    student = closest_match.student
    
    # In a real app we'd compare the distance to a threshold (e.g. < 0.4)
    # Since it's mocked, we will just return the closest student.
    
    return {
        "message": "Attendance marked successfully (Mocked)",
        "student": {
            "student_id": student.student_id,
            "name": f"{student.first_name} {student.last_name}",
            "grade": student.grade,
            "section": student.section
        }
    }
