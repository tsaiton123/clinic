from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from datetime import UTC, datetime, timedelta


def request(method: str, base_url: str, path: str, payload: dict | None = None, token: str | None = None) -> dict:
    data = None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(f"{base_url}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        raise RuntimeError(f"{method} {path} failed: {exc.code} {body}") from exc


def login(base_url: str, email: str, password: str) -> str:
    response = request("POST", base_url, "/auth/login", {"email": email, "password": password})
    return response["token"]


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: .venv/bin/python scripts/smoke_test.py <base_url>")
        return 1

    base_url = sys.argv[1].rstrip("/")
    timestamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S")

    health = request("GET", base_url, "/health")
    assert health["status"] == "ok"

    admin_token = login(base_url, "admin@example.com", "password123")
    consultant_token = login(base_url, "consultant@example.com", "password123")

    me_admin = request("GET", base_url, "/auth/me", token=admin_token)
    me_consultant = request("GET", base_url, "/auth/me", token=consultant_token)

    created = request(
        "POST",
        base_url,
        "/clients",
        {
            "name": f"Smoke Test Client {timestamp}",
            "phone": f"09{timestamp[-8:]}",
            "assigned_consultant_id": me_consultant["id"],
            "estimated_value": 88000,
            "source": "Render Smoke Test",
            "interested_treatment": "植牙",
        },
        token=admin_token,
    )
    client_id = created["id"]

    request(
        "POST",
        base_url,
        f"/clients/{client_id}/stage",
        {"to_stage": "S2", "reason": "Smoke test stage update"},
        token=admin_token,
    )

    next_follow_up_at = (datetime.now(UTC) + timedelta(days=1)).isoformat()
    request(
        "POST",
        base_url,
        f"/clients/{client_id}/follow-ups",
        {
            "contact_method": "line",
            "content": "Smoke test follow-up",
            "next_follow_up_at": next_follow_up_at,
        },
        token=admin_token,
    )

    request(
        "POST",
        base_url,
        "/notifications",
        {
            "receiver_id": me_consultant["id"],
            "client_id": client_id,
            "message": f"Smoke test notification {timestamp}",
        },
        token=admin_token,
    )

    request("GET", base_url, "/analytics/overview", token=admin_token)
    request("GET", base_url, "/analytics/funnel", token=admin_token)
    request("GET", base_url, "/analytics/consultants", token=admin_token)
    request("GET", base_url, "/dashboard/consultant", token=consultant_token)

    consultant_clients = request("GET", base_url, "/clients", token=consultant_token)
    consultant_notifications = request("GET", base_url, "/notifications", token=consultant_token)

    assert any(item["id"] == client_id for item in consultant_clients["data"])
    assert any(item["client"]["id"] == client_id for item in consultant_notifications["data"])

    print(f"Smoke test passed for {base_url}")
    print(f"Admin: {me_admin['email']}")
    print(f"Consultant: {me_consultant['email']}")
    print(f"Created client_id: {client_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
