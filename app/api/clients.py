from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.client import Client
from app.models.enums import ClientStatus, Stage, UserRole
from app.models.follow_up_log import FollowUpLog
from app.models.stage_log import StageLog
from app.models.user import User
from app.schemas import (
    AssignedConsultant,
    ClientCreate,
    ClientDetail,
    ClientListItem,
    ClientListResponse,
    ClientUpdate,
    CreatedResponse,
    MessageResponse,
    Pagination,
)
from app.services import (
    apply_client_filters,
    calculate_age,
    ensure_client_access,
    latest_follow_ups_for_clients,
    scoped_clients_query,
    validate_consultant,
)


router = APIRouter(prefix="/clients", tags=["clients"])


def client_list_item(client: Client, latest_follow_up: FollowUpLog | None) -> ClientListItem:
    return ClientListItem(
        id=client.id,
        name=client.name,
        phone=client.phone,
        line_id=client.line_id,
        assigned_consultant=AssignedConsultant.model_validate(client.assigned_consultant),
        current_stage=client.current_stage,
        client_status=client.client_status,
        consultation_status=client.consultation_status,
        estimated_value=float(client.estimated_value) if client.estimated_value is not None else None,
        next_follow_up_at=latest_follow_up.next_follow_up_at if latest_follow_up else None,
        created_at=client.created_at,
    )


@router.get("", response_model=ClientListResponse)
def list_clients(
    consultant_id: int | None = None,
    stage: Stage | None = None,
    status: ClientStatus | None = None,
    source: str | None = None,
    keyword: str | None = None,
    overdue: bool = False,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClientListResponse:
    if current_user.role == UserRole.consultant:
        consultant_id = current_user.id

    query = apply_client_filters(
        scoped_clients_query(current_user),
        consultant_id=consultant_id,
        stage=stage,
        status_=status,
        source=source,
        keyword=keyword,
    )
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    clients = db.scalars(query.order_by(Client.updated_at.desc()).offset((page - 1) * limit).limit(limit)).all()

    latest_follow_ups = latest_follow_ups_for_clients(db, [client.id for client in clients])
    items = [client_list_item(client, latest_follow_ups.get(client.id)) for client in clients]
    if overdue:
        from datetime import UTC, datetime

        now = datetime.now(UTC)
        items = [
            item
            for item in items
            if item.next_follow_up_at is not None
            and (item.next_follow_up_at.replace(tzinfo=UTC) if item.next_follow_up_at.tzinfo is None else item.next_follow_up_at) < now
        ]
        total = len(items)

    return ClientListResponse(data=items, pagination=Pagination(page=page, limit=limit, total=total))


@router.post("", response_model=CreatedResponse, status_code=201)
def create_client(
    payload: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CreatedResponse:
    assigned_consultant_id = payload.assigned_consultant_id or current_user.id
    if current_user.role == UserRole.consultant:
        assigned_consultant_id = current_user.id
    validate_consultant(db, assigned_consultant_id)

    client_data = payload.model_dump(exclude_unset=True)
    client_data["assigned_consultant_id"] = assigned_consultant_id
    if "birth_date" in client_data:
        birth_date = client_data["birth_date"]
        client_data["age"] = calculate_age(birth_date) if birth_date is not None else None
    client = Client(**client_data)
    db.add(client)
    db.flush()
    db.add(
        StageLog(
            client_id=client.id,
            from_stage=None,
            to_stage=client.current_stage,
            changed_by=current_user.id,
            reason="Client created",
        )
    )
    db.commit()
    return CreatedResponse(id=client.id, message="Client created successfully")


@router.get("/{client_id}", response_model=ClientDetail)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Client:
    return ensure_client_access(db, current_user, client_id)


@router.put("/{client_id}", response_model=MessageResponse)
def update_client(
    client_id: int,
    payload: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    client = ensure_client_access(db, current_user, client_id)
    update_data = payload.model_dump(exclude_unset=True)
    if "assigned_consultant_id" in update_data and update_data["assigned_consultant_id"] is not None:
        if current_user.role != UserRole.admin:
            update_data.pop("assigned_consultant_id")
        else:
            validate_consultant(db, update_data["assigned_consultant_id"])
    if "birth_date" in update_data:
        birth_date = update_data["birth_date"]
        update_data["age"] = calculate_age(birth_date) if birth_date is not None else None
    for key, value in update_data.items():
        setattr(client, key, value)
    db.commit()
    return MessageResponse(message="Client updated successfully")


@router.delete("/{client_id}", response_model=MessageResponse)
def archive_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    client = ensure_client_access(db, current_user, client_id)
    client.client_status = ClientStatus.archived
    db.commit()
    return MessageResponse(message="Client archived successfully")
