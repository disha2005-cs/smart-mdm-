from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.schemas.admin import AdminLogin
from app.schemas.token import Token
from app.models.user import User, UserRole
from app.core.security import verify_password, create_access_token
from app.api import deps

router = APIRouter()

@router.post("/login", response_model=Token)
def login_access_token(form_data: AdminLogin, db: Session = Depends(get_db)):
    if form_data is None:
        raise HTTPException(status_code=400, detail="Missing login data")
    """
    OAuth2 compatible token login, get an access token for future requests.
    Supports login with either employee_id or email.
    """
    # Try to find user by employee_id first, then by email
    user = db.query(User).filter(User.employee_id == form_data.employee_id).first()
    
    if not user:
        # If not found by employee_id, try email
        user = db.query(User).filter(User.email == form_data.employee_id).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect credentials")
    
    # Verify role matches
    if user.role.value != form_data.role:
        raise HTTPException(status_code=400, detail="Invalid role for this user")
    
    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect credentials")
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account")
    
    # For school admins, check if school exists and is active
    if user.role == UserRole.SCHOOL:
        if not user.school_id:
            raise HTTPException(status_code=400, detail="No school assigned to this account")
        
        if not user.school:
            raise HTTPException(status_code=400, detail="Associated school not found. Please contact administrator.")
        
        if not user.school.is_active:
            raise HTTPException(status_code=400, detail="School is inactive. Please contact administrator.")

    # Update last login
    user.last_login_at = datetime.utcnow()
    db.commit()

    access_token = create_access_token(subject=user.employee_id, role=user.role.value)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role.value
    }

@router.get("/me")
def read_users_me(current_user = Depends(deps.get_current_user)):
    """
    Get current user details.
    """
    response = {
        "employee_id": current_user.employee_id,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "email": current_user.email,
        "role": current_user.role.value
    }
    
    # Add school_id for School Admins
    if current_user.role == UserRole.SCHOOL and current_user.school_id:
        response["school_id"] = current_user.school_id
    
    return response
