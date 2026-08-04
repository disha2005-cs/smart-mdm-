from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.schemas.admin import AdminLogin
from app.schemas.token import Token
from app.models.admin import GovernmentAdmin, SchoolAdmin
from app.core.security import verify_password, create_access_token
from app.api import deps

router = APIRouter()

@router.post("/login", response_model=Token)
def login_access_token(form_data: AdminLogin, db: Session = Depends(get_db)):
    if form_data is None:
        raise HTTPException(status_code=400, detail="Missing login data")
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = None
    if form_data.role == "GOVERNMENT":
        user = db.query(GovernmentAdmin).filter(GovernmentAdmin.employee_id == form_data.employee_id).first()
    elif form_data.role == "SCHOOL":
        user = db.query(SchoolAdmin).filter(SchoolAdmin.employee_id == form_data.employee_id).first()
    else:
        raise HTTPException(status_code=400, detail="Invalid role specified")

    if not user:
        raise HTTPException(status_code=400, detail="Incorrect employee ID or password")
    
    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect employee ID or password")
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token = create_access_token(subject=user.employee_id, role=form_data.role)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": form_data.role
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
        "role": current_user.role
    }
    
    # Add school_id for School Admins
    if current_user.role == "SCHOOL" and hasattr(current_user, 'school_id'):
        response["school_id"] = current_user.school_id
    
    return response
