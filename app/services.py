from datetime import UTC, date, datetime

from fastapi import HTTPException, status
from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.client import Client
from app.models.enums import ClientStatus, Stage, UserRole
from app.models.follow_up_log import FollowUpLog
from app.models.stage_log import StageLog
from app.models.user import User


def ensure_client_access(db: Session, current_user: User, client_id: int) -> Client:
    client = db.scalar(
        select(Client)
        .options(selectinload(Client.assigned_consultant))
        .where(Client.id == client_id)
    )
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    if (
        current_user.role == UserRole.consultant
        and client.assigned_consultant_id != current_user.id
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Client access denied")
    return client


def validate_consultant(db: Session, consultant_id: int) -> User:
    consultant = db.get(User, consultant_id)
    if consultant is None or consultant.role != UserRole.consultant:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid consultant")
    return consultant


def scoped_clients_query(current_user: User) -> Select[tuple[Client]]:
    query = select(Client).options(selectinload(Client.assigned_consultant))
    if current_user.role == UserRole.consultant:
        query = query.where(Client.assigned_consultant_id == current_user.id)
    return query


def apply_client_filters(
    query: Select[tuple[Client]],
    *,
    consultant_id: int | None = None,
    stage: Stage | None = None,
    status_: ClientStatus | None = None,
    source: str | None = None,
    keyword: str | None = None,
) -> Select[tuple[Client]]:
    if consultant_id is not None:
        query = query.where(Client.assigned_consultant_id == consultant_id)
    if stage is not None:
        query = query.where(Client.current_stage == stage)
    if status_ is not None:
        query = query.where(Client.client_status == status_)
    else:
        query = query.where(Client.client_status != ClientStatus.archived)
    if source:
        query = query.where(Client.source == source)
    if keyword:
        pattern = f"%{keyword}%"
        query = query.where(
            or_(Client.name.ilike(pattern), Client.phone.ilike(pattern), Client.line_id.ilike(pattern))
        )
    return query


def latest_follow_up_for_client(db: Session, client_id: int) -> FollowUpLog | None:
    return db.scalar(
        select(FollowUpLog)
        .where(FollowUpLog.client_id == client_id)
        .order_by(FollowUpLog.next_follow_up_at.desc().nullslast(), FollowUpLog.created_at.desc())
        .limit(1)
    )


def latest_follow_up_rows(
    db: Session,
    current_user: User,
    *,
    consultant_id: int | None = None,
    stage: Stage | None = None,
) -> list[tuple[Client, FollowUpLog]]:
    subquery = (
        select(FollowUpLog.client_id, func.max(FollowUpLog.created_at).label("latest_created_at"))
        .group_by(FollowUpLog.client_id)
        .subquery()
    )
    query = (
        select(Client, FollowUpLog)
        .join(FollowUpLog, FollowUpLog.client_id == Client.id)
        .join(
            subquery,
            (subquery.c.client_id == FollowUpLog.client_id)
            & (subquery.c.latest_created_at == FollowUpLog.created_at),
        )
        .options(selectinload(Client.assigned_consultant))
        .where(Client.client_status != ClientStatus.archived)
    )
    if current_user.role == UserRole.consultant:
        query = query.where(Client.assigned_consultant_id == current_user.id)
    if consultant_id is not None:
        query = query.where(Client.assigned_consultant_id == consultant_id)
    if stage is not None:
        query = query.where(Client.current_stage == stage)
    return list(db.execute(query).all())


def days_overdue(due_at: datetime, now: datetime | None = None) -> int:
    now = now or datetime.now(UTC)
    if due_at.tzinfo is None:
        due_at = due_at.replace(tzinfo=UTC)
    return max((now.date() - due_at.date()).days, 0)


def calculate_age(birth_date: date, today: date | None = None) -> int:
    today = today or datetime.now(UTC).date()
    years = today.year - birth_date.year
    if (today.month, today.day) < (birth_date.month, birth_date.day):
        years -= 1
    return max(years, 0)
