from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey, Enum, Index, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from pathlib import Path
import enum

# Local-only database configuration
# Keep DB path stable regardless of current working directory.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_FILE_PATH = PROJECT_ROOT / "safeguard.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_FILE_PATH.as_posix()}"

CONNECT_ARGS = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args=CONNECT_ARGS,
    echo=False,  # Set to True for SQL debugging
    pool_pre_ping=True,  # Verify connections before use
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency to get database session for FastAPI."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─── Database Utility Functions ───────────────────────────────────────────

def init_db():
    """Initialize database: create tables and seed data."""
    Base.metadata.create_all(bind=engine)
    _run_sqlite_migrations()
    from seed import seed
    seed()


def _run_sqlite_migrations():
    """Apply minimal SQLite migrations for older local DB files."""
    if not SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        return

    with engine.begin() as conn:
        cols = conn.exec_driver_sql("PRAGMA table_info('sos_alerts')").fetchall()
        col_names = {row[1] for row in cols}
        if "selfie_data" not in col_names:
            conn.exec_driver_sql("ALTER TABLE sos_alerts ADD COLUMN selfie_data TEXT")
        if "live_frame_data" not in col_names:
            conn.exec_driver_sql("ALTER TABLE sos_alerts ADD COLUMN live_frame_data TEXT")
        if "live_frame_updated_at" not in col_names:
            conn.exec_driver_sql("ALTER TABLE sos_alerts ADD COLUMN live_frame_updated_at DATETIME")

        session_cols = conn.exec_driver_sql("PRAGMA table_info('counseling_sessions')").fetchall()
        session_col_names = {row[1] for row in session_cols}
        if "scheduled_for" not in session_col_names:
            conn.exec_driver_sql("ALTER TABLE counseling_sessions ADD COLUMN scheduled_for DATETIME")
        if "topic" not in session_col_names:
            conn.exec_driver_sql("ALTER TABLE counseling_sessions ADD COLUMN topic VARCHAR")
        if "notes" not in session_col_names:
            conn.exec_driver_sql("ALTER TABLE counseling_sessions ADD COLUMN notes TEXT")

        conn.exec_driver_sql(
            """
            CREATE TABLE IF NOT EXISTS legal_resource_bookmarks (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                legal_resource_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(legal_resource_id) REFERENCES legal_resources(id)
            )
            """
        )
        conn.exec_driver_sql(
            "CREATE UNIQUE INDEX IF NOT EXISTS ux_legal_bookmark_user_resource ON legal_resource_bookmarks(user_id, legal_resource_id)"
        )

        # Remove deprecated AI-lawyer RAG storage if it exists from older builds.
        conn.exec_driver_sql("DROP INDEX IF EXISTS ux_legal_chunk_resource_idx")
        conn.exec_driver_sql("DROP INDEX IF EXISTS idx_legal_chunk_category")
        conn.exec_driver_sql("DROP INDEX IF EXISTS idx_legal_chunk_law_name")
        conn.exec_driver_sql("DROP TABLE IF EXISTS legal_resource_chunks")


def get_db_stats(db):
    """Get database statistics for admin monitoring."""
    return {
        "users": db.query(User).count(),
        "incidents": db.query(Incident).count(),
        "sos_alerts": db.query(SOSAlert).count(),
        "family_links": db.query(FamilyLink).count(),
        "notifications": db.query(Notification).count(),
        "counseling_sessions": db.query(CounselingSession).count(),
    }


class UserRole(str, enum.Enum):
    user = "user"
    child = "child"
    women = "women"
    admin = "admin"
    counselor = "counselor"
    parent = "parent"


class IncidentStatus(str, enum.Enum):
    pending = "pending"
    under_review = "under_review"
    resolved = "resolved"
    closed = "closed"


class IncidentType(str, enum.Enum):
    harassment = "harassment"
    domestic_violence = "domestic_violence"
    child_abuse = "child_abuse"
    cybercrime = "cybercrime"
    stalking = "stalking"
    assault = "assault"
    trafficking = "trafficking"
    other = "other"


class FamilyLinkStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"


class SessionStatus(str, enum.Enum):
    waiting = "waiting"
    appointment_pending = "appointment_pending"
    appointment_accepted = "appointment_accepted"
    active = "active"
    ended = "ended"
    cancelled = "cancelled"
    rejected = "rejected"


