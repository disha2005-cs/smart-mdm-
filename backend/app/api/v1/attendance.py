import os
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import List, Optional

import cv2
from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
from pydantic import BaseModel, Field
from sqlalchemy import and_, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api import deps
from app.core.validators import bad_request, parse_iso_date
from app.database import get_db
from app.models.attendance import Attendance
from app.models.face_encoding import FaceEncoding as FaceEncodingModel
from app.models.student import Student
from app.models.user import UserRole
from app.services.face_recognition_service import (
    DEFAULT_MATCH_THRESHOLD,
    MIN_FACE_QUALITY,
    get_face_recognition_service,
)

router = APIRouter()

# Status values are stored uppercase everywhere so filters and the UI agree.
STATUS_PRESENT = "PRESENT"
STATUS_ABSENT = "ABSENT"

# A face must clear this similarity before attendance is written. It is higher
# than the threshold used for the live preview so the on-screen box can turn
# green slightly before the record is committed.
MARK_THRESHOLD = 0.45

ATTENDANCE_UPLOAD_ROOT = Path("uploads/attendance")


# ------------------------------------------------------------------ schemas

class CameraFrameRequest(BaseModel):
    """Request body for camera frame face detection"""
    frame: str = Field(..., min_length=32, description="Base64 encoded image (data URI accepted)")


class AttendanceMarkRequest(BaseModel):
    """
    Request body for marking attendance via camera.

    Every recognised face in the frame is marked, so a whole group can be
    captured in one shot. ``student_id`` optionally restricts the operation to
    a single student (used when verifying one specific child).
    """
    frame: str = Field(..., min_length=32)
    student_id: Optional[int] = None


class MarkedStudent(BaseModel):
    attendance_id: int
    student: dict
    confidence_score: float
    time: str


class SkippedFace(BaseModel):
    reason: str
    student: Optional[dict] = None
    detail: str


class AttendanceBatchResponse(BaseModel):
    """Result of marking attendance for every face found in one frame."""
    message: str
    date: str
    faces_detected: int
    marked_count: int
    marked: List[MarkedStudent]
    skipped: List[SkippedFace]


# ------------------------------------------------------------------ helpers

def _student_summary(student: Student) -> dict:
    return {
        "id": student.id,
        "student_id": student.student_id,
        "name": f"{student.first_name} {student.last_name}",
        "grade": student.grade,
        "section": student.section,
        "photo_url": student.photo_url,
    }


def _load_known_encodings(db: Session, school_id: int):
    """Load every registered encoding for a school as (ids, matrix)."""
    face_service = get_face_recognition_service()

    rows = (
        db.query(FaceEncodingModel.student_id, FaceEncodingModel.encoding)
        .join(Student, FaceEncodingModel.student_id == Student.id)
        .filter(Student.school_id == school_id, Student.is_active.is_(True))
        .all()
    )

    known = []
    for student_id, raw_encoding in rows:
        encoding = face_service.parse_stored_encoding(raw_encoding)
        if encoding is None:
            logger.warning(f"Skipping unreadable face encoding for student {student_id}")
            continue
        known.append((student_id, encoding))

    return face_service.build_encoding_matrix(known)


def _decode_frame(frame_b64: str):
    face_service = get_face_recognition_service()
    frame = face_service.decode_base64_frame(frame_b64)
    if frame is None:
        raise bad_request("Invalid image data. Please retake the photo.")
    return frame


def _save_frame(frame, today: date) -> str:
    """Persist the capture and return a web-servable path."""
    upload_dir = ATTENDANCE_UPLOAD_ROOT / today.isoformat()
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / f"{uuid.uuid4().hex}.jpg"
    if not cv2.imwrite(str(file_path), frame):
        raise HTTPException(status_code=500, detail="Failed to store the attendance photo")
    # Always POSIX separators so the value works as a URL on every platform.
    return f"/uploads/attendance/{today.isoformat()}/{file_path.name}"


def _remove_stored_frame(photo_url: Optional[str]) -> None:
    if not photo_url:
        return
    path = Path(photo_url.lstrip("/"))
    try:
        if path.is_file():
            os.remove(path)
    except OSError as exc:
        logger.warning(f"Failed to remove attendance photo {path}: {exc}")


def _school_scope(current_user) -> Optional[int]:
    """School admins are scoped to their own school; government sees all."""
    return current_user.school_id if current_user.role == UserRole.SCHOOL else None


# ---------------------------------------------------------------- endpoints

