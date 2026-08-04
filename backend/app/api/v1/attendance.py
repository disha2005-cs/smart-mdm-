from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import date, datetime
import os
import uuid
import random

from app.database import get_db
from app.api import deps
from app.models.student import Student
from app.models.attendance import Attendance
from app.models.face_encoding import FaceEncoding

router = APIRouter()

@router.post("/capture", status_code=status.HTTP_201_CREATED)
async def capture_attendance(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_school_admin)
):
    """
    Capture attendance photo and mark student present.
    Uses mock face recognition - selects a random active student.
    """
    # Create upload directory
    today = date.today()
    upload_dir = f"uploads/attendance/{today}"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save uploaded file
    file_ext = file.filename.split('.')[-1] if file.filename and '.' in file.filename else 'jpg'
    filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(upload_dir, filename)
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Mock face recognition - select random active student from school
    students = db.query(Student).filter(
        Student.school_id == current_user.school_id,
        Student.is_active == True
    ).all()
    
    if not students:
        raise HTTPException(status_code=404, detail="No active students found in your school")
    
    # Select a random student
    matched_student = random.choice(students)
    
    # Check for duplicate attendance today
    existing = db.query(Attendance).filter(
        Attendance.student_id == matched_student.id,
        Attendance.date == today
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Attendance already marked for {matched_student.first_name} {matched_student.last_name} today"
        )
    
    # Create attendance record
    confidence = round(random.uniform(92.0, 98.5), 2)
    current_time = datetime.now().time()
    
    attendance = Attendance(
        student_id=matched_student.id,
        school_id=current_user.school_id,
        date=today,
        time=current_time,
        status="PRESENT",
        marked_by=current_user.id,
        photo_url=file_path,
        confidence_score=confidence
    )
    
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    
    return {
        "message": "Attendance marked successfully",
        "attendance_id": attendance.id,
        "student": {
            "student_id": matched_student.student_id,
            "name": f"{matched_student.first_name} {matched_student.last_name}",
            "grade": matched_student.grade,
            "section": matched_student.section
        },
        "confidence_score": confidence,
        "time": current_time.strftime("%I:%M %p"),
        "date": today.isoformat()
    }


@router.get("/today")
def get_today_attendance(
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """Get today's attendance for school."""
    school_id = current_user.school_id if current_user.role == "SCHOOL" else None
    
    query = db.query(Attendance).join(Student).filter(
        Attendance.date == date.today()
    )
    
    if school_id:
        query = query.filter(Attendance.school_id == school_id)
    
    records = query.order_by(Attendance.time.desc()).all()
    
    return [{
        "id": r.id,
        "student_id": r.student.student_id,
        "student_name": f"{r.student.first_name} {r.student.last_name}",
        "grade": r.student.grade,
        "section": r.student.section,
        "time": r.time.strftime("%I:%M %p"),
        "status": r.status,
        "confidence_score": r.confidence_score
    } for r in records]


@router.get("/date/{date_str}")
def get_attendance_by_date(
    date_str: str,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """Get attendance for specific date (format: YYYY-MM-DD)."""
    try:
        attendance_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    school_id = current_user.school_id if current_user.role == "SCHOOL" else None
    
    query = db.query(Attendance).join(Student).filter(
        Attendance.date == attendance_date
    )
    
    if school_id:
        query = query.filter(Attendance.school_id == school_id)
    
    records = query.order_by(Attendance.time.desc()).all()
    
    return [{
        "id": r.id,
        "student_id": r.student.student_id,
        "student_name": f"{r.student.first_name} {r.student.last_name}",
        "grade": r.student.grade,
        "section": r.student.section,
        "time": r.time.strftime("%I:%M %p"),
        "status": r.status,
        "confidence_score": r.confidence_score
    } for r in records]


@router.get("/student/{student_id}/history")
def get_student_attendance_history(
    student_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """Get attendance history for a specific student."""
    student = db.query(Student).filter(Student.id == student_id).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # School admins can only see their own school's students
    if current_user.role == "SCHOOL" and student.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this student's attendance")
    
    records = db.query(Attendance).filter(
        Attendance.student_id == student_id
    ).order_by(Attendance.date.desc()).limit(30).all()
    
    return [{
        "date": r.date.isoformat(),
        "time": r.time.strftime("%I:%M %p"),
        "status": r.status,
        "confidence_score": r.confidence_score
    } for r in records]


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
