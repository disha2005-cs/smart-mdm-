from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.token import TokenPayload

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        token_data = TokenPayload(**payload)
    except (JWTError, ValidationError):
        # A malformed payload used to escape as a 500; both cases are simply
        # "this token is not usable".
        raise CREDENTIALS_EXCEPTION

    if not token_data.sub or not token_data.role:
        raise CREDENTIALS_EXCEPTION

    user = db.query(User).filter(User.employee_id == token_data.sub).first()

    if user is None or not user.is_active:
        raise CREDENTIALS_EXCEPTION

    # The role is baked into the token; if the account's role has since been
    # changed the old token must stop working.
    if user.role.value != token_data.role:
        raise CREDENTIALS_EXCEPTION

    return user


def get_current_gov_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.GOVERNMENT:
        raise HTTPException(status_code=403, detail="Government administrator access required")
    return current_user


def get_current_school_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.SCHOOL:
        raise HTTPException(status_code=403, detail="School administrator access required")
    # Every school endpoint scopes its queries by this value, so a school admin
    # without a school must be rejected rather than allowed through with None.
    if not current_user.school_id:
        raise HTTPException(
            status_code=403,
            detail="No school is assigned to this account. Please contact your administrator.",
        )
    return current_user
