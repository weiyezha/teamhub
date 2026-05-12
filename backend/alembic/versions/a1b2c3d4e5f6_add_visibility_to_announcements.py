"""add visibility to announcements

Revision ID: a1b2c3d4e5f6
Revises: e283feccfd67
Create Date: 2026-05-09 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'e283feccfd67'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('announcements') as batch_op:
        batch_op.add_column(sa.Column('visibility', sa.String(), nullable=True, server_default='public'))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('announcements') as batch_op:
        batch_op.drop_column('visibility')