@router.post("/detect-faces")
def detect_faces_in_frame(
    request: CameraFrameRequest,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_school_admin),
):
    """
    Detect every face in a camera frame and match them against registered students.

    This is the live-preview endpoint: it never writes anything, it just tells
    the UI which boxes to draw and who each face belongs to.
    """
    face_service = get_face_recognition_service()
    frame = _decode_frame(request.frame)

    detected_faces = face_service.detect_faces_in_frame(frame)
    if not detected_faces:
        # Still report the roster size so the UI can distinguish "nobody in
        # front of the camera" from "no students have a face registered yet".
        registered = db.query(func.count(FaceEncodingModel.id)).join(
            Student, FaceEncodingModel.student_id == Student.id
        ).filter(
            Student.school_id == current_user.school_id,
            Student.is_active.is_(True),
        ).scalar() or 0
        return {
            "faces_detected": 0,
            "faces": [],
            "registered_students": registered,
            "message": "No faces detected",
        }

    ids, matrix = _load_known_encodings(db, current_user.school_id)

    # One query for every student matched in this frame, instead of one per face.
    matched_faces = []
    pending_ids = set()
    raw_results = []

    for face_data in detected_faces:
        match = face_service.match_against_matrix(
            face_data["encoding"], ids, matrix, threshold=DEFAULT_MATCH_THRESHOLD
        )
        raw_results.append((face_data, match))
        if match:
            pending_ids.add(match[0])

    students_by_id = {}
    if pending_ids:
        students_by_id = {
            student.id: student
            for student in db.query(Student).filter(Student.id.in_(pending_ids)).all()
        }

    already_marked = set()
    if pending_ids:
        already_marked = {
            row[0]
            for row in db.query(Attendance.student_id)
            .filter(
                Attendance.student_id.in_(pending_ids),
                Attendance.date == date.today(),
            )
            .all()
        }

    for face_data, match in raw_results:
        face_info = {
            "bbox": [float(x) for x in face_data["bbox"]],
            "detection_confidence": float(face_data["confidence"]),
            "quality": float(face_data.get("quality", 0.0)),
            "matched": False,
            "student": None,
            "match_confidence": 0.0,
            "already_marked": False,
            "markable": False,
        }

        if match:
            student_id, similarity, _runner_up = match
            student = students_by_id.get(student_id)
            if student is not None:
                face_info["matched"] = True
                face_info["student"] = _student_summary(student)
                face_info["match_confidence"] = float(similarity)
                face_info["already_marked"] = student_id in already_marked
                face_info["markable"] = (
                    similarity >= MARK_THRESHOLD
                    and face_info["quality"] >= MIN_FACE_QUALITY
                    and student_id not in already_marked
                )

        matched_faces.append(face_info)

    return {
        "faces_detected": len(detected_faces),
        "faces": matched_faces,
        "registered_students": len(ids),
        "message": f"Detected {len(detected_faces)} face(s)",
    }