# ─── Models ──────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.user, index=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    trusted_contacts = relationship("TrustedContact", back_populates="user", cascade="all, delete-orphan", lazy="select")
    incidents = relationship("Incident", back_populates="reporter", foreign_keys="Incident.reporter_id", cascade="all, delete-orphan", lazy="select")
    sos_alerts = relationship("SOSAlert", back_populates="user", cascade="all, delete-orphan", lazy="select")
    family_links_as_child = relationship("FamilyLink", foreign_keys="FamilyLink.child_user_id", back_populates="child", cascade="all, delete-orphan", lazy="select")
    family_links_as_parent = relationship("FamilyLink", foreign_keys="FamilyLink.parent_user_id", back_populates="parent", cascade="all, delete-orphan", lazy="select")
    activity_logs = relationship("ActivityLog", back_populates="admin", lazy="select")
    
    __table_args__ = (
        Index('idx_user_role_active', 'role', 'is_active'),
        Index('idx_user_created_at', 'created_at'),
    )


class TrustedContact(Base):
    __tablename__ = "trusted_contacts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False, index=True)
    email = Column(String, nullable=True)
    relation = Column(String, nullable=True)
    user = relationship("User", back_populates="trusted_contacts")
    
    __table_args__ = (
        Index('idx_user_phone', 'user_id', 'phone'),
    )


class SOSAlert(Base):
    __tablename__ = "sos_alerts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    address = Column(String, nullable=True)
    message = Column(String, default="EMERGENCY! I need help immediately.")
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    resolved_at = Column(DateTime, nullable=True)
    selfie_data = Column(Text, nullable=True)
    live_frame_data = Column(Text, nullable=True)
    live_frame_updated_at = Column(DateTime, nullable=True)
    user = relationship("User", back_populates="sos_alerts")
    family_alerts = relationship("FamilyAlert", back_populates="sos", lazy="select")
    live_frames = relationship("SOSLiveFrame", back_populates="sos", cascade="all, delete-orphan", lazy="select")
    notifications = relationship("Notification", foreign_keys="Notification.related_sos_id", lazy="select")
    
    __table_args__ = (
        Index('idx_sos_user_created', 'user_id', 'created_at'),
        Index('idx_sos_active', 'is_active', 'created_at'),
    )


class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    incident_type = Column(Enum(IncidentType), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    location = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    status = Column(Enum(IncidentStatus), default=IncidentStatus.pending, index=True)
    is_anonymous = Column(Boolean, default=False)
    evidence_url = Column(String, nullable=True)
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    reporter = relationship("User", back_populates="incidents", foreign_keys=[reporter_id])
    notifications = relationship("Notification", foreign_keys="Notification.related_incident_id", lazy="select")
    
    __table_args__ = (
        Index('idx_incident_reporter_created', 'reporter_id', 'created_at'),
        Index('idx_incident_status_created', 'status', 'created_at'),
        Index('idx_incident_type', 'incident_type'),
    )


class SOSLiveFrame(Base):
    """Persist every uploaded SOS live-stream frame for audit and replay."""
    __tablename__ = "sos_live_frames"
    id = Column(Integer, primary_key=True, index=True)
    sos_alert_id = Column(Integer, ForeignKey("sos_alerts.id"), nullable=False, index=True)
    child_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    frame_number = Column(Integer, nullable=False, default=0)
    frame_data = Column(Text, nullable=False)
    content_type = Column(String, nullable=True)
    size_bytes = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    sos = relationship("SOSAlert", back_populates="live_frames", foreign_keys=[sos_alert_id])
    child = relationship("User", foreign_keys=[child_user_id])

    __table_args__ = (
        Index('idx_sos_live_frame_alert_created', 'sos_alert_id', 'created_at'),
        Index('idx_sos_live_frame_child_created', 'child_user_id', 'created_at'),
    )


class Helpline(Base):
    __tablename__ = "helplines"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    number = Column(String, nullable=False, unique=True, index=True)
    category = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    available_24x7 = Column(Boolean, default=True)
    website = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, index=True)


class LegalResource(Base):
    __tablename__ = "legal_resources"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True)
    law_name = Column(String, nullable=True, index=True)
    summary = Column(Text, nullable=False)
    full_text = Column(Text, nullable=True)
    reference_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class LegalResourceBookmark(Base):
    __tablename__ = "legal_resource_bookmarks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    legal_resource_id = Column(Integer, ForeignKey("legal_resources.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", foreign_keys=[user_id])
    resource = relationship("LegalResource", foreign_keys=[legal_resource_id])

    __table_args__ = (
        UniqueConstraint("user_id", "legal_resource_id", name="ux_legal_bookmark_user_resource"),
        Index("idx_legal_bookmark_user_created", "user_id", "created_at"),
    )


