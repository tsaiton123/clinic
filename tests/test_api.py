from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import StaticPool, create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.main import app
from app.models.enums import UserRole, UserStatus
from app.models.stage_log import StageLog
from app.models.user import User


engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    admin = User(
        name="Admin",
        email="admin@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.admin,
        status=UserStatus.active,
    )
    consultant = User(
        name="Consultant",
        email="consultant@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.consultant,
        status=UserStatus.active,
    )
    other = User(
        name="Other",
        email="other@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.consultant,
        status=UserStatus.active,
    )
    db.add_all([admin, consultant, other])
    db.commit()
    db.close()

    def override_get_db():
        test_db = TestingSessionLocal()
        try:
            yield test_db
        finally:
            test_db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def auth_headers(client: TestClient, email: str) -> dict[str, str]:
    response = client.post("/auth/login", json={"email": email, "password": "password123"})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['token']}"}


def test_client_stage_and_follow_up_flow(client: TestClient):
    admin_headers = auth_headers(client, "admin@example.com")

    created = client.post(
        "/clients",
        headers=admin_headers,
        json={
            "name": "王小姐",
            "phone": "0912345678",
            "assigned_consultant_id": 2,
            "estimated_value": 120000,
        },
    )
    assert created.status_code == 201
    client_id = created.json()["id"]

    stage = client.post(
        f"/clients/{client_id}/stage",
        headers=admin_headers,
        json={"to_stage": "S4", "reason": "需求明確"},
    )
    assert stage.status_code == 200
    assert stage.json()["from_stage"] == "S1"
    assert stage.json()["to_stage"] == "S4"

    logs = client.get(f"/clients/{client_id}/stage-logs", headers=admin_headers)
    assert logs.status_code == 200
    assert len(logs.json()["data"]) == 2

    overdue_at = (datetime.now(UTC) - timedelta(days=3)).isoformat()
    follow_up = client.post(
        f"/clients/{client_id}/follow-ups",
        headers=admin_headers,
        json={
            "contact_method": "line",
            "content": "確認方案意願",
            "next_follow_up_at": overdue_at,
        },
    )
    assert follow_up.status_code == 201

    overdue = client.get("/follow-ups/overdue?days=1", headers=admin_headers)
    assert overdue.status_code == 200
    assert overdue.json()["data"][0]["client_id"] == client_id


def test_consultant_can_only_see_own_clients(client: TestClient):
    admin_headers = auth_headers(client, "admin@example.com")
    consultant_headers = auth_headers(client, "consultant@example.com")

    own = client.post(
        "/clients",
        headers=admin_headers,
        json={"name": "Own Client", "assigned_consultant_id": 2},
    ).json()["id"]
    other = client.post(
        "/clients",
        headers=admin_headers,
        json={"name": "Other Client", "assigned_consultant_id": 3},
    ).json()["id"]

    listing = client.get("/clients", headers=consultant_headers)
    assert listing.status_code == 200
    assert [item["id"] for item in listing.json()["data"]] == [own]

    forbidden = client.get(f"/clients/{other}", headers=consultant_headers)
    assert forbidden.status_code == 403


def test_decision_barriers_and_analytics(client: TestClient):
    admin_headers = auth_headers(client, "admin@example.com")
    consultant_headers = auth_headers(client, "consultant@example.com")
    other_headers = auth_headers(client, "other@example.com")

    client_id = client.post(
        "/clients",
        headers=admin_headers,
        json={"name": "Barrier Client", "assigned_consultant_id": 2},
    ).json()["id"]

    created = client.post(
        f"/clients/{client_id}/barriers",
        headers=consultant_headers,
        json={
            "barrier_type": "價格猶豫",
            "description": "想了解分期",
            "status": "unresolved",
        },
    )
    assert created.status_code == 201
    barrier_id = created.json()["id"]

    forbidden = client.post(
        f"/clients/{client_id}/barriers",
        headers=other_headers,
        json={"barrier_type": "信任不足"},
    )
    assert forbidden.status_code == 403

    updated = client.put(
        f"/barriers/{barrier_id}",
        headers=consultant_headers,
        json={"status": "resolved", "description": "已提供分期方案"},
    )
    assert updated.status_code == 200

    analytics = client.get("/analytics/barriers", headers=admin_headers)
    assert analytics.status_code == 200
    assert analytics.json()["data"] == [
        {"barrier_type": "價格猶豫", "count": 1, "percentage": 100.0}
    ]


