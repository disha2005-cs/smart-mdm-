from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
import random
import string

from app.api import deps
from app.database import get_db
from app.models.user import User, UserRole
from app.models.school import School
from app.schemas.user import UserCreate, UserResponse, UserWithSchool, AdminCreatedResponse
from app.core.security import get_password_hash

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def generate_employee_id(db: Session, district: str) -> str:
    """Generate unique employee ID for school admin: SCH-KA-{DISTRICT}-{NUMBER}"""
    # Get district code (first 3 letters)
    district_code = district[:3].upper()
    
    # Find highest number for this district
    prefix = f"SCH-KA-{district_code}-"
    existing = db.query(User).filter(
        User.employee_id.like(f"{prefix}%")
    ).order_by(User.employee_id.desc()).first()
    
    if existing:
        try:
            last_num = int(existing.employee_id.split('-')[-1])
            new_num = last_num + 1
        except:
            new_num = 1
    else:
        new_num = 1
    
    return f"{prefix}{new_num:03d}"

def generate_password(length: int = 12) -> str:
    """Generate a secure random password"""
    characters = string.ascii_letters + string.digits + "!@#$%"
    return ''.join(random.choice(characters) for i in range(length))

@router.get("/", response_model=List[UserWithSchool])
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    role: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_gov_admin)
):
    """Get all users (Government Admin only)"""
    query = db.query(User)
    
    if role:
        if role.upper() == "SCHOOL":
            query = query.filter(User.role == UserRole.SCHOOL)
        elif role.upper() == "GOVERNMENT":
            query = query.filter(User.role == UserRole.GOVERNMENT)
    
    users = query.offset(skip).limit(limit).all()
    
    # Enrich with school info
    result = []
    for user in users:
        user_dict = {
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
            "school_name": user.school.school_name if user.school else None,
            "school_udise": user.school.udise_code if user.school else None
        }
        result.append(user_dict)
    
    return result

@router.get("/{user_id}", response_model=UserWithSchool)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_gov_admin)
):
    """Get user by ID (Government Admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
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
        "school_name": user.school.school_name if user.school else None,
        "school_udise": user.school.udise_code if user.school else None
    }

@router.post("/", response_model=AdminCreatedResponse, status_code=status.HTTP_201_CREATED)
def create_school_admin(
    *,
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_gov_admin)
):
    """Create a new school admin (Government Admin only)"""
    
    # Verify school exists
    school = db.query(School).filter(School.id == user_in.school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    # Check if school already has an admin
    existing_admin = db.query(User).filter(
        User.school_id == user_in.school_id,
        User.role == UserRole.SCHOOL
    ).first()
    if existing_admin:
        raise HTTPException(
            status_code=400, 
            detail=f"School already has an admin: {existing_admin.full_name} ({existing_admin.employee_id})"
        )
    
    # Check if email already exists
    existing_email = db.query(User).filter(User.email == user_in.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate employee ID
    employee_id = generate_employee_id(db, school.district)
    
    # Hash password
    hashed_password = get_password_hash(user_in.password)
    
    # Create user
    new_user = User(
        employee_id=employee_id,
        email=user_in.email,
        password_hash=hashed_password,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        phone=user_in.phone,
        role=UserRole.SCHOOL,
        school_id=user_in.school_id,
        designation=user_in.designation or "School Administrator",
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        "user": UserResponse(
            id=new_user.id,
            employee_id=new_user.employee_id,
            email=new_user.email,
            first_name=new_user.first_name,
            last_name=new_user.last_name,
            phone=new_user.phone,
            role=new_user.role,
            school_id=new_user.school_id,
            designation=new_user.designation,
            is_active=new_user.is_active,
            created_at=new_user.created_at
        ),
        "employee_id": employee_id,
        "password": user_in.password,  # Return plain password once
        "message": f"School admin created successfully for {school.school_name}"
    }

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    *,
    user_id: int,
    first_name: str = None,
    last_name: str = None,
    email: str = None,
    phone: str = None,
    password: str = None,
    designation: str = None,
    is_active: bool = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_gov_admin)
):
    """Update user (Government Admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update fields
    if first_name is not None:
        user.first_name = first_name
    if last_name is not None:
        user.last_name = last_name
    if email is not None:
        # Check if email is already taken by another user
        existing = db.query(User).filter(User.email == email, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        user.email = email
    if phone is not None:
        user.phone = phone
    if password is not None and password.strip():
        # Update password if provided
        user.password_hash = get_password_hash(password)
    if designation is not None:
        user.designation = designation
    if is_active is not None:
        user.is_active = is_active
    
    db.commit()
    db.refresh(user)
    
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_gov_admin)
):
    """Delete user (Government Admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Don't allow deleting yourself
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    db.delete(user)
    db.commit()
    return None

@router.post("/generate-password")
def get_generated_password(
    current_user: User = Depends(deps.get_current_gov_admin)
):
    """Generate a random secure password"""
    return {"password": generate_password()}

@router.post("/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    new_password: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_gov_admin)
):
    """Reset user password (Government Admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.password_hash = get_password_hash(new_password)
    db.commit()
    
    return {
        "message": "Password reset successfully",
        "employee_id": user.employee_id,
        "new_password": new_password
    }

@router.post("/change-password")
def change_own_password(
    current_password: str,
    new_password: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Change own password (Any authenticated user)"""
    from app.core.security import verify_password
    
    # Verify current password
    if not verify_password(current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Check new password strength (minimum 6 characters)
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    
    # Update password
    current_user.password_hash = get_password_hash(new_password)
    db.commit()
    
    return {
        "message": "Password changed successfully",
        "employee_id": current_user.employee_id
    }

@router.post("/change-email")
def change_own_email(
    new_email: str,
    password: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Change own email (Any authenticated user)"""
    from app.core.security import verify_password
    
    # Verify password for security
    if not verify_password(password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Password is incorrect")
    
    # Check if email is already taken by another user
    existing_user = db.query(User).filter(
        User.email == new_email,
        User.id != current_user.id
    ).first()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Email is already registered to another account")
    
    # Validate email format
    import re
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, new_email):
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    # Update email
    old_email = current_user.email
    current_user.email = new_email
    db.commit()
    
    return {
        "message": "Email changed successfully",
        "employee_id": current_user.employee_id,
        "old_email": old_email,
        "new_email": new_email
    }
