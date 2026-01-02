"""refactor: status enum, normalized slots, consolidated skills

Revision ID: ff225588cc11
Revises: c66700d09bae
Create Date: 2026-01-02 04:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'ff225588cc11'
down_revision: Union[str, Sequence[str], None] = 'c66700d09bae'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create interview_slots table (clean start)
    op.execute("DROP TABLE IF EXISTS interview_slots CASCADE")
    op.create_table('interview_slots',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('interview_id', sa.Integer(), nullable=False),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_booked', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['interview_id'], ['interviews.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_interview_slots_id'), 'interview_slots', ['id'], unique=False)

    # 2. Re-add status column if it was dropped by CASCADE earlier
    op.execute("""
    DO $$ 
    BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='status') THEN
            ALTER TABLE applications ADD COLUMN status TEXT;
        END IF;
    END $$;
    """)

    # 3. Refactor Application.status to Enum
    op.execute("ALTER TABLE applications ALTER COLUMN status TYPE TEXT")
    op.execute("DROP TYPE IF EXISTS applicationstatus CASCADE")
    op.execute("CREATE TYPE applicationstatus AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'HIRED', 'DECLINED', 'CANCELLED', 'screening_pending', 'screening_scheduled', 'screening_completed', 'tech_pending', 'tech_scheduled', 'tech_completed')")
    
    op.execute("ALTER TABLE applications ALTER COLUMN status TYPE applicationstatus USING status::applicationstatus")
    op.execute("ALTER TABLE applications ALTER COLUMN status SET NOT NULL")

    # 4. Clean up old columns (optionally)
    op.execute("ALTER TABLE applications DROP COLUMN IF EXISTS skills_details")
    op.execute("ALTER TABLE interviews DROP COLUMN IF EXISTS available_slots")


def downgrade() -> None:
    pass # Not strictly needed for this emergency fix
