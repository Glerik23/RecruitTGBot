"""migrate_status_to_string_manual

Revision ID: c66700d09bae
Revises: 471c0d52b087
Create Date: 2025-12-29 12:58:27.851289

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c66700d09bae'
down_revision: Union[str, Sequence[str], None] = '471c0d52b087'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Convert Enum column to String
    op.alter_column('applications', 'status',
               existing_type=sa.Enum('PENDING', 'ACCEPTED', 'REJECTED', 'HIRED', 'DECLINED', 'CANCELLED', 
                                     'screening_pending', 'screening_scheduled', 'screening_completed',
                                     'tech_pending', 'tech_scheduled', 'tech_completed', name='applicationstatus'),
               type_=sa.String(),
               postgresql_using='status::text',
               existing_nullable=False)
               
    # Drop the Enum type as it is no longer used
    op.execute("DROP TYPE applicationstatus")


def downgrade() -> None:
    """Downgrade schema."""
    # Re-create the Enum type
    op.execute("CREATE TYPE applicationstatus AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'HIRED', 'DECLINED', 'CANCELLED', 'screening_pending', 'screening_scheduled', 'screening_completed', 'tech_pending', 'tech_scheduled', 'tech_completed')")
    
    # Convert String back to Enum
    op.alter_column('applications', 'status',
               existing_type=sa.String(),
               type_=sa.Enum('PENDING', 'ACCEPTED', 'REJECTED', 'HIRED', 'DECLINED', 'CANCELLED', 
                             'screening_pending', 'screening_scheduled', 'screening_completed',
                             'tech_pending', 'tech_scheduled', 'tech_completed', name='applicationstatus'),
               postgresql_using='status::applicationstatus',
               existing_nullable=False)
