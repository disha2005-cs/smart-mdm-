import random
import secrets
import string
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.api import deps
from app.core.security import get_password_hash, verify_password
from app.core.validators import (
    bad_request,
    clean_str,
    validate_email,
    validate_name,
    validate_password,
    validate_phone,
)
from app.database import get_db
from app.models.school import School
from app.models.user import User, UserRole
from app.schemas.user import (
    AdminCreatedResponse,
    UserCreate,
    UserResponse,
    UserUpdate,
    UserWithSchool,
)

router = APIRouter()

PASSWORD_ALPHABET = string.ascii_letters + string.digits + "!@#$%"


# ------------------------------------------------------------------ schemas

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=8)


class ChangeEmailRequest(BaseModel):
    new_email: EmailStr
    password: str = Field(..., min_length=1)


# ------------------------------------------------------------------ helpers

def generate_employee_id(db: Session, district: str) -> str:
    """
    Generate a unique employee ID: ``SCH-KA-{DISTRICT}-{NUMBER}``.

    The serial is derived from the highest *numeric* suffix rather than a
    string sort, so SCH-KA-BEN-1000 correctly follows SCH-KA-BEN-999.
    """
    district_code = (clean_str(district) or "GEN")[:3].upper()
    prefix = f"SCH-KA-{district_code}-"

    existing_ids = [
        row[0] for row in db.query(User.employee_id).filter(User.employee_id.like(f"{prefix}%")).all()
    ]

    highest = 0
    for employee_id in existing_ids:
        suffix = employee_id[len(prefix):]
        if suffix.isdigit():
            highest = max(highest, int(suffix))

    candidate = highest + 1
    taken = set(existing_ids)
    while f"{prefix}{candidate:03d}" in taken:
        candidate += 1

    return f"{prefix}{candidate:03d}"


def generate_password(length: int = 12) -> str:
    """Generate a password that always satisfies the strength rules."""
    if length < 8:
        length = 8
    rng = secrets.SystemRandom()
    # Seed with one of each required class so the result is never rejected by
    # validate_password, then fill and shuffle.
    chars = [rng.choice(string.ascii_uppercase), rng.choice(string.ascii_lowercase),
             rng.choice(string.digits), rng.choice("!@#$%")]
    chars += [rng.choice(PASSWORD_ALPHABET) for _ in range(length - len(chars))]
    rng.shuffle(chars)
    return "".join(chars)


def _serialise(user: User) -> dict:
    return {
        "id": user.id,
        "employee_id": user.employee_id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "phone": user.phone,
        "role": user.role,
        "school_id": user.school_id,
        "designation": user.designation,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "last_login_at": user.last_login_at,
        "school_name": user.school.school_name if user.school else None,
        "school_udise": user.school.udise_code if user.school else None,
    }


# ---------------------------------------------------------------- endpoints
# NOTE: static paths are declared before "/{user_id}" so they are not
# swallowed by the path parameter.

@router.post("/generate-password")
def get_generated_password(
    current_user: User = Depends(deps.get_current_gov_admin),
):
    """Generate a random secure password."""
    return {"password": generate_password()}


@router.post("/change-password")
def change_own_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Change your own password.

    The credentials travel in the request body; they used to be query
    parameters, which put plaintext passwords into server and proxy logs.
    """
    if not verify_password(payload.current_password, current_user.password_hash):
        raise bad_request("Current password is incorrect")

    if payload.current_password == payload.new_password:
        raise bad_request("New password must be different from the current password")

    validate_password(payload.new_password, field="New password")

    current_user.password_hash = get_password_hash(payload.new_password)
    db.commit()

    return {"message": "Password changed successfully", "employee_id": current_user.employee_id}


@router.post("/change-email")
def change_own_email(
    payload: ChangeEmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Change your own email address (password confirmation required)."""
    if not verify_password(payload.password, current_user.password_hash):
        raise bad_request("Password is incorrect")

    new_email = validate_email(str(payload.new_email), required=True)

    if new_email == (current_user.email or "").lower():
        raise bad_request("New email must be different from the current email")

    existing = db.query(User).filter(
        func.lower(User.email) == new_email,
        User.id != current_user.id,
    ).first()
    if existing:
        raise bad_request("Email is already registered to another account")

    old_email = current_user.email
    current_user.email = new_email

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise bad_request("Email is already registered to another account")

    return {
        "message": "Email changed successfully",
        "employee_id": current_user.employee_id,
        "old_email": old_email,
        "new_email": new_email,
    }


