import io
import os
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from loguru import logger
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api import deps
from app.core.validators import (
    ALLOWED_IMAGE_TYPES,
    MAX_PHOTO_BYTES,
    bad_request,
    clean_str,
    parse_date_of_birth,
    validate_gender,
    validate_grade,
    validate_name,
    validate_phone,
    validate_section,
)
from app.database import get_db
from app.models.attendance import Attendance
from app.models.face_encoding import FaceEncoding as FaceEncodingModel
from app.models.student import Student as StudentModel
from app.models.user import UserRole
from app.schemas.student import Student
from app.services import photo_storage
from app.services.face_recognition_service import get_face_recognition_service

router = APIRouter()

# Temp/local storage for student photos.
UPLOAD_DIR = Path("uploads/students")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ------------------------------------------------------------------ helpers

def _serialise(student: StudentModel) -> dict:
    return {
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
        "photo_url": student.photo_url,
        "has_allergies": student.has_allergies,
        "dietary_preferences": student.dietary_preferences,
        "is_active": student.is_active,
        "created_at": student.created_at,
        "updated_at": student.updated_at,
        "has_photo": bool(student.photo_url or student.photo_data or student.photo_path),
        "has_face_encoding": student.face_encoding is not None,
    }


async def _read_photo(photo: UploadFile) -> bytes:
    """Validate and read an uploaded photo into memory."""
    content_type = (photo.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise bad_request(
            f"Photo must be a JPEG, PNG or WebP image (received '{photo.content_type or 'unknown'}')"
        )

    contents = await photo.read()
    if not contents:
        raise bad_request("The uploaded photo is empty")
    if len(contents) > MAX_PHOTO_BYTES:
        raise bad_request(f"Photo must be smaller than {MAX_PHOTO_BYTES // (1024 * 1024)} MB")
    return contents


def _generate_student_id(db: Session, school_id: int) -> str:
    """
    Server-side, collision-free admission number: ``STU-<school>-<serial>``.

    The client used to invent a random ID, which could collide and surfaced as
    an opaque 500.
    """
    prefix = f"STU-{school_id:03d}-"
    last = (
        db.query(StudentModel.student_id)
        .filter(StudentModel.student_id.like(f"{prefix}%"))
        .order_by(func.length(StudentModel.student_id).desc(), StudentModel.student_id.desc())
        .first()
    )

    next_number = 1
    if last:
        try:
            next_number = int(last[0].rsplit("-", 1)[-1]) + 1
        except (ValueError, IndexError):
            next_number = db.query(StudentModel).filter(StudentModel.school_id == school_id).count() + 1

    # Skip over any gap left by a manually entered ID.
    while db.query(StudentModel).filter(StudentModel.student_id == f"{prefix}{next_number:04d}").first():
        next_number += 1

    return f"{prefix}{next_number:04d}"


def _store_encoding(db: Session, student: StudentModel, image_path: Path) -> bool:
    """Generate and persist a face encoding. Returns True when one was stored."""
    face_service = get_face_recognition_service()
    encoding = face_service.generate_encoding_from_file(str(image_path))

    if encoding is None:
        logger.warning(f"No face detected in photo for student {student.student_id}")
        return False

    existing = db.query(FaceEncodingModel).filter(
        FaceEncodingModel.student_id == student.id
    ).first()

    # Stored as a plain float list to match the JSONB column; the old code path
    # wrote a base64 string here, which then failed to parse at match time.
    encoding_list = face_service.encoding_to_list(encoding)

    if existing:
        existing.encoding = encoding_list
    else:
        db.add(FaceEncodingModel(student_id=student.id, encoding=encoding_list))

    logger.info(f"Face encoding stored for student {student.student_id}")
    return True


def _assert_can_access(current_user, student: StudentModel) -> None:
    if current_user.role == UserRole.SCHOOL and student.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")


# ---------------------------------------------------------------- endpoints

@router.post("/", response_model=Student, status_code=status.HTTP_201_CREATED)
async def create_student(
    *,
    db: Session = Depends(get_db),
    first_name: str = Form(...),
    last_name: str = Form(...),
    student_id: Optional[str] = Form(None),
    school_id: Optional[int] = Form(None),
    date_of_birth: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    grade: Optional[str] = Form(None),
    section: Optional[str] = Form(None),
    parent_name: Optional[str] = Form(None),
    parent_phone: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    current_user=Depends(deps.get_current_school_admin),
):
    """
    Create a student, optionally with a photo that is turned into a face encoding.

    The school is always taken from the authenticated admin - a submitted
    ``school_id`` for another school is rejected rather than honoured.
    """
    if school_id is not None and school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Cannot create a student for another school")

    first_name = validate_name(first_name, "First name")
    last_name = validate_name(last_name, "Last name")
    dob = parse_date_of_birth(date_of_birth)
    gender = validate_gender(gender)
    grade = validate_grade(grade, required=True)
    section = validate_section(section)
    parent_name = validate_name(parent_name, "Parent name") if clean_str(parent_name) else None
    parent_phone = validate_phone(parent_phone, "Parent phone")

    student_id = clean_str(student_id)
    if student_id:
        if len(student_id) > 40:
            raise bad_request("Student ID must be at most 40 characters")
        duplicate = db.query(StudentModel).filter(StudentModel.student_id == student_id).first()
        if duplicate:
            raise bad_request(f"Student ID '{student_id}' is already in use")
    else:
        student_id = _generate_student_id(db, current_user.school_id)

    # Read and validate the photo before touching the database so a rejected
    # image never leaves a half-created student behind.
    photo_bytes = None
    if photo is not None and photo.filename:
        photo_bytes = await _read_photo(photo)

    student = StudentModel(
        student_id=student_id,
        school_id=current_user.school_id,
        first_name=first_name,
        last_name=last_name,
        date_of_birth=dob,
        gender=gender,
        grade=grade,
        section=section,
        parent_name=parent_name,
        parent_phone=parent_phone,
        is_active=True,
    )
    db.add(student)

    try:
        db.flush()  # assigns student.id
    except IntegrityError:
        db.rollback()
        raise bad_request(f"Student ID '{student_id}' is already in use")

    face_registered = False
    stored_url = None
    local_path = None

    if photo_bytes is not None:
        try:
            stored_url, local_path = photo_storage.store_student_photo(
                photo_bytes, photo.content_type, student_id
            )
            student.photo_url = stored_url
        except Exception as exc:  # noqa: BLE001
            db.rollback()
            logger.error(f"Photo storage failed for {student_id}: {exc}")
            raise HTTPException(status_code=502, detail="Could not store the photo. Please try again.")

        if local_path is not None:
            try:
                face_registered = _store_encoding(db, student, local_path)
            except Exception as exc:  # noqa: BLE001
                # A failed encoding must not lose the student record; the admin
                # can retry with /regenerate-encoding.
                logger.error(f"Face encoding failed for {student_id}: {exc}")
            finally:
                if photo_storage.s3_configured() and stored_url and stored_url.startswith("http"):
                    try:
                        os.remove(local_path)
                    except OSError:
                        pass

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        photo_storage.delete_student_photo(stored_url)
        raise bad_request(f"Student ID '{student_id}' is already in use")

    db.refresh(student)
    response = _serialise(student)
    response["has_face_encoding"] = face_registered or response["has_face_encoding"]
    return response


@router.get("/", response_model=List[Student])
def read_students(
    skip: int = 0,
    limit: int = 500,
    grade: Optional[str] = None,
    search: Optional[str] = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    """List students. School admins only ever see their own school."""
    if skip < 0 or limit < 1 or limit > 1000:
        raise bad_request("skip must be >= 0 and limit between 1 and 1000")

    query = db.query(StudentModel)

    if current_user.role == UserRole.SCHOOL:
        query = query.filter(StudentModel.school_id == current_user.school_id)

    if not include_inactive:
        query = query.filter(StudentModel.is_active.is_(True))

    if grade:
        query = query.filter(StudentModel.grade == validate_grade(grade, required=True))

    if clean_str(search):
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            func.lower(StudentModel.first_name).like(term)
            | func.lower(StudentModel.last_name).like(term)
            | func.lower(StudentModel.student_id).like(term)
        )

    students = (
        query.order_by(StudentModel.grade.asc(), StudentModel.first_name.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_serialise(student) for student in students]


@router.get("/{id}/photo")
def get_student_photo(
    id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    """Serve a student photo held in the database or on local disk."""
    student = db.query(StudentModel).filter(StudentModel.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    _assert_can_access(current_user, student)

    if student.photo_data:
        return StreamingResponse(
            io.BytesIO(student.photo_data),
            media_type=student.photo_mime_type or "image/jpeg",
        )

    local = photo_storage.local_path_for(student.photo_url) or (
        Path(student.photo_path) if student.photo_path and Path(student.photo_path).is_file() else None
    )
    if local is not None:
        return StreamingResponse(open(local, "rb"), media_type="image/jpeg")

    raise HTTPException(status_code=404, detail="Student has no photo")


@router.get("/{id}", response_model=Student)
def read_student(
    id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    """Get a student by ID."""
    student = db.query(StudentModel).filter(StudentModel.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    _assert_can_access(current_user, student)
    return _serialise(student)


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
    section: Optional[str] = Form(None),
    parent_name: Optional[str] = Form(None),
    parent_phone: Optional[str] = Form(None),
    is_active: Optional[bool] = Form(None),
    photo: Optional[UploadFile] = File(None),
    current_user=Depends(deps.get_current_school_admin),
):
    """Update a student. A new photo regenerates the face encoding."""
    student = db.query(StudentModel).filter(StudentModel.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    _assert_can_access(current_user, student)

    photo_bytes = None
    if photo is not None and photo.filename:
        photo_bytes = await _read_photo(photo)

    if clean_str(first_name) is not None:
        student.first_name = validate_name(first_name, "First name")
    if clean_str(last_name) is not None:
        student.last_name = validate_name(last_name, "Last name")
    if date_of_birth is not None:
        student.date_of_birth = parse_date_of_birth(date_of_birth)
    if clean_str(gender) is not None:
        student.gender = validate_gender(gender)
    if clean_str(grade) is not None:
        student.grade = validate_grade(grade, required=True)
    if section is not None:
        student.section = validate_section(section)
    if parent_name is not None:
        student.parent_name = validate_name(parent_name, "Parent name") if clean_str(parent_name) else None
    if parent_phone is not None:
        student.parent_phone = validate_phone(parent_phone, "Parent phone")
    if is_active is not None:
        student.is_active = is_active

    old_photo_url = student.photo_url

    if photo_bytes is not None:
        try:
            stored_url, local_path = photo_storage.store_student_photo(
                photo_bytes, photo.content_type, student.student_id
            )
        except Exception as exc:  # noqa: BLE001
            db.rollback()
            logger.error(f"Photo storage failed for {student.student_id}: {exc}")
            raise HTTPException(status_code=502, detail="Could not store the photo. Please try again.")

        student.photo_url = stored_url

        if local_path is not None:
            try:
                _store_encoding(db, student, local_path)
            except Exception as exc:  # noqa: BLE001
                logger.error(f"Face encoding update failed for {student.student_id}: {exc}")
            finally:
                if photo_storage.s3_configured() and stored_url.startswith("http"):
                    try:
                        os.remove(local_path)
                    except OSError:
                        pass

    db.commit()
    db.refresh(student)

    # Only drop the previous photo once the new one is safely committed.
    if photo_bytes is not None and old_photo_url and old_photo_url != student.photo_url:
        photo_storage.delete_student_photo(old_photo_url)

    return _serialise(student)


@router.post("/{id}/regenerate-encoding", status_code=status.HTTP_200_OK)
def regenerate_face_encoding(
    id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_school_admin),
):
    """Rebuild a student's face encoding from their stored photo."""
    student = db.query(StudentModel).filter(StudentModel.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    _assert_can_access(current_user, student)

    local = photo_storage.local_path_for(student.photo_url)
    if local is None and student.photo_path and Path(student.photo_path).is_file():
        local = Path(student.photo_path)

    if local is None and student.photo_url and student.photo_url.startswith("http"):
        raise bad_request(
            "The stored photo lives in S3 and is not available locally. Re-upload the photo to rebuild the encoding."
        )

    if local is None:
        raise bad_request("Student has no photo on file. Upload a photo first.")

    if not _store_encoding(db, student, local):
        db.rollback()
        raise bad_request("No face detected in the student's photo. Upload a clearer, front-facing photo.")

    db.commit()
    return {"message": "Face encoding regenerated successfully", "student_id": student.student_id}


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_school_admin),
):
    """Delete a student along with their attendance history and face encoding."""
    student = db.query(StudentModel).filter(StudentModel.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if student.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    photo_url = student.photo_url

    db.query(Attendance).filter(Attendance.student_id == id).delete(synchronize_session=False)
    db.query(FaceEncodingModel).filter(
        FaceEncodingModel.student_id == id
    ).delete(synchronize_session=False)

    db.delete(student)
    db.commit()

    # Only remove the file after the row is gone, so a storage error cannot
    # leave a student pointing at a deleted photo.
    photo_storage.delete_student_photo(photo_url)
    return None
