from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Body
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from datetime import date, datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel
import os
import uuid
import cv2
import numpy as np
import base64
from loguru import logger

from app.database import get_db
from app.api import deps
from app.models.student import Student
from app.models.attendance import Attendance
from app.models.face_encoding import FaceEncoding as FaceEncodingModel
from app.services.face_recognition_service import get_face_recognition_service

router = APIRouter()

# Schemas
class CameraFrameRequest(BaseModel):
    """Request body for camera frame face detection"""
    frame: str  # Base64 encoded image
    
class AttendanceMarkRequest(BaseModel):
    """Request body for marking attendance via camera"""
    frame: str  # Base64 encoded image
    student_id: Optional[int] = None  # If None, auto-detect

class AttendanceResponse(BaseModel):
    """Response for attendance marking"""
    message: str
    attendance_id: int
    student: dict
    confidence_score: float
    time: str
    date: str

@router.post("/detect-faces")
async def detect_faces_in_frame(
    request: CameraFrameRequest,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_school_admin)
):
    """
    Detect all faces in a camera frame and match them against registered students.
    Returns list of detected faces with student info if matched.
    """
    try:
        face_service = get_face_recognition_service()
        
        # Decode base64 frame
        img_data = base64.b64decode(request.frame.split(',')[-1])
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image data")
        
        # Detect all faces in frame
        detected_faces = face_service.detect_faces_in_frame(frame)
        
        if not detected_faces:
            return {
                "faces_detected": 0,
                "faces": [],
                "message": "No faces detected"
            }
        
        # Get all face encodings for students in this school
        encodings_query = db.query(
            FaceEncodingModel, Student
        ).join(
            Student, FaceEncodingModel.student_id == Student.id
        ).filter(
            Student.school_id == current_user.school_id,
            Student.is_active == True
        ).all()
        
        # Prepare known encodings list
        known_encodings = []
        for encoding_model, student in encodings_query:
            # Encoding is stored as list in database, convert to numpy array
            enc_array = np.array(encoding_model.encoding, dtype=np.float32)
            known_encodings.append((student.id, enc_array))
        
        # Match each detected face
        matched_faces = []
        for face_data in detected_faces:
            face_encoding = face_data['encoding']
            bbox = face_data['bbox']
            confidence = face_data['confidence']
            
            # Try to find a match with threshold for accuracy
            match_result = face_service.find_best_match(
                face_encoding,
                known_encodings,
                threshold=0.4  # Lowered threshold (40%) for easier matching
            )
            
            face_info = {
                'bbox': [float(x) for x in bbox],  # Convert numpy.float32 to Python float
                'detection_confidence': float(confidence),
                'quality': float(face_data.get('quality', 0.0))  # Include quality score
            }
            
            if match_result:
                student_id, similarity = match_result
                student = db.query(Student).filter(Student.id == student_id).first()
                
                face_info['matched'] = True
                face_info['student'] = {
                    'id': student.id,
                    'student_id': student.student_id,
                    'name': f"{student.first_name} {student.last_name}",
                    'grade': student.grade,
                    'section': student.section
                }
                face_info['match_confidence'] = float(similarity)  # Convert to Python float
            else:
                face_info['matched'] = False
                face_info['student'] = None
                face_info['match_confidence'] = 0.0
            
            matched_faces.append(face_info)
        
        return {
            "faces_detected": len(detected_faces),
            "faces": matched_faces,
            "message": f"Detected {len(detected_faces)} face(s)"
        }
        
    except Exception as e:
        logger.error(f"Error detecting faces: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")


