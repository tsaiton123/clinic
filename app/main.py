from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models
from app.api import admin_notes, analytics, auth, bootstrap, clients, dashboard, decision_barriers, follow_ups, notifications, stage, users
from app.core.config import settings

app = FastAPI(title="Clinic Management API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.allowed_origins.split(",") if origin.strip()],
    allow_origin_regex=settings.allowed_origin_regex or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(stage.router)
app.include_router(follow_ups.router)
app.include_router(decision_barriers.router)
app.include_router(notifications.router)
app.include_router(users.router)
app.include_router(bootstrap.router)
app.include_router(admin_notes.router)
app.include_router(analytics.router)
app.include_router(dashboard.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


_ = models