class CounselingResource(Base):
    __tablename__ = "counseling_resources"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=False)
    contact = Column(String, nullable=True)
    website = Column(String, nullable=True)
    location = Column(String, nullable=True)
    is_online = Column(Boolean, default=False)


class SafePlace(Base):
    __tablename__ = "safe_places"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    place_type = Column(String, nullable=False, index=True)
    address = Column(String, nullable=False)
    city = Column(String, nullable=True, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    phone = Column(String, nullable=True)
    website = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    is_verified = Column(Boolean, default=False, index=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_safe_place_city_type', 'city', 'place_type'),
        Index('idx_safe_place_location', 'latitude', 'longitude'),
    )


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String, default="info", index=True)
    is_read = Column(Boolean, default=False, index=True)
    related_incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True)
    related_sos_id = Column(Integer, ForeignKey("sos_alerts.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    user = relationship("User", foreign_keys=[user_id])
    incident = relationship("Incident", foreign_keys=[related_incident_id], viewonly=True)
    sos = relationship("SOSAlert", foreign_keys=[related_sos_id], viewonly=True)
    
    __table_args__ = (
        Index('idx_notification_user_read', 'user_id', 'is_read'),
        Index('idx_notification_user_created', 'user_id', 'created_at'),
    )


class ChildSafetyTip(Base):
    __tablename__ = "child_safety_tips"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True)
    content = Column(Text, nullable=False)
    age_group = Column(String, nullable=True, index=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String, nullable=False)
    target_type = Column(String, nullable=True, index=True)
    target_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    admin = relationship("User", back_populates="activity_logs", foreign_keys=[admin_id])
    
    __table_args__ = (
        Index('idx_activity_log_created', 'created_at'),
        Index('idx_activity_log_admin', 'admin_id'),
    )


class FamilyLink(Base):
    """Link between a parent/guardian and a child/ward."""
    __tablename__ = "family_links"
    id = Column(Integer, primary_key=True, index=True)
    parent_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    child_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    requested_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(Enum(FamilyLinkStatus), default=FamilyLinkStatus.pending, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    accepted_at = Column(DateTime, nullable=True)
    parent = relationship("User", foreign_keys=[parent_user_id], back_populates="family_links_as_parent")
    child = relationship("User", foreign_keys=[child_user_id], back_populates="family_links_as_child")
    
    __table_args__ = (
        Index('idx_family_link_parent_status', 'parent_user_id', 'status'),
        Index('idx_family_link_child_status', 'child_user_id', 'status'),
        Index('idx_family_link_unique', 'parent_user_id', 'child_user_id'),
    )


class CounselingSession(Base):
    """A live audio/video counseling session between a user and a counselor."""
    __tablename__ = "counseling_sessions"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    counselor_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    call_type = Column(String, default="video")
    status = Column(Enum(SessionStatus), default=SessionStatus.waiting, index=True)
    scheduled_for = Column(DateTime, nullable=True, index=True)
    topic = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    user = relationship("User", foreign_keys=[user_id], backref="counseling_sessions_as_user")
    counselor = relationship("User", foreign_keys=[counselor_id], backref="counseling_sessions_as_counselor")
    
    __table_args__ = (
        Index('idx_counseling_session_user_status', 'user_id', 'status'),
        Index('idx_counseling_session_counselor', 'counselor_id'),
        Index('idx_counseling_session_schedule', 'status', 'scheduled_for'),
    )


class FamilyAlert(Base):
    """Auto-generated alert that goes to all linked parents when SOS is triggered."""
    __tablename__ = "family_alerts"
    id = Column(Integer, primary_key=True, index=True)
    child_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    parent_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    sos_alert_id = Column(Integer, ForeignKey("sos_alerts.id"), nullable=True, index=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    address = Column(String, nullable=True)
    selfie_data = Column(Text, nullable=True)
    message = Column(String, nullable=True)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    child = relationship("User", foreign_keys=[child_user_id], backref="family_alerts_as_child")
    parent = relationship("User", foreign_keys=[parent_user_id], backref="family_alerts_as_parent")
    sos = relationship("SOSAlert", back_populates="family_alerts", foreign_keys=[sos_alert_id])
    
    __table_args__ = (
        Index('idx_family_alert_parent_read', 'parent_user_id', 'is_read'),
        Index('idx_family_alert_child_created', 'child_user_id', 'created_at'),
    )