def test_notifications_admin_send_and_inbox(client: TestClient):
    admin_headers = auth_headers(client, "admin@example.com")
    consultant_headers = auth_headers(client, "consultant@example.com")

    client_id = client.post(
        "/clients",
        headers=admin_headers,
        json={"name": "Notification Client", "assigned_consultant_id": 2},
    ).json()["id"]

    consultant_send = client.post(
        "/notifications",
        headers=consultant_headers,
        json={"receiver_id": 2, "client_id": client_id, "message": "Should fail"},
    )
    assert consultant_send.status_code == 403

    sent = client.post(
        "/notifications",
        headers=admin_headers,
        json={"receiver_id": 2, "client_id": client_id, "message": "請今天追蹤客戶"},
    )
    assert sent.status_code == 201
    notification_id = sent.json()["id"]

    inbox = client.get("/notifications", headers=consultant_headers)
    assert inbox.status_code == 200
    data = inbox.json()["data"]
    assert len(data) == 1
    assert data[0]["id"] == notification_id
    assert data[0]["status"] == "unread"
    assert data[0]["client"]["id"] == client_id

    marked = client.put(f"/notifications/{notification_id}/read", headers=consultant_headers)
    assert marked.status_code == 200

    read_inbox = client.get("/notifications?status=read", headers=consultant_headers)
    assert read_inbox.status_code == 200
    assert read_inbox.json()["data"][0]["status"] == "read"


def test_admin_notes_flow_and_consultant_visibility(client: TestClient):
    admin_headers = auth_headers(client, "admin@example.com")
    consultant_headers = auth_headers(client, "consultant@example.com")

    client_id = client.post(
        "/clients",
        headers=admin_headers,
        json={"name": "Note Client", "assigned_consultant_id": 2},
    ).json()["id"]

    created = client.post(
        f"/clients/{client_id}/admin-notes",
        headers=admin_headers,
        json={"content": "優先處理價格疑慮，必要時由院長介入。"},
    )
    assert created.status_code == 201
    note_id = created.json()["id"]

    consultant_create = client.post(
        f"/clients/{client_id}/admin-notes",
        headers=consultant_headers,
        json={"content": "Should fail"},
    )
    assert consultant_create.status_code == 403

    visible = client.get(f"/clients/{client_id}/admin-notes", headers=consultant_headers)
    assert visible.status_code == 200
    assert visible.json()["data"][0]["id"] == note_id

    updated = client.put(
        f"/admin-notes/{note_id}",
        headers=admin_headers,
        json={"content": "已改為先提供分期方案與恢復期說明。"},
    )
    assert updated.status_code == 200


