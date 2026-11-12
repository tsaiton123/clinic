from collections import defaultdict
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import require_admin
from app.core.database import get_db
from app.models.client import Client
from app.models.enums import ClientStatus, Stage, UserRole
from app.models.follow_up_log import FollowUpLog
from app.models.user import User
from app.schemas import (
    AnalyticsConsultantsResponse,
    AnalyticsFunnelResponse,
    AnalyticsOverviewResponse,
    AnalyticsRevenueResponse,
    ClientSummaryResponse,
    ConsultantAnalyticsItem,
    FunnelConversionRate,
    FunnelStageItem,
    RevenueTrendItem,
)
from app.services import (
    latest_follow_ups_for_clients,
    latest_stage_times_for_clients,
    validate_consultant,
)
from app.api.clients import client_list_item


router = APIRouter(prefix="/analytics", tags=["analytics"])

STAGE_NAMES: dict[Stage, str] = {
    Stage.S1: "資料蒐集",
    Stage.S2: "建立節奏",
    Stage.S3: "咨詢狀態確認",
    Stage.S4: "需求整合",
    Stage.S5: "決策障礙釐清",
    Stage.S6: "治療共識與啟動",
}
STAGE_ORDER = [Stage.S1, Stage.S2, Stage.S3, Stage.S4, Stage.S5, Stage.S6]


def month_start(now: datetime | None = None) -> datetime:
    now = now or datetime.now(UTC)
    return datetime(now.year, now.month, 1, tzinfo=UTC)


def normalize_start_end(
    start_date: datetime | None,
    end_date: datetime | None,
) -> tuple[datetime, datetime]:
    return start_date or month_start(), end_date or datetime.now(UTC)


def aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def active_clients_query():
    return select(Client).where(Client.client_status != ClientStatus.archived)


def stage_distribution(clients: list[Client]) -> dict[str, int]:
    distribution = {stage.value: 0 for stage in STAGE_ORDER}
    for client in clients:
        distribution[client.current_stage.value] += 1
    return distribution


def estimated_value(client: Client) -> float:
    return float(client.estimated_value or 0)


def confirmed_value(client: Client) -> float:
    return float(client.actual_deal_value or client.estimated_value or 0)


def count_overdue_followups(clients: list[Client], latest_follow_ups: dict[int, FollowUpLog]) -> int:
    now = datetime.now(UTC)
    count = 0
    for client in clients:
        latest = latest_follow_ups.get(client.id)
        if latest is None or latest.next_follow_up_at is None:
            continue
        due_at = latest.next_follow_up_at
        if due_at.tzinfo is None:
            due_at = due_at.replace(tzinfo=UTC)
        if due_at < now:
            count += 1
    return count


def count_stagnant_clients(
    clients: list[Client], latest_stage_times: dict[int, datetime], days: int = 14
) -> int:
    threshold = datetime.now(UTC) - timedelta(days=days)
    count = 0
    for client in clients:
        if client.current_stage == Stage.S6:
            continue
        latest_stage_at = latest_stage_times.get(client.id)
        if latest_stage_at is None:
            latest_stage_at = client.created_at
        if latest_stage_at.tzinfo is None:
            latest_stage_at = latest_stage_at.replace(tzinfo=UTC)
        if latest_stage_at < threshold:
            count += 1
    return count


def average_follow_up_gaps(db: Session) -> dict[int, float]:
    rows = db.execute(
        select(
            FollowUpLog.consultant_id,
            func.count(FollowUpLog.id),
            func.min(FollowUpLog.created_at),
            func.max(FollowUpLog.created_at),
        ).group_by(FollowUpLog.consultant_id)
    ).all()
    # Consecutive gaps telescope to last - first; avoid loading every timestamp.
    return {
        consultant_id: round((aware(last) - aware(first)).total_seconds() / 86400 / (count - 1), 1)
        if count > 1 else 0.0
        for consultant_id, count, first, last in rows
    }


