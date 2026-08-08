from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.config import settings
from app.core import security
from app.schemas.token import TokenPayload
from app.models.user import User, UserRole

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
        
    # Find user by employee_id
    user = db.query(User).filter(User.employee_id == token_data.sub).first()
        
    if user is None or not user.is_active:
        raise credentials_exception
    
    # Verify role matches token
    if user.role.value != token_data.role:
        raise credentials_exception
    
    return user

def get_current_gov_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.GOVERNMENT:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

def get_current_school_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.SCHOOL:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user
