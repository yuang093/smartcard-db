"""Add username to users table

Revision ID: a1b2c3d4e5f6
Revises: f77c0b9aa526
Create Date: 2026-04-26 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f77c0b9aa526'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add username column to users table."""
    # Add username column as nullable first
    op.add_column(
        'users',
        sa.Column('username', sa.String(50), nullable=True)
    )
    
    # Update existing users with username from email prefix
    # We need to execute raw SQL for this
    op.execute("UPDATE users SET username = split_part(email, '@', 1) WHERE username IS NULL")
    
    # Make username not nullable now that all existing users have usernames
    op.alter_column('users', 'username', nullable=False)
    
    # Create unique index on username
    op.create_index('ix_users_username', 'users', ['username'], unique=True)
    
    # Make email nullable (it's now optional)
    op.alter_column('users', 'email', nullable=True)


def downgrade() -> None:
    """Remove username column from users table."""
    op.drop_index('ix_users_username', table_name='users')
    op.drop_column('users', 'username')
    op.alter_column('users', 'email', nullable=False)
    op.create_index('ix_users_email', 'users', ['email'], unique=True)