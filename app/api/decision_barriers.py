from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.decision_barrier import DecisionBarrier
from app.models.enums import UserRole
from app.models.user import User
from app.schemas import (
    BarrierAnalyticsItem,
    BarrierAnalyticsResponse,
    CreatedResponse,
    DecisionBarrierCreate,
    DecisionBarrierItem,
    DecisionBarrierResponse,
    DecisionBarrierUpdate,
    MessageResponse,
)
from app.services import ensure_client_access


router = APIRouter(tags=["decision-barriers"])


@router.post("/clients/{client_id}/barriers", response_model=CreatedResponse, status_code=201)
def create_barrier(
    client_id: int,
    payload: DecisionBarrierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CreatedResponse:
    client = ensure_client_access(db, current_user, client_id)
    barrier = DecisionBarrier(client_id=client.id, **payload.model_dump())
    db.add(barrier)
    db.commit()
    db.refresh(barrier)
    return CreatedResponse(id=barrier.id, message="Decision barrier created successfully")


@router.get("/clients/{client_id}/barriers", response_model=DecisionBarrierResponse)
def list_client_barriers(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DecisionBarrierResponse:
    ensure_client_access(db, current_user, client_id)
    barriers = db.scalars(
        select(DecisionBarrier)
        .where(DecisionBarrier.client_id == client_id)
        .order_by(DecisionBarrier.created_at.desc(), DecisionBarrier.id.desc())
    ).all()
    return DecisionBarrierResponse(data=[DecisionBarrierItem.model_validate(item) for item in barriers])


@router.put("/barriers/{barrier_id}", response_model=MessageResponse)
def update_barrier(
    barrier_id: int,
    payload: DecisionBarrierUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    barrier = db.get(DecisionBarrier, barrier_id)
    if barrier is None:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decision barrier not found")

    ensure_client_access(db, current_user, barrier.client_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(barrier, key, value)
    db.commit()
    return MessageResponse(message="Decision barrier updated successfully")


@router.get("/analytics/barriers", response_model=BarrierAnalyticsResponse)
def barrier_analytics(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    consultant_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BarrierAnalyticsResponse:
    query = select(DecisionBarrier.barrier_type, func.count(DecisionBarrier.id)).join(
        DecisionBarrier.client
    )
    if current_user.role == UserRole.consultant:
        query = query.where(DecisionBarrier.client.has(assigned_consultant_id=current_user.id))
    elif consultant_id is not None:
        query = query.where(DecisionBarrier.client.has(assigned_consultant_id=consultant_id))
    if start_date is not None:
        query = query.where(DecisionBarrier.created_at >= start_date)
    if end_date is not None:
        query = query.where(DecisionBarrier.created_at <= end_date)

    rows = db.execute(query.group_by(DecisionBarrier.barrier_type)).all()
    total = sum(count for _, count in rows)
    data = [
        BarrierAnalyticsItem(
            barrier_type=barrier_type,
            count=count,
            percentage=round((count / total) * 100, 1) if total else 0.0,
        )
        for barrier_type, count in rows
    ]
    return BarrierAnalyticsResponse(data=data)