@router.post("/mark-attendance", response_model=AttendanceBatchResponse)
def mark_attendance_from_camera(
    request: AttendanceMarkRequest,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_school_admin),
):
    """
    Mark attendance for **every** recognised student in a camera frame.

    Several children can stand in front of the camera together; each face is
    matched independently and gets its own attendance row. Faces that cannot be
    marked (unknown, low quality, already marked today) are reported in
    ``skipped`` rather than failing the whole request.
    """
    face_service = get_face_recognition_service()
    today = date.today()
    current_time = datetime.now().time()

    frame = _decode_frame(request.frame)
    detected_faces = face_service.detect_faces_in_frame(frame)

    if not detected_faces:
        raise bad_request("No face detected in image. Please face the camera and try again.")

    ids, matrix = _load_known_encodings(db, current_user.school_id)
    if matrix is None:
        raise HTTPException(
            status_code=404,
            detail="No student face encodings found. Register students with a photo first.",
        )

    photo_url = _save_frame(frame, today)

    marked: List[MarkedStudent] = []
    skipped: List[SkippedFace] = []
    matched_this_frame: set = set()

    try:
        for index, face_data in enumerate(detected_faces):
            quality = float(face_data.get("quality", 0.0))
            position = f"Face {index + 1}"

            if quality < MIN_FACE_QUALITY:
                skipped.append(SkippedFace(
                    reason="low_quality",
                    detail=f"{position}: too small or too blurry to identify. Move closer to the camera.",
                ))
                continue

            match = face_service.match_against_matrix(
                face_data["encoding"], ids, matrix, threshold=DEFAULT_MATCH_THRESHOLD
            )

            if not match:
                skipped.append(SkippedFace(
                    reason="not_recognised",
                    detail=f"{position}: not recognised. Make sure the student is registered with a clear photo.",
                ))
                continue

            student_id, similarity, _runner_up = match

            if similarity < MARK_THRESHOLD:
                skipped.append(SkippedFace(
                    reason="low_confidence",
                    detail=(
                        f"{position}: match confidence too low ({similarity * 100:.1f}%). "
                        "Face the camera directly in good lighting."
                    ),
                ))
                continue

            if request.student_id is not None and student_id != request.student_id:
                skipped.append(SkippedFace(
                    reason="different_student",
                    detail=f"{position}: does not match the selected student.",
                ))
                continue

            if student_id in matched_this_frame:
                # The same person cannot occupy two boxes; a duplicate means the
                # detector split one face, so keep the first (higher) match.
                skipped.append(SkippedFace(
                    reason="duplicate_in_frame",
                    detail=f"{position}: duplicate detection of a student already marked from this frame.",
                ))
                continue

            student = db.query(Student).filter(
                Student.id == student_id,
                Student.school_id == current_user.school_id,
                Student.is_active.is_(True),
            ).first()

            if student is None:
                skipped.append(SkippedFace(
                    reason="not_recognised",
                    detail=f"{position}: matched student is no longer active at this school.",
                ))
                continue

            existing = db.query(Attendance).filter(
                Attendance.student_id == student.id,
                Attendance.date == today,
            ).first()

            if existing:
                skipped.append(SkippedFace(
                    reason="already_marked",
                    student=_student_summary(student),
                    detail=(
                        f"{student.first_name} {student.last_name} was already marked today at "
                        f"{existing.time.strftime('%I:%M %p')}"
                    ),
                ))
                matched_this_frame.add(student_id)
                continue

            attendance = Attendance(
                student_id=student.id,
                school_id=current_user.school_id,
                date=today,
                time=current_time,
                status=STATUS_PRESENT,
                marked_by=current_user.id,
                photo_url=photo_url,
                confidence_score=round(similarity * 100, 2),
            )

            try:
                # Each student gets its own SAVEPOINT. A plain rollback here
                # would discard the students already marked from this frame;
                # the nested transaction drops only the conflicting row.
                with db.begin_nested():
                    db.add(attendance)
                    db.flush()
            except IntegrityError:
                skipped.append(SkippedFace(
                    reason="already_marked",
                    student=_student_summary(student),
                    detail=f"{student.first_name} {student.last_name} was marked by another device just now.",
                ))
                continue

            matched_this_frame.add(student_id)
            marked.append(MarkedStudent(
                attendance_id=attendance.id,
                student=_student_summary(student),
                confidence_score=attendance.confidence_score,
                time=current_time.strftime("%I:%M %p"),
            ))

        if marked:
            db.commit()
        else:
            db.rollback()
            _remove_stored_frame(photo_url)
    except Exception:
        db.rollback()
        _remove_stored_frame(photo_url)
        raise

    if not marked:
        # Nothing was recorded - surface the most useful reason to the operator.
        detail = skipped[0].detail if skipped else "No student could be recognised in the frame."
        raise HTTPException(status_code=400, detail=detail)

    names = ", ".join(entry.student["name"] for entry in marked)
    return AttendanceBatchResponse(
        message=f"Attendance marked for {len(marked)} student(s): {names}",
        date=today.isoformat(),
        faces_detected=len(detected_faces),
        marked_count=len(marked),
        marked=marked,
        skipped=skipped,
    )


@router.post("/mark-absent")
def mark_remaining_absent(
    target_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_school_admin),
):
    """
    Close the register for a day: every active student without a record gets an
    ABSENT row.

    Without this the system only ever stored PRESENT rows, so absentee counts
    and attendance rates could never be calculated from history.
    """
    day = parse_iso_date(target_date, "Date") or date.today()
    if day > date.today():
        raise bad_request("Cannot close the register for a future date")

    already_marked = {
        row[0]
        for row in db.query(Attendance.student_id)
        .filter(Attendance.school_id == current_user.school_id, Attendance.date == day)
        .all()
    }

    students = db.query(Student).filter(
        Student.school_id == current_user.school_id,
        Student.is_active.is_(True),
    ).all()

    now = datetime.now().time()
    created = 0
    for student in students:
        if student.id in already_marked:
            continue
        db.add(Attendance(
            student_id=student.id,
            school_id=current_user.school_id,
            date=day,
            time=now,
            status=STATUS_ABSENT,
            marked_by=current_user.id,
        ))
        created += 1

    db.commit()

    return {
        "message": f"Marked {created} student(s) absent for {day.isoformat()}",
        "date": day.isoformat(),
        "absent_marked": created,
        "already_recorded": len(already_marked),
    }


