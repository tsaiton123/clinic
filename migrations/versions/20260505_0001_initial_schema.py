"""initial schema

Revision ID: 20260505_0001
Revises:
Create Date: 2026-05-05 00:00:00.000000
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260505_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.Enum("admin", "consultant", name="userrole"), nullable=False),
        sa.Column("status", sa.Enum("active", "inactive", name="userstatus"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)

    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("phone", sa.String(length=60), nullable=True),
        sa.Column("line_id", sa.String(length=120), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("gender", sa.String(length=40), nullable=True),
        sa.Column("age", sa.Integer(), nullable=True),
        sa.Column("source", sa.String(length=120), nullable=True),
        sa.Column("interested_treatment", sa.String(length=255), nullable=True),
        sa.Column("initial_need", sa.Text(), nullable=True),
        sa.Column("budget_range", sa.String(length=120), nullable=True),
        sa.Column("assigned_consultant_id", sa.Integer(), nullable=False),
        sa.Column("current_stage", sa.Enum("S1", "S2", "S3", "S4", "S5", "S6", name="stage"), nullable=False),
        sa.Column(
            "client_status",
            sa.Enum("active", "paused", "completed", "lost", "archived", name="clientstatus"),
            nullable=False,
        ),
        sa.Column(
            "consultation_status",
            sa.Enum("no_reply", "interested", "paused", "lost_contact", name="consultationstatus"),
            nullable=False,
        ),
        sa.Column("estimated_value", sa.Numeric(12, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["assigned_consultant_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_clients_assigned_consultant_id"), "clients", ["assigned_consultant_id"])
    op.create_index(op.f("ix_clients_client_status"), "clients", ["client_status"])
    op.create_index(op.f("ix_clients_current_stage"), "clients", ["current_stage"])
    op.create_index(op.f("ix_clients_id"), "clients", ["id"])
    op.create_index(op.f("ix_clients_line_id"), "clients", ["line_id"])
    op.create_index(op.f("ix_clients_name"), "clients", ["name"])
    op.create_index(op.f("ix_clients_source"), "clients", ["source"])

    op.create_table(
        "decision_barriers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("barrier_type", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.Enum("unresolved", "resolved", name="barrierstatus"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_decision_barriers_barrier_type"), "decision_barriers", ["barrier_type"])
    op.create_index(op.f("ix_decision_barriers_client_id"), "decision_barriers", ["client_id"])
    op.create_index(op.f("ix_decision_barriers_id"), "decision_barriers", ["id"])
    op.create_index(op.f("ix_decision_barriers_status"), "decision_barriers", ["status"])

    op.create_table(
        "follow_up_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("consultant_id", sa.Integer(), nullable=False),
        sa.Column("contact_method", sa.Enum("phone", "line", "onsite", "email", name="contactmethod"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("client_response", sa.Text(), nullable=True),
        sa.Column("next_action", sa.Text(), nullable=True),
        sa.Column("next_follow_up_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("need_admin_support", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.ForeignKeyConstraint(["consultant_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_follow_up_logs_client_id"), "follow_up_logs", ["client_id"])
    op.create_index(op.f("ix_follow_up_logs_consultant_id"), "follow_up_logs", ["consultant_id"])
    op.create_index(op.f("ix_follow_up_logs_id"), "follow_up_logs", ["id"])
    op.create_index(op.f("ix_follow_up_logs_next_follow_up_at"), "follow_up_logs", ["next_follow_up_at"])

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("sender_id", sa.Integer(), nullable=False),
        sa.Column("receiver_id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=True),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", sa.Enum("unread", "read", name="notificationstatus"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.ForeignKeyConstraint(["receiver_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_notifications_client_id"), "notifications", ["client_id"])
    op.create_index(op.f("ix_notifications_id"), "notifications", ["id"])
    op.create_index(op.f("ix_notifications_receiver_id"), "notifications", ["receiver_id"])
    op.create_index(op.f("ix_notifications_sender_id"), "notifications", ["sender_id"])
    op.create_index(op.f("ix_notifications_status"), "notifications", ["status"])

    op.create_table(
        "stage_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("from_stage", sa.Enum("S1", "S2", "S3", "S4", "S5", "S6", name="stage"), nullable=True),
        sa.Column("to_stage", sa.Enum("S1", "S2", "S3", "S4", "S5", "S6", name="stage"), nullable=False),
        sa.Column("changed_by", sa.Integer(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["changed_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_stage_logs_client_id"), "stage_logs", ["client_id"])
    op.create_index(op.f("ix_stage_logs_id"), "stage_logs", ["id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_stage_logs_id"), table_name="stage_logs")
    op.drop_index(op.f("ix_stage_logs_client_id"), table_name="stage_logs")
    op.drop_table("stage_logs")
    op.drop_index(op.f("ix_notifications_status"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_sender_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_receiver_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_client_id"), table_name="notifications")
    op.drop_table("notifications")
    op.drop_index(op.f("ix_follow_up_logs_next_follow_up_at"), table_name="follow_up_logs")
    op.drop_index(op.f("ix_follow_up_logs_id"), table_name="follow_up_logs")
    op.drop_index(op.f("ix_follow_up_logs_consultant_id"), table_name="follow_up_logs")
    op.drop_index(op.f("ix_follow_up_logs_client_id"), table_name="follow_up_logs")
    op.drop_table("follow_up_logs")
    op.drop_index(op.f("ix_decision_barriers_status"), table_name="decision_barriers")
    op.drop_index(op.f("ix_decision_barriers_id"), table_name="decision_barriers")
    op.drop_index(op.f("ix_decision_barriers_client_id"), table_name="decision_barriers")
    op.drop_index(op.f("ix_decision_barriers_barrier_type"), table_name="decision_barriers")
    op.drop_table("decision_barriers")
    op.drop_index(op.f("ix_clients_source"), table_name="clients")
    op.drop_index(op.f("ix_clients_name"), table_name="clients")
    op.drop_index(op.f("ix_clients_line_id"), table_name="clients")
    op.drop_index(op.f("ix_clients_id"), table_name="clients")
    op.drop_index(op.f("ix_clients_current_stage"), table_name="clients")
    op.drop_index(op.f("ix_clients_client_status"), table_name="clients")
    op.drop_index(op.f("ix_clients_assigned_consultant_id"), table_name="clients")
    op.drop_table("clients")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
