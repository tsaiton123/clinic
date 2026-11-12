from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from math import ceil

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from app.api.analytics import consultants, overview, stagnant_clients
from app.api.clients import list_clients
from app.api.dashboard import consultant_dashboard
from app.core.database import Base
from app.models.client import Client
from app.models.enums import ClientStatus, ContactMethod, Stage, UserRole, UserStatus
from app.models.follow_up_log import FollowUpLog
from app.models.stage_log import StageLog
from app.models.user import User
from app.services import latest_follow_ups_for_clients, latest_stage_times_for_clients


@pytest.fixture()
def db():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        session.add_all([
            User(id=1, name="Admin", email="admin@test.local", password_hash="unused", role=UserRole.admin),
            User(id=2, name="Consultant", email="one@test.local", password_hash="unused", role=UserRole.consultant),
            User(id=3, name="Inactive", email="two@test.local", password_hash="unused", role=UserRole.consultant, status=UserStatus.inactive),
        ])
        session.commit()
        yield session
    engine.dispose()


@contextmanager
def sql_count(db):
    statements = []

    def record(_connection, _cursor, statement, _parameters, _context, _many):
        statements.append(statement)

    event.listen(db.bind, "before_cursor_execute", record)
    try:
        yield statements
    finally:
        event.remove(db.bind, "before_cursor_execute", record)


def add_client(db, *, consultant_id=2, stage=Stage.S1, age_days=30, archived=False):
    client = Client(
        name="Synthetic client", assigned_consultant_id=consultant_id,
        current_stage=stage, created_at=datetime.now(UTC) - timedelta(days=age_days),
        client_status=ClientStatus.archived if archived else ClientStatus.active,
    )
    db.add(client)
    db.flush()
    return client


def add_follow_up(db, client_id, created_at, due_at=None, consultant_id=2):
    log = FollowUpLog(
        client_id=client_id, consultant_id=consultant_id, contact_method=ContactMethod.line,
        content="Synthetic follow-up", created_at=created_at, next_follow_up_at=due_at,
    )
    db.add(log)
    db.flush()
    return log


@pytest.mark.parametrize("size", [10, 100, 501])
def test_read_query_counts_grow_by_batch_not_client(db, size):
    now = datetime.now(UTC)
    for _ in range(size):
        client = add_client(db)
        add_follow_up(db, client.id, now - timedelta(days=2), now - timedelta(days=1))
        db.add(StageLog(client_id=client.id, to_stage=Stage.S1, changed_by=1, created_at=now - timedelta(days=30)))
    db.commit()
    consultant = db.get(User, 2)
    admin = db.get(User, 1)
    batches = ceil(size / 500)

    with sql_count(db) as queries:
        result = overview(db=db, _=admin)
    assert len(queries) == 1 + 2 * batches
    assert result.total_clients == result.overdue_followups == result.stagnant_clients == size

    with sql_count(db) as queries:
        result = consultants(db=db, _=admin)
    assert len(queries) == 3 + batches
    assert [item.total_clients for item in result.data] == [size, 0]
    assert result.data[0].overdue_followups == size

    with sql_count(db) as queries:
        result = stagnant_clients(db=db, _=admin, limit=10)
    assert len(queries) == 3 + batches
    assert len(result.data) == 10

    with sql_count(db) as queries:
        result = list_clients(db=db, current_user=consultant, page=1, limit=20)
    assert len(queries) == 4
    assert result.pagination.total == size
    assert len(result.data) == min(size, 20)

    with sql_count(db) as queries:
        result = consultant_dashboard(db=db, current_user=consultant, consultant_id=None)
    assert len(queries) == 3 + batches  # clients, assigned user, batched follow-ups, notifications
    assert len(result.overdue_followups) == size


def test_batch_follow_up_priority_nulls_ties_and_missing_rows(db):
    now = datetime.now(UTC)
    clients = [add_client(db) for _ in range(4)]
    scheduled = add_follow_up(db, clients[0].id, now - timedelta(days=2), now + timedelta(days=3))
    add_follow_up(db, clients[0].id, now, now + timedelta(days=1))
    add_follow_up(db, clients[0].id, now + timedelta(days=1))
    add_follow_up(db, clients[1].id, now - timedelta(days=1))
    unscheduled = add_follow_up(db, clients[1].id, now)
    add_follow_up(db, clients[2].id, now, now)
    tied = add_follow_up(db, clients[2].id, now, now)
    ids = [client.id for client in clients]
    with sql_count(db) as queries:
        result = latest_follow_ups_for_clients(db, ids)
    assert len(queries) == 1
    assert {key: value.id for key, value in result.items()} == {
        ids[0]: scheduled.id, ids[1]: unscheduled.id, ids[2]: tied.id,
    }
    with sql_count(db) as queries:
        assert latest_follow_ups_for_clients(db, []) == {}
        assert latest_stage_times_for_clients(db, []) == {}
    assert not queries


def test_analytics_preserves_scope_stage_fallbacks_and_historical_gaps(db):
    now = datetime.now(UTC)
    old = add_client(db, age_days=40)  # no stage log: fall back to client.created_at
    unchanged = add_client(db, age_days=30)
    changed = add_client(db, age_days=50)
    add_client(db, stage=Stage.S6, age_days=60)
    archived = add_client(db, archived=True, age_days=70)
    other = add_client(db, consultant_id=3, age_days=80)
    for client, age in [(unchanged, 25), (changed, 40), (changed, 1)]:
        db.add(StageLog(client_id=client.id, to_stage=Stage.S1, changed_by=1, created_at=now - timedelta(days=age)))
    add_follow_up(db, old.id, now - timedelta(days=10), now - timedelta(days=1))
    add_follow_up(db, old.id, now - timedelta(days=9), now + timedelta(days=1))
    add_follow_up(db, unchanged.id, now - timedelta(days=6), now - timedelta(days=1))
    add_follow_up(db, archived.id, now - timedelta(days=1), now - timedelta(days=1))
    add_follow_up(db, other.id, now, now - timedelta(days=1), consultant_id=3)
    db.commit()

    result = overview(db=db, consultant_id=2)
    assert result.total_clients == 4
    assert result.overdue_followups == 1
    assert result.stagnant_clients == 2
    stagnant = stagnant_clients(db=db, consultant_id=2)
    assert [item.id for item in stagnant.data] == [old.id, unchanged.id]
    rows = consultants(db=db).data
    assert [item.consultant_id for item in rows] == [2, 3]  # inactive consultant retained
    assert [item.total_clients for item in rows] == [4, 1]
    assert rows[0].average_follow_up_gap_days == 3.0  # (10 - 1) / 3, includes archived history
    assert rows[1].average_follow_up_gap_days == 0.0
