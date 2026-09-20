from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api import deps
from app.core.security import create_access_token, verify_password
from app.core.validators import clean_str
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.admin import AdminLogin
from app.schemas.token import Token

router = APIRouter()

# One message for every credential failure: distinguishing "no such user" from
# "wrong password" would let anyone enumerate valid employee IDs.
INVALID_CREDENTIALS = "Incorrect employee ID, email or password"


@router.post("/login", response_model=Token)
def login_access_token(form_data: AdminLogin, db: Session = Depends(get_db)):
    """
    Log in with either an employee ID or an email address.

    The requested role must match the account's role, which keeps the two
    portals separate.
    """
    identifier = clean_str(form_data.employee_id)
    if not identifier or not form_data.password:
        raise HTTPException(status_code=400, detail="Employee ID/email and password are required")

    requested_role = (clean_str(form_data.role) or "").upper()
    if requested_role not in {role.value for role in UserRole}:
        raise HTTPException(status_code=400, detail="Role must be GOVERNMENT or SCHOOL")

    user = db.query(User).filter(
        func.lower(User.employee_id) == identifier.lower()
    ).first()

    if not user:
        user = db.query(User).filter(func.lower(User.email) == identifier.lower()).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail=INVALID_CREDENTIALS)

    if user.role.value != requested_role:
        raise HTTPException(
            status_code=400,
            detail=f"This account is a {user.role.value.title()} account. Use the {user.role.value.title()} portal.",
        )

    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been deactivated. Contact your administrator.")

    if user.role == UserRole.SCHOOL:
        if not user.school_id or not user.school:
            raise HTTPException(
                status_code=403,
                detail="No school is assigned to this account. Please contact the administrator.",
            )
        if not user.school.is_active:
            raise HTTPException(
                status_code=403,
                detail="This school is inactive. Please contact the administrator.",
            )

    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    access_token = create_access_token(subject=user.employee_id, role=user.role.value)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role.value,
    }


@router.get("/me")
def read_users_me(current_user: User = Depends(deps.get_current_user)):
    """Get the authenticated user's profile."""
    response = {
        "id": current_user.id,
        "employee_id": current_user.employee_id,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "designation": current_user.designation,
        "role": current_user.role.value,
        "school_id": current_user.school_id,
        "last_login_at": current_user.last_login_at.isoformat() if current_user.last_login_at else None,
    }

    if current_user.role == UserRole.SCHOOL and current_user.school:
        response["school"] = {
            "id": current_user.school.id,
            "name": current_user.school.school_name,
            "udise_code": current_user.school.udise_code,
            "district": current_user.school.district,
        }

    return response
