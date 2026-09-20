import time

from fastapi import Request
from sqlalchemy import create_engine, event, exc
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

# psycopg3 is the installed driver; SQLAlchemy needs it named explicitly.
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

# A managed database is often in another region: round trips here cost ~270ms
# each, so the number of round trips per request is what decides how fast a
# page feels. Everything below exists to keep that number down.
_is_remote = not any(host in db_url for host in ("@localhost", "@127.0.0.1", "@db:"))

# Only verify a connection that has been sitting unused for longer than this.
# A connection handed back seconds ago is almost certainly still good, and the
# check costs a full round trip.
PING_AFTER_IDLE_SECONDS = 60

_common = dict(
    # Comfortably above the concurrent requests one worker serves, so a
    # request never waits for a free connection.
    pool_size=10,
    max_overflow=20,
    # Recycle well inside the idle window after which serverless Postgres
    # suspends the compute and drops connections (Neon's default is 300s).
    pool_recycle=240,
    # Reuse the most recently returned connection, which keeps a small warm
    # set rather than cycling through all of them.
    pool_use_lifo=True,
    # Fail fast rather than hanging a request for the default 30s.
    pool_timeout=10,
    connect_args={
        # Notice a dead peer instead of blocking on a silently broken socket.
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 3,
        # Cap connection setup. A statement_timeout cannot be set here:
        # connection poolers such as Neon's reject "options" in the startup
        # packet outright.
        "connect_timeout": 10,
    } if _is_remote else {},
)

# Writes: ordinary transactional engine. Row locks (SELECT ... FOR UPDATE) and
# SAVEPOINTs only mean anything inside a transaction, so this must stay.
engine = create_engine(db_url, **_common)

# Reads: same pool settings, but autocommit. A transactional session spends
# three round trips on a single query - BEGIN, the query, then ROLLBACK when
# the connection returns to the pool. In autocommit it is one.
readonly_engine = create_engine(db_url, isolation_level="AUTOCOMMIT", **_common)


def _install_idle_ping(target_engine):
    """
    Validate a pooled connection only when it has been idle a while.

    This is `pool_pre_ping` with a threshold. Unconditional pre-ping adds a
    round trip to every single request; against a remote database that was
    about a quarter of the time the dashboards took. Recycling below the
    provider's suspend window already rules out the common stale-connection
    case, and this covers the rest without paying on every checkout.
    """
    @event.listens_for(target_engine, "checkin")
    def _record_checkin(_dbapi_connection, connection_record):
        connection_record.info["checked_in_at"] = time.monotonic()

    @event.listens_for(target_engine, "checkout")
    def _ping_if_idle(dbapi_connection, connection_record, _connection_proxy):
        checked_in_at = connection_record.info.get("checked_in_at")
        if checked_in_at is not None and time.monotonic() - checked_in_at < PING_AFTER_IDLE_SECONDS:
            return

        try:
            cursor = dbapi_connection.cursor()
            try:
                cursor.execute("SELECT 1")
            finally:
                cursor.close()
        except Exception:
            # Tells SQLAlchemy to discard this connection and retry the
            # checkout with a fresh one - the same recovery pre-ping performs.
            raise exc.DisconnectionError("Connection went stale while idle")


for _engine in (engine, readonly_engine):
    _install_idle_ping(_engine)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
ReadOnlySessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=readonly_engine)

Base = declarative_base()


def get_db(request: Request = None):
    """
    Request-scoped database session.

    GET/HEAD requests get an autocommit session, which removes the two round
    trips a transaction costs. Every mutation in this API is a POST, PUT,
    PATCH or DELETE, so nothing that needs atomicity is affected.

    If you ever add a handler that writes on a GET, give it SessionLocal()
    explicitly - in autocommit each statement commits on its own, so a
    multi-statement write would not roll back as a unit.
    """
    read_only = request is not None and request.method in ("GET", "HEAD", "OPTIONS")
    db = ReadOnlySessionLocal() if read_only else SessionLocal()
    try:
        yield db
    finally:
        db.close()
