from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.stage_log import StageLog
from app.models.user import User
from app.schemas import AssignedConsultant, StageLogItem, StageLogResponse, StageUpdate, StageUpdateResponse
from app.services import ensure_client_access


router = APIRouter(prefix="/clients", tags=["stage"])


@router.post("/{client_id}/stage", response_model=StageUpdateResponse)
def update_stage(
    client_id: int,
    payload: StageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StageUpdateResponse:
    client = ensure_client_access(db, current_user, client_id)
    from_stage = client.current_stage
    client.current_stage = payload.to_stage
    db.add(
        StageLog(
            client_id=client.id,
            from_stage=from_stage,
            to_stage=payload.to_stage,
            changed_by=current_user.id,
            reason=payload.reason,
            note=payload.note,
        )
    )
    db.commit()
    return StageUpdateResponse(
        message="Stage updated successfully",
        client_id=client.id,
        from_stage=from_stage,
        to_stage=payload.to_stage,
    )


@router.get("/{client_id}/stage-logs", response_model=StageLogResponse)
def list_stage_logs(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StageLogResponse:
    ensure_client_access(db, current_user, client_id)
    logs = db.scalars(
        select(StageLog)
        .options(selectinload(StageLog.changed_by_user))
        .where(StageLog.client_id == client_id)
        .order_by(StageLog.created_at.desc(), StageLog.id.desc())
    ).all()
    return StageLogResponse(
        data=[
            StageLogItem(
                id=log.id,
                from_stage=log.from_stage,
                to_stage=log.to_stage,
                changed_by=AssignedConsultant.model_validate(log.changed_by_user),
                reason=log.reason,
                note=log.note,
                created_at=log.created_at,
            )
            for log in logs
        ]
    )
