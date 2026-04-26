"""Initial migration: Users, Cards, Tags, CardTags

Revision ID: f77c0b9aa526
Revises: 
Create Date: 2026-04-26 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f77c0b9aa526'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - create all tables."""
    # ### Users table ###
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # ### Tags table ###
    op.create_table(
        'tags',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('color', sa.String(7), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_tags_user_id', 'tags', ['user_id'])
    op.create_unique_constraint('uq_tag_user_name', 'tags', ['user_id', 'name'])

    # ### Cards table ###
    op.create_table(
        'cards',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=True),
        sa.Column('company', sa.String(255), nullable=True),
        sa.Column('title', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('mobile', sa.String(50), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('front_image_url', sa.String(500), nullable=True),
        sa.Column('back_image_url', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_card_user_id', 'cards', ['user_id'])
    op.create_index('ix_card_user_name', 'cards', ['user_id', 'name'])
    op.create_index('ix_card_email', 'cards', ['email'])
    op.create_unique_constraint('uq_card_user_name_company', 'cards', ['user_id', 'name', 'company'])

    # ### CardTags table (many-to-many) ###
    op.create_table(
        'card_tags',
        sa.Column('card_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tag_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['card_id'], ['cards.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tag_id'], ['tags.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('card_id', 'tag_id')
    )


def downgrade() -> None:
    """Downgrade schema - drop all tables."""
    op.drop_table('card_tags')
    op.drop_constraint('uq_card_user_name_company', 'cards', type_='unique')
    op.drop_index('ix_card_email', table_name='cards')
    op.drop_index('ix_card_user_name', table_name='cards')
    op.drop_index('ix_card_user_id', table_name='cards')
    op.drop_table('cards')
    op.drop_unique_constraint('uq_tag_user_name', 'tags')
    op.drop_index('ix_tags_user_id', table_name='tags')
    op.drop_table('tags')
    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')
