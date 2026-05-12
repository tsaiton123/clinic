from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.admin_note import AdminNote
from app.models.client import Client
from app.models.decision_barrier import DecisionBarrier
from app.models.enums import BarrierStatus, ContactMethod, Stage, UserRole, UserStatus
from app.models.follow_up_log import FollowUpLog
from app.models.notification import Notification
from app.models.stage_log import StageLog
from app.models.user import User


def get_or_create_user(db, *, name: str, email: str, password: str, role: UserRole) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if user:
        user.name = name
        user.password_hash = hash_password(password)
        user.role = role
        user.status = UserStatus.active
        return user

    user = User(
        name=name,
        email=email,
        password_hash=hash_password(password),
        role=role,
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()
    return user


def run() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        admin = get_or_create_user(
            db,
            name="王院長",
            email="admin@example.com",
            password="password123",
            role=UserRole.admin,
        )
        consultant = get_or_create_user(
            db,
            name="陳咨詢師",
            email="consultant@example.com",
            password="password123",
            role=UserRole.consultant,
        )

        existing_client = db.scalar(select(Client).where(Client.email == "wang@example.com"))
        if existing_client:
            db.commit()
            return

        client = Client(
            name="王小姐",
            phone="0912345678",
            line_id="wang_line",
            email="wang@example.com",
            gender="female",
            age=35,
            source="朋友介紹",
            interested_treatment="植牙",
            initial_need="想了解全口重建方案",
            budget_range="100000-150000",
            assigned_consultant_id=consultant.id,
            current_stage=Stage.S3,
            estimated_value=120000,
        )
        db.add(client)
        db.flush()
        db.add(
            StageLog(
                client_id=client.id,
                from_stage=None,
                to_stage=Stage.S3,
                changed_by=admin.id,
                reason="Seed data",
            )
        )
        db.add(
            FollowUpLog(
                client_id=client.id,
                consultant_id=consultant.id,
                contact_method=ContactMethod.line,
                content="詢問客戶是否看完療程說明資料",
                client_response="客戶表示有興趣，但想再了解恢復期",
                next_action="安排醫師說明恢復期與風險",
                next_follow_up_at=datetime.now(UTC) + timedelta(days=1),
            )
        )
        db.add(
            DecisionBarrier(
                client_id=client.id,
                barrier_type="價格猶豫",
                description="客戶覺得 12 萬方案超出預算，但願意了解分期。",
                status=BarrierStatus.unresolved,
            )
        )
        db.add(
            Notification(
                sender_id=admin.id,
                receiver_id=consultant.id,
                client_id=client.id,
                message="請今天確認王小姐是否需要分期方案說明。",
            )
        )
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    run()