@router.get("/", response_model=List[UserWithSchool])
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    role: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_gov_admin),
):
    """List users (Government Admin only)."""
    if skip < 0 or limit < 1 or limit > 500:
        raise bad_request("skip must be >= 0 and limit between 1 and 500")

    query = db.query(User)

    if clean_str(role):
        normalised = role.strip().upper()
        if normalised not in {r.value for r in UserRole}:
            raise bad_request("role must be GOVERNMENT or SCHOOL")
        query = query.filter(User.role == UserRole(normalised))

    if clean_str(search):
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            func.lower(User.first_name).like(term)
            | func.lower(User.last_name).like(term)
            | func.lower(User.email).like(term)
            | func.lower(User.employee_id).like(term)
        )

    # _serialise() reads user.school - eager load it to avoid an N+1.
    users = (
        query.options(joinedload(User.school))
        .order_by(User.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_serialise(user) for user in users]


@router.get("/{user_id}", response_model=UserWithSchool)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_gov_admin),
):
    """Get a user by ID (Government Admin only)."""
    user = db.query(User).options(joinedload(User.school)).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _serialise(user)


@router.post("/", response_model=AdminCreatedResponse, status_code=status.HTTP_201_CREATED)
def create_school_admin(
    *,
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_gov_admin),
):
    """Create a school admin (Government Admin only)."""
    first_name = validate_name(user_in.first_name, "First name")
    last_name = validate_name(user_in.last_name, "Last name")
    email = validate_email(str(user_in.email), required=True)
    phone = validate_phone(user_in.phone, "Phone number")
    validate_password(user_in.password)

    school = db.query(School).filter(School.id == user_in.school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    if not school.is_active:
        raise bad_request("Cannot assign an admin to an inactive school")

    existing_admin = db.query(User).filter(
        User.school_id == user_in.school_id,
        User.role == UserRole.SCHOOL,
    ).first()
    if existing_admin:
        raise bad_request(
            f"School already has an admin: {existing_admin.full_name} ({existing_admin.employee_id})"
        )

    if db.query(User).filter(func.lower(User.email) == email).first():
        raise bad_request("Email already registered")

    new_user = User(
        employee_id=generate_employee_id(db, school.district),
        email=email,
        password_hash=get_password_hash(user_in.password),
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        role=UserRole.SCHOOL,
        school_id=user_in.school_id,
        designation=clean_str(user_in.designation) or "School Administrator",
        is_active=True,
    )

    db.add(new_user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # Retry once: a concurrent create can take the same generated serial.
        new_user.employee_id = generate_employee_id(db, school.district)
        db.add(new_user)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise bad_request("Could not create the admin - the email or employee ID is already in use")

    db.refresh(new_user)

    return {
        "user": UserResponse.model_validate(new_user),
        "employee_id": new_user.employee_id,
        "password": user_in.password,  # shown once, never stored in plaintext
        "message": f"School admin created successfully for {school.school_name}",
    }


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    *,
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_gov_admin),
):
    """Update a user (Government Admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_in.model_dump(exclude_unset=True)
    if not update_data:
        raise bad_request("No fields to update")

    if "email" in update_data and update_data["email"] is not None:
        email = validate_email(str(update_data["email"]), required=True)
        existing = db.query(User).filter(
            func.lower(User.email) == email, User.id != user_id
        ).first()
        if existing:
            raise bad_request("Email already registered")
        user.email = email

    if "first_name" in update_data and update_data["first_name"] is not None:
        user.first_name = validate_name(update_data["first_name"], "First name")
    if "last_name" in update_data and update_data["last_name"] is not None:
        user.last_name = validate_name(update_data["last_name"], "Last name")
    if "phone" in update_data:
        user.phone = validate_phone(update_data["phone"], "Phone number")
    if "designation" in update_data:
        user.designation = clean_str(update_data["designation"])

    if "is_active" in update_data and update_data["is_active"] is not None:
        # Never let the last active government admin be locked out.
        if (
            user.role == UserRole.GOVERNMENT
            and not update_data["is_active"]
            and _active_gov_admin_count(db, exclude_id=user.id) == 0
        ):
            raise bad_request("Cannot deactivate the only active government admin")
        user.is_active = update_data["is_active"]

    password = update_data.get("password")
    if password is not None and password.strip():
        validate_password(password)
        user.password_hash = get_password_hash(password)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise bad_request("Email already registered")

    db.refresh(user)
    return user


@router.post("/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_gov_admin),
):
    """Reset another user's password (Government Admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    validate_password(payload.new_password, field="New password")

    user.password_hash = get_password_hash(payload.new_password)
    db.commit()

    return {
        "message": "Password reset successfully",
        "employee_id": user.employee_id,
        "new_password": payload.new_password,
    }


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_gov_admin),
):
    """Delete a user (Government Admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id:
        raise bad_request("Cannot delete your own account")

    if user.role == UserRole.GOVERNMENT and _active_gov_admin_count(db, exclude_id=user.id) == 0:
        raise bad_request("Cannot delete the only active government admin")

    db.delete(user)
    db.commit()
    return None


def _active_gov_admin_count(db: Session, exclude_id: Optional[int] = None) -> int:
    query = db.query(func.count(User.id)).filter(
        User.role == UserRole.GOVERNMENT,
        User.is_active.is_(True),
    )
    if exclude_id is not None:
        query = query.filter(User.id != exclude_id)
    return query.scalar() or 0