@router.get("/overview", response_model=AnalyticsOverviewResponse)
def overview(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    consultant_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> AnalyticsOverviewResponse:
    if consultant_id is not None:
        validate_consultant(db, consultant_id)
    period_start, period_end = normalize_start_end(start_date, end_date)
    query = active_clients_query()
    if consultant_id is not None:
        query = query.where(Client.assigned_consultant_id == consultant_id)
    clients = db.scalars(query).all()
    total_clients = len(clients)
    active_clients = sum(1 for client in clients if client.client_status == ClientStatus.active)
    new_clients = sum(1 for client in clients if period_start <= aware(client.created_at) <= period_end)
    s6_clients = sum(
        1
        for client in clients
        if client.current_stage == Stage.S6 and period_start <= aware(client.updated_at) <= period_end
    )
    estimated_revenue = sum(estimated_value(client) for client in clients)
    latest_follow_ups = latest_follow_ups_for_clients(db, [client.id for client in clients])
    latest_stage_times = latest_stage_times_for_clients(
        db, [client.id for client in clients if client.current_stage != Stage.S6]
    )

    return AnalyticsOverviewResponse(
        total_clients=total_clients,
        new_clients_this_month=new_clients,
        active_clients=active_clients,
        s6_clients_this_month=s6_clients,
        estimated_revenue=estimated_revenue,
        overdue_followups=count_overdue_followups(clients, latest_follow_ups),
        stagnant_clients=count_stagnant_clients(clients, latest_stage_times),
    )


@router.get("/funnel", response_model=AnalyticsFunnelResponse)
def funnel(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    consultant_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> AnalyticsFunnelResponse:
    if consultant_id is not None:
        validate_consultant(db, consultant_id)
    query = active_clients_query()
    if consultant_id is not None:
        query = query.where(Client.assigned_consultant_id == consultant_id)
    if start_date is not None:
        query = query.where(Client.created_at >= start_date)
    if end_date is not None:
        query = query.where(Client.created_at <= end_date)

    clients = db.scalars(query).all()
    distribution = stage_distribution(clients)
    stage_items = [
        FunnelStageItem(stage=stage, name=STAGE_NAMES[stage], count=distribution[stage.value])
        for stage in STAGE_ORDER
    ]

    conversion_rates: list[FunnelConversionRate] = []
    for from_stage, to_stage in zip(STAGE_ORDER, STAGE_ORDER[1:]):
        from_count = distribution[from_stage.value]
        to_count = distribution[to_stage.value]
        rate = round((to_count / from_count) * 100, 1) if from_count else 0.0
        conversion_rates.append(
            FunnelConversionRate(from_stage=from_stage, to_stage=to_stage, rate=rate)
        )

    return AnalyticsFunnelResponse(stages=stage_items, conversion_rates=conversion_rates)


@router.get("/consultants", response_model=AnalyticsConsultantsResponse)
def consultants(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> AnalyticsConsultantsResponse:
    period_start, period_end = normalize_start_end(start_date, end_date)
    consultant_users = db.scalars(
        select(User).where(User.role == UserRole.consultant).order_by(User.id.asc())
    ).all()
    clients_by_consultant: dict[int, list[Client]] = defaultdict(list)
    all_clients = db.scalars(
        active_clients_query().join(User, Client.assigned_consultant_id == User.id)
        .where(User.role == UserRole.consultant)
    ).all()
    for client in all_clients:
        clients_by_consultant[client.assigned_consultant_id].append(client)
    latest_follow_ups = latest_follow_ups_for_clients(db, [client.id for client in all_clients])
    follow_up_gaps = average_follow_up_gaps(db)
    data: list[ConsultantAnalyticsItem] = []
    for consultant in consultant_users:
        clients = clients_by_consultant[consultant.id]
        distribution = stage_distribution(clients)
        total_clients = len(clients)
        s6_clients = distribution[Stage.S6.value]
        data.append(
            ConsultantAnalyticsItem(
                consultant_id=consultant.id,
                consultant_name=consultant.name,
                total_clients=total_clients,
                new_clients=sum(
                    1 for client in clients if period_start <= aware(client.created_at) <= period_end
                ),
                stage_distribution=distribution,
                average_follow_up_gap_days=follow_up_gaps.get(consultant.id, 0.0),
                overdue_followups=count_overdue_followups(clients, latest_follow_ups),
                s6_clients=s6_clients,
                estimated_revenue=sum(estimated_value(client) for client in clients),
                conversion_rate_s1_to_s6=round((s6_clients / total_clients) * 100, 1)
                if total_clients
                else 0.0,
            )
        )
    return AnalyticsConsultantsResponse(data=data)


@router.get("/revenue", response_model=AnalyticsRevenueResponse)
def revenue(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    consultant_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> AnalyticsRevenueResponse:
    if consultant_id is not None:
        validate_consultant(db, consultant_id)
    query = active_clients_query()
    if consultant_id is not None:
        query = query.where(Client.assigned_consultant_id == consultant_id)
    if start_date is not None:
        query = query.where(Client.created_at >= start_date)
    if end_date is not None:
        query = query.where(Client.created_at <= end_date)

    clients = db.scalars(query).all()
    estimated_revenue = sum(estimated_value(client) for client in clients)
    confirmed_revenue = sum(
        confirmed_value(client) for client in clients if client.current_stage == Stage.S6
    )

    grouped: dict[str, dict[str, float | int]] = defaultdict(
        lambda: {"estimated_revenue": 0.0, "confirmed_revenue": 0.0, "s6_clients": 0}
    )
    for client in clients:
        month = client.created_at.strftime("%Y-%m")
        grouped[month]["estimated_revenue"] += estimated_value(client)
        if client.current_stage == Stage.S6:
            grouped[month]["confirmed_revenue"] += confirmed_value(client)
            grouped[month]["s6_clients"] += 1

    trends = [
        RevenueTrendItem(
            month=month,
            estimated_revenue=float(values["estimated_revenue"]),
            confirmed_revenue=float(values["confirmed_revenue"]),
            s6_clients=int(values["s6_clients"]),
        )
        for month, values in sorted(grouped.items())
    ]
    return AnalyticsRevenueResponse(
        estimated_revenue=estimated_revenue,
        confirmed_revenue=confirmed_revenue,
        data=trends,
    )


@router.get("/stagnant-clients", response_model=ClientSummaryResponse)
def stagnant_clients(
    consultant_id: int | None = None,
    days: int = 14,
    limit: int = 10,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> ClientSummaryResponse:
    if consultant_id is not None:
        validate_consultant(db, consultant_id)
    query = active_clients_query()
    if consultant_id is not None:
        query = query.where(Client.assigned_consultant_id == consultant_id)
    query = query.options(selectinload(Client.assigned_consultant))
    clients = db.scalars(query).all()

    threshold = datetime.now(UTC) - timedelta(days=days)
    latest_stage_times = latest_stage_times_for_clients(
        db, [client.id for client in clients if client.current_stage != Stage.S6]
    )
    stagnant: list[Client] = []
    for client in clients:
        if client.current_stage == Stage.S6:
            continue
        latest_stage_at = latest_stage_times.get(client.id) or client.created_at
        latest_stage_at = aware(latest_stage_at)
        if latest_stage_at < threshold:
            stagnant.append(client)

    stagnant.sort(
        key=lambda client: aware(latest_stage_times.get(client.id) or client.created_at)
    )
    visible_clients = stagnant[:limit]
    latest_follow_ups = latest_follow_ups_for_clients(db, [client.id for client in visible_clients])
    return ClientSummaryResponse(
        data=[client_list_item(client, latest_follow_ups.get(client.id)) for client in visible_clients]
    )
