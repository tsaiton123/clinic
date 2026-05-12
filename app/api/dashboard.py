from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.clients import client_list_item
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.client import Client
from app.models.enums import ClientStatus, NotificationStatus, Stage, UserRole
from app.models.notification import Notification
from app.models.user import User
from app.schemas import (
    AssignedConsultant,
    ConsultantDashboardResponse,
    FollowUpDueItem,
    NotificationClient,
    NotificationItem,
)
from app.services import days_overdue, latest_follow_up_for_client, validate_consultant


router = APIRouter(prefix="/dashboard", tags=["dashboard"])

STAGE_ORDER = [Stage.S1, Stage.S2, Stage.S3, Stage.S4, Stage.S5, Stage.S6]


def resolve_consultant(
    db: Session,
    current_user: User,
    consultant_id: int | None,
) -> User:
    if current_user.role == UserRole.consultant:
        if consultant_id is not None and consultant_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Consultant dashboard access denied",
            )
        return current_user

    if consultant_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="consultant_id is required for admin dashboard lookup",
        )
    return validate_consultant(db, consultant_id)


def normalize(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def due_item(client: Client) -> FollowUpDueItem | None:
    latest = getattr(client, "_dashboard_latest_follow_up", None)
    if latest is None or latest.next_follow_up_at is None:
        return None
    return FollowUpDueItem(
        client_id=client.id,
        client_name=client.name,
        current_stage=client.current_stage,
        assigned_consultant=AssignedConsultant.model_validate(client.assigned_consultant),
        next_follow_up_at=latest.next_follow_up_at,
        last_follow_up_at=latest.created_at,
        overdue_days=days_overdue(normalize(latest.next_follow_up_at)),
    )


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


@router.get("/consultant", response_model=ConsultantDashboardResponse)
def consultant_dashboard(
    consultant_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConsultantDashboardResponse:
    consultant = resolve_consultant(db, current_user, consultant_id)
    clients = db.scalars(
        select(Client)
        .options(selectinload(Client.assigned_consultant))
        .where(
            Client.assigned_consultant_id == consultant.id,
            Client.client_status != ClientStatus.archived,
        )
        .order_by(Client.created_at.desc(), Client.id.desc())
    ).all()

    today = datetime.now(UTC).date()
    today_followups: list[FollowUpDueItem] = []
    overdue_followups: list[FollowUpDueItem] = []
    distribution = {stage.value: 0 for stage in STAGE_ORDER}

    for client in clients:
        distribution[client.current_stage.value] += 1
        latest = latest_follow_up_for_client(db, client.id)
        setattr(client, "_dashboard_latest_follow_up", latest)
        item = due_item(client)
        if item is None:
            continue
        due_at = normalize(item.next_follow_up_at)
        if due_at.date() == today:
            item.overdue_days = None
            today_followups.append(item)
        elif due_at < datetime.now(UTC):
            overdue_followups.append(item)

    recent_clients = [client_list_item(db, client) for client in clients[:5]]
    upcoming_s6_clients = [
        client_list_item(db, client)
        for client in clients
        if client.current_stage == Stage.S5
    ][:5]

    notifications = db.scalars(
        select(Notification)
        .options(
            selectinload(Notification.sender),
            selectinload(Notification.receiver),
            selectinload(Notification.client),
        )
        .where(
            Notification.receiver_id == consultant.id,
            Notification.status == NotificationStatus.unread,
        )
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .limit(5)
    ).all()

    return ConsultantDashboardResponse(
        consultant=AssignedConsultant.model_validate(consultant),
        today_followups=sorted(today_followups, key=lambda item: item.next_follow_up_at),
        overdue_followups=sorted(overdue_followups, key=lambda item: item.next_follow_up_at),
        recent_clients=recent_clients,
        upcoming_s6_clients=upcoming_s6_clients,
        unread_notifications=[notification_item(item) for item in notifications],
        stage_distribution=distribution,
    )
