from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, require_admin
from app.core.database import get_db
from app.models.enums import NotificationStatus, UserRole
from app.models.notification import Notification
from app.models.user import User
from app.schemas import (
    AssignedConsultant,
    CreatedResponse,
    MessageResponse,
    NotificationClient,
    NotificationCreate,
    NotificationItem,
    NotificationListResponse,
    Pagination,
)
from app.services import ensure_client_access, validate_consultant


router = APIRouter(prefix="/notifications", tags=["notifications"])


def notification_item(notification: Notification) -> NotificationItem:
    return NotificationItem(
        id=notification.id,
        message=notification.message,
        status=notification.status,
        client=NotificationClient.model_validate(notification.client) if notification.client else None,
        sender=AssignedConsultant.model_validate(notification.sender),
        receiver=AssignedConsultant.model_validate(notification.receiver),
        created_at=notification.created_at,
    )


@router.post("", response_model=CreatedResponse, status_code=201)
def create_notification(
    payload: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> CreatedResponse:
    validate_consultant(db, payload.receiver_id)
    if payload.client_id is not None:
        client = ensure_client_access(db, current_user, payload.client_id)
        if client.assigned_consultant_id != payload.receiver_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Notification receiver must own the related client",
            )

    notification = Notification(
        sender_id=current_user.id,
        receiver_id=payload.receiver_id,
        client_id=payload.client_id,
        message=payload.message,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return CreatedResponse(id=notification.id, message="Notification sent successfully")


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    status_filter: NotificationStatus | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationListResponse:
    query = (
        select(Notification)
        .options(
            selectinload(Notification.sender),
            selectinload(Notification.receiver),
            selectinload(Notification.client),
        )
        .order_by(Notification.created_at.desc(), Notification.id.desc())
    )
    if current_user.role == UserRole.admin:
        query = query.where(
            (Notification.receiver_id == current_user.id) | (Notification.sender_id == current_user.id)
        )
    else:
        query = query.where(Notification.receiver_id == current_user.id)
    if status_filter is not None:
        query = query.where(Notification.status == status_filter)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    notifications = db.scalars(query.offset((page - 1) * limit).limit(limit)).all()
    return NotificationListResponse(
        data=[notification_item(item) for item in notifications],
        pagination=Pagination(page=page, limit=limit, total=total),
    )


@router.put("/{notification_id}/read", response_model=MessageResponse)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    notification = db.get(Notification, notification_id)
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if notification.receiver_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Notification access denied")

    notification.status = NotificationStatus.read
    db.commit()
    return MessageResponse(message="Notification marked as read")
