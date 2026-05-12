from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import ClientStatus, ConsultationStatus, Stage


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(60))
    line_id: Mapped[str | None] = mapped_column(String(120), index=True)
    email: Mapped[str | None] = mapped_column(String(255))
    gender: Mapped[str | None] = mapped_column(String(40))
    age: Mapped[int | None] = mapped_column(Integer)
    source: Mapped[str | None] = mapped_column(String(120), index=True)
    interested_treatment: Mapped[str | None] = mapped_column(String(255))
    initial_need: Mapped[str | None] = mapped_column(Text)
    budget_range: Mapped[str | None] = mapped_column(String(120))
    final_treatment_plan: Mapped[str | None] = mapped_column(Text)
    actual_deal_value: Mapped[float | None] = mapped_column(Numeric(12, 2))
    payment_status: Mapped[str | None] = mapped_column(String(60))
    treatment_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    consent_signed: Mapped[bool] = mapped_column(default=False, nullable=False)
    preop_completed: Mapped[bool] = mapped_column(default=False, nullable=False)
    treatment_started: Mapped[bool] = mapped_column(default=False, nullable=False)
    assigned_consultant_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    current_stage: Mapped[Stage] = mapped_column(Enum(Stage), default=Stage.S1, index=True)
    client_status: Mapped[ClientStatus] = mapped_column(
        Enum(ClientStatus), default=ClientStatus.active, index=True
    )
    consultation_status: Mapped[ConsultationStatus] = mapped_column(
        Enum(ConsultationStatus), default=ConsultationStatus.no_reply
    )
    estimated_value: Mapped[float | None] = mapped_column(Numeric(12, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    assigned_consultant = relationship("User", back_populates="assigned_clients")
    stage_logs = relationship("StageLog", back_populates="client", cascade="all, delete-orphan")
    follow_up_logs = relationship("FollowUpLog", back_populates="client", cascade="all, delete-orphan")
    decision_barriers = relationship(
        "DecisionBarrier", back_populates="client", cascade="all, delete-orphan"
    )
    notifications = relationship("Notification", back_populates="client")
    admin_notes = relationship("AdminNote", back_populates="client", cascade="all, delete-orphan")