def test_admin_analytics_endpoints(client: TestClient):
    admin_headers = auth_headers(client, "admin@example.com")
    consultant_headers = auth_headers(client, "consultant@example.com")

    client_specs = [
        {"name": "S1 Client", "assigned_consultant_id": 2, "current_stage": "S1", "estimated_value": 100},
        {"name": "S2 Client", "assigned_consultant_id": 2, "current_stage": "S2", "estimated_value": 200},
        {"name": "S6 Client", "assigned_consultant_id": 2, "current_stage": "S6", "estimated_value": 300, "actual_deal_value": 260},
        {"name": "Other S6", "assigned_consultant_id": 3, "current_stage": "S6", "estimated_value": 400, "actual_deal_value": 390},
    ]
    created_ids = [
        client.post("/clients", headers=admin_headers, json=payload).json()["id"]
        for payload in client_specs
    ]
    overdue_at = (datetime.now(UTC) - timedelta(days=2)).isoformat()
    client.post(
        f"/clients/{created_ids[0]}/follow-ups",
        headers=admin_headers,
        json={
            "contact_method": "line",
            "content": "Overdue follow-up",
            "next_follow_up_at": overdue_at,
        },
    )

    forbidden = client.get("/analytics/overview", headers=consultant_headers)
    assert forbidden.status_code == 403

    overview = client.get("/analytics/overview", headers=admin_headers)
    assert overview.status_code == 200
    overview_data = overview.json()
    assert overview_data["total_clients"] == 4
    assert overview_data["active_clients"] == 4
    assert overview_data["new_clients_this_month"] == 4
    assert overview_data["s6_clients_this_month"] == 2
    assert overview_data["estimated_revenue"] == 1000
    assert overview_data["overdue_followups"] == 1

    consultant_overview = client.get("/analytics/overview?consultant_id=2", headers=admin_headers)
    assert consultant_overview.status_code == 200
    consultant_overview_data = consultant_overview.json()
    assert consultant_overview_data["total_clients"] == 3
    assert consultant_overview_data["s6_clients_this_month"] == 1
    assert consultant_overview_data["estimated_revenue"] == 600
    assert consultant_overview_data["overdue_followups"] == 1

    funnel = client.get("/analytics/funnel", headers=admin_headers)
    assert funnel.status_code == 200
    funnel_data = funnel.json()
    assert [stage["count"] for stage in funnel_data["stages"]] == [1, 1, 0, 0, 0, 2]
    assert funnel_data["conversion_rates"][0] == {"from": "S1", "to": "S2", "rate": 100.0}

    consultants = client.get("/analytics/consultants", headers=admin_headers)
    assert consultants.status_code == 200
    consultant_data = consultants.json()["data"]
    assert consultant_data[0]["consultant_id"] == 2
    assert consultant_data[0]["total_clients"] == 3
    assert consultant_data[0]["stage_distribution"]["S6"] == 1
    assert "average_follow_up_gap_days" in consultant_data[0]
    assert consultant_data[0]["overdue_followups"] == 1
    assert consultant_data[0]["estimated_revenue"] == 600
    assert consultant_data[0]["conversion_rate_s1_to_s6"] == 33.3

    revenue = client.get("/analytics/revenue", headers=admin_headers)
    assert revenue.status_code == 200
    revenue_data = revenue.json()
    assert revenue_data["estimated_revenue"] == 1000
    assert revenue_data["confirmed_revenue"] == 650
    assert revenue_data["data"][0]["s6_clients"] == 2


def test_bootstrap_endpoint_requires_token_and_seeds(client: TestClient):
    from app.core.config import settings

    settings.bootstrap_token = "bootstrap-secret"

    unauthorized = client.post("/internal/bootstrap-demo")
    assert unauthorized.status_code == 401

    bootstrapped = client.post(
        "/internal/bootstrap-demo",
        headers={"x-bootstrap-token": "bootstrap-secret"},
    )
    assert bootstrapped.status_code == 200
    assert bootstrapped.json()["message"] == "Bootstrap complete"

    login = client.post("/auth/login", json={"email": "admin@example.com", "password": "password123"})
    assert login.status_code == 200

    settings.bootstrap_token = ""


