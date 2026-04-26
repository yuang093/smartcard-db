import os
import sys
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy import engine_from_config

from alembic import context

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import Base
from app.models.user import User
from app.models.card import Card, CardTag
from app.models.tag import Tag

# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set target metadata for autogenerate support
target_metadata = Base.metadata

# Get database URL from environment
def get_database_url():
    """Get database URL from environment variable."""
    url = os.environ.get("DATABASE_URL")
    if url:
        # Convert async driver to sync for Alembic
        return url.replace("+asyncpg", "")
    
    # Fallback to postgres directly (for docker)
    user = os.environ.get("POSTGRES_USER", "smartcard")
    password = os.environ.get("POSTGRES_PASSWORD", "smartcard_password")
    host = os.environ.get("POSTGRES_HOST", "postgres")
    db = os.environ.get("POSTGRES_DB", "smartcard")
    return f"postgresql://{user}:{password}@{host}:5432/{db}"

# Configure sqlalchemy.url
config.set_main_option("sqlalchemy.url", get_database_url())


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