@router.post("/mark-attendance", response_model=AttendanceResponse)
async def mark_attendance_from_camera(
    request: AttendanceMarkRequest,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_school_admin)
):
    """
    Mark attendance from a camera frame.
    Auto-detects and matches face, or uses provided student_id for verification.
    """
    try:
        face_service = get_face_recognition_service()
        today = date.today()
        current_time = datetime.now().time()
        
        # Decode base64 frame
        img_data = base64.b64decode(request.frame.split(',')[-1])
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image data")
        
        # Save the frame for records
        upload_dir = f"uploads/attendance/{today}"
        os.makedirs(upload_dir, exist_ok=True)
        filename = f"{uuid.uuid4()}.jpg"
        file_path = os.path.join(upload_dir, filename)
        cv2.imwrite(file_path, frame)
        
        # Detect faces in frame
        detected_faces = face_service.detect_faces_in_frame(frame)
        
        if not detected_faces:
            os.remove(file_path)  # Clean up
            raise HTTPException(status_code=400, detail="No face detected in image")
        
        if len(detected_faces) > 1:
            os.remove(file_path)
            raise HTTPException(
                status_code=400, 
                detail="Multiple faces detected. Please ensure only one person is in the frame."
            )
        
        # Check face quality for better accuracy
        detected_face = detected_faces[0]
        face_quality = detected_face.get('quality', 0)
        
        if face_quality < 0.5:  # Minimum quality threshold
            os.remove(file_path)
            raise HTTPException(
                status_code=400,
                detail="Face quality is too low. Please ensure good lighting and face the camera directly."
            )
        
        # Get face encoding
        face_encoding = detected_face['encoding']
        detection_confidence = detected_face['confidence']
        
        # Get all face encodings for active students in this school
        encodings_query = db.query(
            FaceEncodingModel, Student
        ).join(
            Student, FaceEncodingModel.student_id == Student.id
        ).filter(
            Student.school_id == current_user.school_id,
            Student.is_active == True
        ).all()
        
        if not encodings_query:
            os.remove(file_path)
            raise HTTPException(
                status_code=404, 
                detail="No student face encodings found. Please register students first."
            )
        
        # Prepare known encodings
        known_encodings = []
        for encoding_model, student in encodings_query:
            # Encoding is stored as list in database, convert to numpy array
            enc_array = np.array(encoding_model.encoding, dtype=np.float32)
            known_encodings.append((student.id, enc_array))
        
        # Find best match with threshold for accuracy
        match_result = face_service.find_best_match(
            face_encoding,
            known_encodings,
            threshold=0.4  # Lowered threshold (40%) for easier matching
        )
        
        if not match_result:
            os.remove(file_path)
            raise HTTPException(
                status_code=404, 
                detail="Face not recognized. Please ensure the student is registered and try again with better lighting."
            )
        
        matched_student_id, match_confidence = match_result
        
        # Require minimum 45% confidence for marking attendance
        if match_confidence < 0.45:
            os.remove(file_path)
            raise HTTPException(
                status_code=400,
                detail=f"Face match confidence too low ({match_confidence*100:.1f}%). Please face the camera directly and ensure good lighting."
            )
        
        # If student_id was provided, verify it matches
        if request.student_id is not None and request.student_id != matched_student_id:
            os.remove(file_path)
            raise HTTPException(
                status_code=400, 
                detail="Face does not match the specified student"
            )
        
        # Get student details with null check
        student = db.query(Student).filter(Student.id == matched_student_id).first()
        
        if not student:
            os.remove(file_path)
            raise HTTPException(status_code=404, detail="Matched student not found in database")
        
        # Check for duplicate attendance today
        existing = db.query(Attendance).filter(
            Attendance.student_id == student.id,
            Attendance.date == today
        ).first()
        
        if existing:
            os.remove(file_path)
            raise HTTPException(
                status_code=400, 
                detail=f"Attendance already marked for {student.first_name} {student.last_name} today at {existing.time.strftime('%I:%M %p')}"
            )
        
        # Create attendance record
        attendance = Attendance(
            student_id=student.id,
            school_id=current_user.school_id,
            date=today,
            time=current_time,
            status="PRESENT",
            marked_by=current_user.id,
            photo_url=file_path,
            confidence_score=round(match_confidence * 100, 2)  # Convert to percentage
        )
        
        db.add(attendance)
        db.commit()
        db.refresh(attendance)
        
        return AttendanceResponse(
            message="Attendance marked successfully",
            attendance_id=attendance.id,
            student={
                "id": student.id,
                "student_id": student.student_id,
                "name": f"{student.first_name} {student.last_name}",
                "grade": student.grade,
                "section": student.section,
                "photo": student.photo_path
            },
            confidence_score=attendance.confidence_score,
            time=current_time.strftime("%I:%M %p"),
            date=today.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking attendance: {e}")
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error marking attendance: {str(e)}")


@router.get("/today")
def get_today_attendance(
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """Get today's attendance for school."""
    from app.models.user import UserRole
    
    school_id = current_user.school_id if current_user.role == UserRole.SCHOOL else None
    
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
        "confidence_score": r.confidence_score,
        "photo_url": r.photo_url
    } for r in records]


@router.get("/date/{date_str}")
def get_attendance_by_date(
    date_str: str,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """Get attendance for specific date (format: YYYY-MM-DD)."""
    from app.models.user import UserRole
    
    try:
        attendance_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    school_id = current_user.school_id if current_user.role == UserRole.SCHOOL else None
    
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
    days: int = 30,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """Get attendance history for a specific student (last N days)."""
    from app.models.user import UserRole
    
    student = db.query(Student).filter(Student.id == student_id).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # School admins can only see their own school's students
    if current_user.role == UserRole.SCHOOL and student.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this student's attendance")
    
    # Get records from last N days
    start_date = date.today() - timedelta(days=days)
    
    records = db.query(Attendance).filter(
        and_(
            Attendance.student_id == student_id,
            Attendance.date >= start_date
        )
    ).order_by(Attendance.date.desc()).all()
    
    return [{
        "date": r.date.isoformat(),
        "time": r.time.strftime("%I:%M %p"),
        "status": r.status,
        "confidence_score": r.confidence_score
    } for r in records]


@router.get("/statistics/today")
def get_today_statistics(
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_school_admin)
):
    """Get attendance statistics for today."""
    today = date.today()
    
    # Total students in school
    total_students = db.query(Student).filter(
        Student.school_id == current_user.school_id,
        Student.is_active == True
    ).count()
    
    # Students present today
    present_count = db.query(Attendance).filter(
        Attendance.school_id == current_user.school_id,
        Attendance.date == today,
        Attendance.status == "PRESENT"
    ).count()
    
    # Calculate percentage
    attendance_percentage = (present_count / total_students * 100) if total_students > 0 else 0
    
    return {
        "date": today.isoformat(),
        "total_students": total_students,
        "present": present_count,
        "absent": total_students - present_count,
        "attendance_percentage": round(attendance_percentage, 2)
    }


@router.delete("/{attendance_id}")
def delete_attendance_record(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_school_admin)
):
    """Delete an attendance record (admin only)."""
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    
    if attendance.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Delete associated photo if exists
    if attendance.photo_url and os.path.exists(attendance.photo_url):
        try:
            os.remove(attendance.photo_url)
        except Exception as e:
            logger.warning(f"Failed to delete attendance photo: {e}")
    
    db.delete(attendance)
    db.commit()
    
    return {"message": "Attendance record deleted successfully"}
