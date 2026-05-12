from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import ContactMethod


class FollowUpLog(Base):
    __tablename__ = "follow_up_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), index=True, nullable=False)
    consultant_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    contact_method: Mapped[ContactMethod] = mapped_column(Enum(ContactMethod), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    client_response: Mapped[str | None] = mapped_column(Text)
    next_action: Mapped[str | None] = mapped_column(Text)
    next_follow_up_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    need_admin_support: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    client = relationship("Client", back_populates="follow_up_logs")
    consultant = relationship("User")
