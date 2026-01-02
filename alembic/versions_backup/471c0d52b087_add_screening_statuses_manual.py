"""add_screening_statuses_manual

Revision ID: 471c0d52b087
Revises: f639539367ce
Create Date: 2025-12-29 12:49:50.181788

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '471c0d52b087'
down_revision: Union[str, Sequence[str], None] = 'f639539367ce'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add new values to the enum
    # Note: We must enable transaction per statement or rely on Postgres allowing it inside transaction (v12+)
    op.execute("ALTER TYPE applicationstatus ADD VALUE 'screening_pending'")
    op.execute("ALTER TYPE applicationstatus ADD VALUE 'screening_scheduled'")
    op.execute("ALTER TYPE applicationstatus ADD VALUE 'screening_completed'")
    op.execute("ALTER TYPE applicationstatus ADD VALUE 'tech_pending'")
    op.execute("ALTER TYPE applicationstatus ADD VALUE 'tech_scheduled'")
    op.execute("ALTER TYPE applicationstatus ADD VALUE 'tech_completed'")


def downgrade() -> None:
    """Downgrade schema."""
    # Postgres doesn't support removing values from Enum types easily
    # We would need to create a new type, copy data, drop old type, rename new type
    pass
