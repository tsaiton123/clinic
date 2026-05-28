from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.core.database import get_db
from app.core.security import hash_password
from app.models.enums import UserRole, UserStatus
from app.models.user import User
from app.schemas import (
    CreatedResponse,
    ManagedUserItem,
    MessageResponse,
    UserCreate,
    UserListResponse,
    UserPasswordReset,
    UserUpdate,
)


router = APIRouter(prefix="/users", tags=["users"])


def get_managed_user(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def ensure_email_available(db: Session, email: str, exclude_user_id: int | None = None) -> None:
    query = select(User).where(User.email == email)
    if exclude_user_id is not None:
        query = query.where(User.id != exclude_user_id)
    if db.scalar(query) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")


@router.get("", response_model=UserListResponse)
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> UserListResponse:
    users = db.scalars(select(User).order_by(User.created_at.asc(), User.id.asc())).all()
    return UserListResponse(data=[ManagedUserItem.model_validate(user) for user in users])


@router.post("", response_model=CreatedResponse, status_code=201)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> CreatedResponse:
    ensure_email_available(db, payload.email)
    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        status=payload.status,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return CreatedResponse(id=user.id, message="User created successfully")


@router.put("/{user_id}", response_model=MessageResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")

    user = get_managed_user(db, user_id)
    update_data = payload.model_dump(exclude_unset=True)
    if "email" in update_data:
        ensure_email_available(db, update_data["email"], exclude_user_id=user.id)
    if user.id == current_user.id:
        if update_data.get("status") == UserStatus.inactive:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate current admin")
        if update_data.get("role") == UserRole.consultant:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot change current admin role")
    for key, value in update_data.items():
        setattr(user, key, value)
    db.commit()
    return MessageResponse(message="User updated successfully")


@router.put("/{user_id}/password", response_model=MessageResponse)
def reset_user_password(
    user_id: int,
    payload: UserPasswordReset,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> MessageResponse:
    user = get_managed_user(db, user_id)
    user.password_hash = hash_password(payload.password)
    db.commit()
    return MessageResponse(message="Password reset successfully")