@router.get("/today")
def get_today_attendance(
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    """Get today's attendance records."""
    return _attendance_for_date(db, current_user, date.today())


@router.get("/date/{date_str}")
def get_attendance_by_date(
    date_str: str,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    """Get attendance for a specific date (format: YYYY-MM-DD)."""
    attendance_date = parse_iso_date(date_str, "Date")
    if attendance_date is None:
        raise bad_request("Date is required in YYYY-MM-DD format")
    return _attendance_for_date(db, current_user, attendance_date)


def _attendance_for_date(db: Session, current_user, on_date: date):
    query = (
        db.query(Attendance)
        .join(Student, Attendance.student_id == Student.id)
        .filter(Attendance.date == on_date)
    )

    school_id = _school_scope(current_user)
    if school_id:
        query = query.filter(Attendance.school_id == school_id)

    records = query.order_by(Attendance.time.desc()).all()

    return [{
        "id": r.id,
        "student_id": r.student.student_id,
        "student_db_id": r.student.id,
        "student_name": f"{r.student.first_name} {r.student.last_name}",
        "grade": r.student.grade,
        "section": r.student.section,
        "date": r.date.isoformat(),
        "time": r.time.strftime("%I:%M %p") if r.time else None,
        "status": r.status,
        "confidence_score": r.confidence_score,
        "photo_url": r.photo_url,
    } for r in records]


@router.get("/student/{student_id}/history")
def get_student_attendance_history(
    student_id: int,
    days: int = 30,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    """Attendance history plus a real attendance rate for one student."""
    if days < 1 or days > 365:
        raise bad_request("days must be between 1 and 365")

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if current_user.role == UserRole.SCHOOL and student.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this student's attendance")

    start_date = date.today() - timedelta(days=days)

    records = db.query(Attendance).filter(
        and_(Attendance.student_id == student_id, Attendance.date >= start_date)
    ).order_by(Attendance.date.desc()).all()

    # School days = days on which this school recorded attendance for anyone.
    # Counting them separately is what makes the rate meaningful: a student with
    # no row for a working day is absent, not simply missing from the data.
    school_days = db.query(func.count(func.distinct(Attendance.date))).filter(
        Attendance.school_id == student.school_id,
        Attendance.date >= start_date,
    ).scalar() or 0

    present_days = sum(1 for r in records if r.status == STATUS_PRESENT)
    recorded_absent = sum(1 for r in records if r.status == STATUS_ABSENT)
    absent_days = max(school_days - present_days, recorded_absent)

    return {
        "student": _student_summary(student),
        "period_days": days,
        "school_days": school_days,
        "present_days": present_days,
        "absent_days": absent_days,
        "attendance_percentage": round(present_days / school_days * 100, 2) if school_days else 0.0,
        "records": [{
            "id": r.id,
            "date": r.date.isoformat(),
            "time": r.time.strftime("%I:%M %p") if r.time else None,
            "status": r.status,
            "confidence_score": r.confidence_score,
        } for r in records],
    }


@router.get("/statistics/today")
def get_today_statistics(
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_school_admin),
):
    """Attendance statistics for today."""
    return get_statistics_for_date(db=db, current_user=current_user)


@router.get("/statistics")
def get_statistics_for_date(
    target_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_school_admin),
):
    """Attendance statistics for a given date (defaults to today)."""
    day = parse_iso_date(target_date, "Date") or date.today()

    total_students = db.query(func.count(Student.id)).filter(
        Student.school_id == current_user.school_id,
        Student.is_active.is_(True),
    ).scalar() or 0

    present_count = db.query(func.count(func.distinct(Attendance.student_id))).filter(
        Attendance.school_id == current_user.school_id,
        Attendance.date == day,
        Attendance.status == STATUS_PRESENT,
    ).scalar() or 0

    # Never report more present than enrolled, even if a student was
    # deactivated after their attendance was taken.
    present_count = min(present_count, total_students)
    attendance_percentage = (present_count / total_students * 100) if total_students else 0.0

    return {
        "date": day.isoformat(),
        "total_students": total_students,
        "present": present_count,
        "absent": total_students - present_count,
        "attendance_percentage": round(attendance_percentage, 2),
    }


@router.delete("/{attendance_id}")
def delete_attendance_record(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_school_admin),
):
    """Delete an attendance record (school admin only)."""
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()

    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    if attendance.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    photo_url = attendance.photo_url

    db.delete(attendance)
    db.commit()

    # Only delete the capture once no other record still points at it - one
    # frame can back several students when a group is captured together.
    if photo_url:
        still_referenced = db.query(Attendance).filter(Attendance.photo_url == photo_url).count()
        if still_referenced == 0:
            _remove_stored_frame(photo_url)

    return {"message": "Attendance record deleted successfully"}
