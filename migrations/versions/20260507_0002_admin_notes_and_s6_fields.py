"""add admin notes and s6 fields

Revision ID: 20260507_0002
Revises: 20260505_0001
Create Date: 2026-05-07 00:30:00.000000
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260507_0002"
down_revision: str | None = "20260505_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("clients", sa.Column("final_treatment_plan", sa.Text(), nullable=True))
    op.add_column("clients", sa.Column("actual_deal_value", sa.Numeric(12, 2), nullable=True))
    op.add_column("clients", sa.Column("payment_status", sa.String(length=60), nullable=True))
    op.add_column("clients", sa.Column("treatment_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("clients", sa.Column("consent_signed", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("clients", sa.Column("preop_completed", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("clients", sa.Column("treatment_started", sa.Boolean(), nullable=False, server_default=sa.false()))

    op.create_table(
        "admin_notes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("author_id", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_admin_notes_author_id"), "admin_notes", ["author_id"])
    op.create_index(op.f("ix_admin_notes_client_id"), "admin_notes", ["client_id"])
    op.create_index(op.f("ix_admin_notes_id"), "admin_notes", ["id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_admin_notes_id"), table_name="admin_notes")
    op.drop_index(op.f("ix_admin_notes_client_id"), table_name="admin_notes")
    op.drop_index(op.f("ix_admin_notes_author_id"), table_name="admin_notes")
    op.drop_table("admin_notes")

    op.drop_column("clients", "treatment_started")
    op.drop_column("clients", "preop_completed")
    op.drop_column("clients", "consent_signed")
    op.drop_column("clients", "treatment_date")
    op.drop_column("clients", "payment_status")
    op.drop_column("clients", "actual_deal_value")
    op.drop_column("clients", "final_treatment_plan")
