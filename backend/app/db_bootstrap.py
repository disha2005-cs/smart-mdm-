"""
Idempotent schema reconciliation run at application startup.

Two jobs:

1. Create any missing tables, so a brand-new database (the one Docker Compose
   brings up, for instance) is usable without a manual migration step.
2. Apply the handful of column/constraint changes that came after the original
   migrations. The alembic history in this repo has diverged into several
   heads, so a plain ``alembic upgrade head`` is not usable.

Everything here is safe to run on every boot: each statement either already
holds or is a no-op.
"""
from loguru import logger
from sqlalchemy import inspect, text

import app.models  # noqa: F401 - registers every model on Base.metadata
from app.database import Base, engine

# Plain DDL rather than migrations so this stays readable and re-runnable.
STATEMENTS = [
    # Guard against double-deducting a day's meal from stock.
    """
    ALTER TABLE daily_meals
        ADD COLUMN IF NOT EXISTS inventory_consumed BOOLEAN NOT NULL DEFAULT FALSE
    """,
    """
    ALTER TABLE daily_meals
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE
    """,
    # Historic rows used mixed casing ("Present"/"PRESENT"); normalise them so
    # status filters return the same answer everywhere.
    "UPDATE attendances SET status = UPPER(status) WHERE status <> UPPER(status)",
    "UPDATE attendances SET status = 'PRESENT' WHERE status IN ('P', 'PRESENT ')",
]

# Constraints are added separately: they can fail on pre-existing bad data and
# a failure there must not stop the rest of the bootstrap.
CONSTRAINTS = [
    (
        "uq_attendance_student_date",
        """
        ALTER TABLE attendances
            ADD CONSTRAINT uq_attendance_student_date UNIQUE (student_id, date)
        """,
        # Collapse duplicates first, keeping the earliest record of each day.
        """
        DELETE FROM attendances a
        USING attendances b
        WHERE a.student_id = b.student_id
          AND a.date = b.date
          AND a.id > b.id
        """,
    ),
    (
        "uq_daily_meal_school_date",
        """
        ALTER TABLE daily_meals
            ADD CONSTRAINT uq_daily_meal_school_date UNIQUE (school_id, date)
        """,
        """
        DELETE FROM daily_meals a
        USING daily_meals b
        WHERE a.school_id = b.school_id
          AND a.date = b.date
          AND a.id > b.id
        """,
    ),
]

INDEXES = [
    "CREATE INDEX IF NOT EXISTS ix_attendance_school_date ON attendances (school_id, date)",
    "CREATE INDEX IF NOT EXISTS ix_inventory_school ON inventory (school_id)",
    "CREATE INDEX IF NOT EXISTS ix_students_school ON students (school_id)",
    "CREATE INDEX IF NOT EXISTS ix_food_allocations_school ON food_allocations (school_id)",
]


def _constraint_exists(connection, name: str) -> bool:
    return bool(connection.execute(
        text("SELECT 1 FROM pg_constraint WHERE conname = :name"),
        {"name": name},
    ).scalar())


def create_missing_tables() -> None:
    """
    Create tables that do not exist yet.

    ``create_all`` only issues CREATE TABLE for missing tables, so this is a
    no-op against an established database and does the full bootstrap against
    an empty one.
    """
    before = set(inspect(engine).get_table_names())
    Base.metadata.create_all(bind=engine)
    created = set(inspect(engine).get_table_names()) - before

    if created:
        logger.info(f"Created {len(created)} table(s): {', '.join(sorted(created))}")


def sync_schema() -> None:
    """Apply pending schema tweaks. Never raises - startup must not be blocked."""
    try:
        create_missing_tables()

        with engine.begin() as connection:
            for statement in STATEMENTS + INDEXES:
                connection.execute(text(statement))

        for name, add_sql, dedupe_sql in CONSTRAINTS:
            try:
                with engine.begin() as connection:
                    if _constraint_exists(connection, name):
                        continue
                    connection.execute(text(dedupe_sql))
                    connection.execute(text(add_sql))
                    logger.info(f"Added constraint {name}")
            except Exception as exc:  # noqa: BLE001
                logger.warning(f"Could not add constraint {name}: {exc}")

        logger.info("Database schema is up to date")
    except Exception as exc:  # noqa: BLE001
        logger.error(f"Schema sync skipped: {exc}")
