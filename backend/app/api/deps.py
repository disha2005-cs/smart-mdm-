from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.config import settings
from app.core import security
from app.schemas.token import TokenPayload
from app.models.admin import GovernmentAdmin, SchoolAdmin

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        token_data = TokenPayload(**payload)
        if token_data.sub is None or token_data.role is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = None
    if token_data.role == "GOVERNMENT":
        user = db.query(GovernmentAdmin).filter(GovernmentAdmin.employee_id == token_data.sub).first()
    elif token_data.role == "SCHOOL":
        user = db.query(SchoolAdmin).filter(SchoolAdmin.employee_id == token_data.sub).first()
        
    if user is None or not user.is_active:
        raise credentials_exception
    
    # Attach role to user object for downstream authorization
    user.role = token_data.role
    return user

def get_current_gov_admin(current_user = Depends(get_current_user)):
    if current_user.role != "GOVERNMENT":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

def get_current_school_admin(current_user = Depends(get_current_user)):
    if current_user.role != "SCHOOL":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user
