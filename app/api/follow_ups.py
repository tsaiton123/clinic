from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.enums import Stage
from app.models.follow_up_log import FollowUpLog
from app.models.user import User
from app.schemas import (
    AssignedConsultant,
    CreatedResponse,
    FollowUpCreate,
    FollowUpDueItem,
    FollowUpDueResponse,
    FollowUpItem,
    FollowUpResponse,
    FollowUpUpdate,
    MessageResponse,
)
from app.services import days_overdue, ensure_client_access, latest_follow_up_rows


router = APIRouter(tags=["follow-ups"])


@router.post("/clients/{client_id}/follow-ups", response_model=CreatedResponse, status_code=201)
def create_follow_up(
    client_id: int,
    payload: FollowUpCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CreatedResponse:
    client = ensure_client_access(db, current_user, client_id)
    follow_up = FollowUpLog(
        client_id=client.id,
        consultant_id=current_user.id,
        **payload.model_dump(),
    )
    db.add(follow_up)
    db.commit()
    db.refresh(follow_up)
    return CreatedResponse(id=follow_up.id, message="Follow-up created successfully")


@router.get("/clients/{client_id}/follow-ups", response_model=FollowUpResponse)
def list_follow_ups(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FollowUpResponse:
    ensure_client_access(db, current_user, client_id)
    logs = db.scalars(
        select(FollowUpLog)
        .options(selectinload(FollowUpLog.consultant))
        .where(FollowUpLog.client_id == client_id)
        .order_by(FollowUpLog.created_at.desc(), FollowUpLog.id.desc())
    ).all()
    return FollowUpResponse(
        data=[
            FollowUpItem(
                id=log.id,
                contact_method=log.contact_method,
                content=log.content,
                client_response=log.client_response,
                next_action=log.next_action,
                next_follow_up_at=log.next_follow_up_at,
                need_admin_support=log.need_admin_support,
                created_by=AssignedConsultant.model_validate(log.consultant),
                created_at=log.created_at,
            )
            for log in logs
        ]
    )


@router.put("/follow-ups/{follow_up_id}", response_model=MessageResponse)
def update_follow_up(
    follow_up_id: int,
    payload: FollowUpUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    follow_up = db.scalar(
        select(FollowUpLog)
        .options(selectinload(FollowUpLog.client))
        .where(FollowUpLog.id == follow_up_id)
    )
    if follow_up is None:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    ensure_client_access(db, current_user, follow_up.client_id)
    for key, value in payload.model_dump().items():
        setattr(follow_up, key, value)
    db.commit()
    return MessageResponse(message="Follow-up updated successfully")


@router.get("/follow-ups/today", response_model=FollowUpDueResponse)
def today_follow_ups(
    consultant_id: int | None = None,
    stage: Stage | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FollowUpDueResponse:
    today = datetime.now(UTC).date()
    rows = latest_follow_up_rows(db, current_user, consultant_id=consultant_id, stage=stage)
    items: list[FollowUpDueItem] = []
    for client, log in rows:
        if log.next_follow_up_at is None:
            continue
        due_at = log.next_follow_up_at
        if due_at.tzinfo is None:
            due_at = due_at.replace(tzinfo=UTC)
        if due_at.date() == today:
            items.append(
                FollowUpDueItem(
                    client_id=client.id,
                    client_name=client.name,
                    current_stage=client.current_stage,
                    assigned_consultant=AssignedConsultant.model_validate(client.assigned_consultant),
                    next_follow_up_at=log.next_follow_up_at,
                    last_follow_up_at=log.created_at,
                )
            )
    return FollowUpDueResponse(data=items)


@router.get("/follow-ups/overdue", response_model=FollowUpDueResponse)
def overdue_follow_ups(
    consultant_id: int | None = None,
    days: int = Query(default=0, ge=0),
    stage: Stage | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FollowUpDueResponse:
    now = datetime.now(UTC)
    rows = latest_follow_up_rows(db, current_user, consultant_id=consultant_id, stage=stage)
    items: list[FollowUpDueItem] = []
    for client, log in rows:
        if log.next_follow_up_at is None:
            continue
        due_at = log.next_follow_up_at
        if due_at.tzinfo is None:
            due_at = due_at.replace(tzinfo=UTC)
        overdue_days = days_overdue(due_at, now)
        if due_at < now and overdue_days >= days:
            items.append(
                FollowUpDueItem(
                    client_id=client.id,
                    client_name=client.name,
                    current_stage=client.current_stage,
                    assigned_consultant=AssignedConsultant.model_validate(client.assigned_consultant),
                    next_follow_up_at=log.next_follow_up_at,
                    last_follow_up_at=log.created_at,
                    overdue_days=overdue_days,
                )
            )
    return FollowUpDueResponse(data=items)