def test_consultant_dashboard_scope_and_payload(client: TestClient):
    admin_headers = auth_headers(client, "admin@example.com")
    consultant_headers = auth_headers(client, "consultant@example.com")

    today_at = datetime.now(UTC).replace(hour=12, minute=0, second=0, microsecond=0).isoformat()
    overdue_at = (datetime.now(UTC) - timedelta(days=2)).isoformat()

    s5_client = client.post(
        "/clients",
        headers=admin_headers,
        json={
            "name": "Ready Soon",
            "assigned_consultant_id": 2,
            "current_stage": "S5",
            "estimated_value": 500,
        },
    ).json()["id"]
    s3_client = client.post(
        "/clients",
        headers=admin_headers,
        json={
            "name": "Needs Follow-up",
            "assigned_consultant_id": 2,
            "current_stage": "S3",
            "estimated_value": 300,
        },
    ).json()["id"]
    other_client = client.post(
        "/clients",
        headers=admin_headers,
        json={"name": "Other Dashboard Client", "assigned_consultant_id": 3, "current_stage": "S5"},
    ).json()["id"]

    client.post(
        f"/clients/{s5_client}/follow-ups",
        headers=admin_headers,
        json={"contact_method": "line", "content": "Today task", "next_follow_up_at": today_at},
    )
    client.post(
        f"/clients/{s3_client}/follow-ups",
        headers=admin_headers,
        json={"contact_method": "phone", "content": "Overdue task", "next_follow_up_at": overdue_at},
    )
    client.post(
        "/notifications",
        headers=admin_headers,
        json={"receiver_id": 2, "client_id": s5_client, "message": "請確認 S6 日期"},
    )

    own_dashboard = client.get("/dashboard/consultant", headers=consultant_headers)
    assert own_dashboard.status_code == 200
    data = own_dashboard.json()
    assert data["consultant"]["id"] == 2
    assert [item["client_id"] for item in data["today_followups"]] == [s5_client]
    assert [item["client_id"] for item in data["overdue_followups"]] == [s3_client]
    assert data["stage_distribution"]["S5"] == 1
    assert data["stage_distribution"]["S3"] == 1
    assert [item["id"] for item in data["upcoming_s6_clients"]] == [s5_client]
    assert data["unread_notifications"][0]["client"]["id"] == s5_client

    admin_dashboard = client.get("/dashboard/consultant?consultant_id=2", headers=admin_headers)
    assert admin_dashboard.status_code == 200
    assert admin_dashboard.json()["consultant"]["id"] == 2

    missing_consultant = client.get("/dashboard/consultant", headers=admin_headers)
    assert missing_consultant.status_code == 422

    forbidden = client.get("/dashboard/consultant?consultant_id=3", headers=consultant_headers)
    assert forbidden.status_code == 403

    other_dashboard = client.get("/dashboard/consultant?consultant_id=3", headers=admin_headers)
    assert other_dashboard.status_code == 200
    assert other_dashboard.json()["upcoming_s6_clients"][0]["id"] == other_client


def test_admin_stagnant_clients_endpoint(client: TestClient):
    admin_headers = auth_headers(client, "admin@example.com")

    stagnant_client = client.post(
        "/clients",
        headers=admin_headers,
        json={"name": "Stagnant Client", "assigned_consultant_id": 2, "current_stage": "S3"},
    ).json()["id"]
    fresh_client = client.post(
        "/clients",
        headers=admin_headers,
        json={"name": "Fresh Client", "assigned_consultant_id": 2, "current_stage": "S2"},
    ).json()["id"]
    s6_client = client.post(
        "/clients",
        headers=admin_headers,
        json={"name": "Done Client", "assigned_consultant_id": 2, "current_stage": "S6"},
    ).json()["id"]

    db = TestingSessionLocal()
    try:
        old_stage_at = datetime.now(UTC) - timedelta(days=20)
        db.query(StageLog).filter(StageLog.client_id == stagnant_client).update(
            {StageLog.created_at: old_stage_at},
            synchronize_session=False,
        )
        db.query(StageLog).filter(StageLog.client_id == s6_client).update(
            {StageLog.created_at: old_stage_at},
            synchronize_session=False,
        )
        db.commit()
    finally:
        db.close()

    response = client.get("/analytics/stagnant-clients?consultant_id=2&days=14", headers=admin_headers)
    assert response.status_code == 200
    ids = [item["id"] for item in response.json()["data"]]
    assert stagnant_client in ids
    assert fresh_client not in ids
    assert s6_client not in ids
