from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import create_access_token, verify_password
from app.models.enums import UserStatus
from app.models.user import User
from app.schemas import LoginRequest, LoginResponse, TokenUser


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if (
        user is None
        or user.status != UserStatus.active
        or not verify_password(payload.password, user.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return LoginResponse(token=create_access_token(str(user.id)), user=TokenUser.model_validate(user))


@router.post("/logout")
def logout() -> dict[str, str]:
    return {"message": "Logout success"}


@router.get("/me", response_model=TokenUser)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
