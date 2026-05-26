from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from sqlalchemy.exc import IntegrityError
from database import (
    get_db,
    User,
    Incident,
    SOSAlert,
    IncidentType,
    ActivityLog,
    Notification,
    UserRole as UREnum,
    FamilyAlert,
    FamilyLink,
    CounselingSession,
)
from schemas import DashboardStats, UserOut, SOSOut, IncidentOut
from auth import require_admin
from email_service import create_notification
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr, Field

router = APIRouter(prefix="/api/admin", tags=["Admin"])


class CounselorCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=6)
    phone: Optional[str] = None


class NotificationSendIn(BaseModel):
    title: str
    message: str
    notification_type: str = "info"
    user_id: Optional[int] = None


_SOS_ACTIVE_WINDOW_MINUTES = 30


def _expire_stale_active_sos(db: Session) -> int:
    """Auto-resolve stale SOS alerts so dashboard shows current emergencies."""
    cutoff = datetime.utcnow() - timedelta(minutes=_SOS_ACTIVE_WINDOW_MINUTES)
    stale_alerts = db.query(SOSAlert).filter(
        SOSAlert.is_active == True,
        SOSAlert.created_at < cutoff,
    ).all()
    for alert in stale_alerts:
        alert.is_active = False
        if not alert.resolved_at:
            alert.resolved_at = datetime.utcnow()
    return len(stale_alerts)


def log_action(db: Session, admin_id: int, action: str, target_type: str = None, target_id: int = None, details: str = None):
    log = ActivityLog(admin_id=admin_id, action=action, target_type=target_type, target_id=target_id, details=details)
    db.add(log)


# ─── Dashboard Stats ─────────────────────────────────────────────────────

@router.get("/stats", response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db), admin=Depends(require_admin)):
    if _expire_stale_active_sos(db) > 0:
        db.commit()

    total_users = db.query(User).count()
    total_incidents = db.query(Incident).count()
    active_sos = db.query(SOSAlert).filter(SOSAlert.is_active == True).count()
    pending = db.query(Incident).filter(Incident.status == "pending").count()
    resolved = db.query(Incident).filter(Incident.status == "resolved").count()
    type_counts = {}
    for inc_type in IncidentType:
        count = db.query(Incident).filter(Incident.incident_type == inc_type).count()
        type_counts[inc_type.value] = count
    return DashboardStats(
        total_users=total_users,
        total_incidents=total_incidents,
        active_sos=active_sos,
        pending_incidents=pending,
        resolved_incidents=resolved,
        incidents_by_type=type_counts,
    )


# ─── User Management ─────────────────────────────────────────────────────

@router.get("/users", response_model=List[UserOut])
def get_all_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    query = db.query(User)
    if search:
        query = query.filter(
            User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
        )
    if role:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    return query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/users/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/users/{user_id}/toggle-active")
def toggle_user(user_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    log_action(db, admin.id, "toggle_user", "user", user_id, f"Set is_active={user.is_active}")
    db.commit()
    return {"message": f"User {'activated' if user.is_active else 'deactivated'}", "is_active": user.is_active}


@router.patch("/users/{user_id}/role")
def update_role(user_id: int, role: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    if role not in [r.value for r in UREnum]:
        raise HTTPException(status_code=400, detail="Invalid role. Valid: user, admin, counselor")
    if role == UREnum.counselor.value:
        raise HTTPException(
            status_code=400,
            detail="Counselor role cannot be assigned here. Use /api/admin/counselors to create personal counselor accounts.",
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    old_role = user.role
    user.role = role
    log_action(db, admin.id, "update_role", "user", user_id, f"Changed role {old_role} -> {role}")
    db.commit()
    return {"message": "Role updated", "role": role}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == UREnum.admin:
        raise HTTPException(status_code=400, detail="Cannot delete admin account")

    try:
        # Clean dependent records that don't have cascade rules on backrefs.
        db.query(FamilyAlert).filter(
            (FamilyAlert.child_user_id == user_id) | (FamilyAlert.parent_user_id == user_id)
        ).delete(synchronize_session=False)

        db.query(FamilyLink).filter(
            (FamilyLink.child_user_id == user_id)
            | (FamilyLink.parent_user_id == user_id)
            | (FamilyLink.requested_by_id == user_id)
        ).delete(synchronize_session=False)

        db.query(CounselingSession).filter(CounselingSession.user_id == user_id).delete(synchronize_session=False)
        db.query(CounselingSession).filter(CounselingSession.counselor_id == user_id).update(
            {CounselingSession.counselor_id: None}, synchronize_session=False
        )

        db.query(Notification).filter(Notification.user_id == user_id).delete(synchronize_session=False)

        log_action(db, admin.id, "delete_user", "user", user_id, f"Deleted user {user.email}")
        db.delete(user)
        db.commit()
        return {"message": "User deleted"}
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Cannot delete this user due to related records. Resolve linked data first.",
        )


# ─── SOS Alerts ──────────────────────────────────────────────────────────

@router.get("/sos-alerts", response_model=List[SOSOut])
def get_all_sos(
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    if _expire_stale_active_sos(db) > 0:
        db.commit()

    query = db.query(SOSAlert)
    if is_active is not None:
        query = query.filter(SOSAlert.is_active == is_active)
    return query.order_by(SOSAlert.created_at.desc()).offset(skip).limit(limit).all()


@router.patch("/sos-alerts/{alert_id}/resolve")
def admin_resolve_sos(alert_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    alert = db.query(SOSAlert).filter(SOSAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_active = False
    alert.resolved_at = datetime.utcnow()
    # Notify user
    create_notification(
        db,
        user_id=alert.user_id,
        title="SOS Alert Resolved",
        message="Your SOS alert has been marked as resolved by our team. Hope you are safe.",
        notification_type="resolved",
        related_sos_id=alert.id,
    )
    log_action(db, admin.id, "resolve_sos", "sos", alert_id)
    db.commit()
    return {"message": "SOS resolved by admin", "alert_id": alert_id}


@router.delete("/sos-alerts/{alert_id}")
def delete_sos(alert_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    alert = db.query(SOSAlert).filter(SOSAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    log_action(db, admin.id, "delete_sos", "sos", alert_id)
    db.delete(alert)
    db.commit()
    return {"message": "SOS alert deleted"}


# ─── Incidents ───────────────────────────────────────────────────────────

@router.get("/incidents", response_model=List[IncidentOut])
def admin_get_incidents(
    status: Optional[str] = None,
    incident_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    query = db.query(Incident)
    if status:
        query = query.filter(Incident.status == status)
    if incident_type:
        query = query.filter(Incident.incident_type == incident_type)
    return query.order_by(Incident.created_at.desc()).offset(skip).limit(limit).all()


# ─── Activity Logs ───────────────────────────────────────────────────────

@router.get("/activity-logs")
def get_activity_logs(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    logs = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).offset(skip).limit(limit).all()
    return [{"id": l.id, "admin_id": l.admin_id, "action": l.action,
             "target_type": l.target_type, "target_id": l.target_id,
             "details": l.details, "created_at": l.created_at.isoformat()} for l in logs]


# ─── Notifications (Send to User) ────────────────────────────────────────

@router.post("/notifications/send")
def send_notification(
    data: NotificationSendIn,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    # Single-user send
    if data.user_id is not None:
        user = db.query(User).filter(User.id == data.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        create_notification(
            db,
            user_id=data.user_id,
            title=data.title,
            message=data.message,
            notification_type=data.notification_type,
        )
        log_action(db, admin.id, "send_notification", "user", data.user_id, f"Sent: {data.title}")
        db.commit()
        return {"message": "Notification sent", "count": 1}

    # Broadcast send to all active users
    users = db.query(User).filter(User.is_active == True).all()
    if not users:
        return {"message": "No active users to notify", "count": 0}

    for u in users:
        create_notification(
            db,
            user_id=u.id,
            title=data.title,
            message=data.message,
            notification_type=data.notification_type,
        )

    log_action(db, admin.id, "broadcast_notification", "user", None, f"Broadcast: {data.title}")
    db.commit()
    return {"message": "Broadcast sent", "count": len(users)}



# ─── Counselor Management (Admin Only) ───────────────────────────────────

@router.post("/counselors")
def create_counselor(
    data: CounselorCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    from auth import hash_password

    email = data.email.strip().lower()
    existing = db.query(User).filter(func.lower(User.email) == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    counselor = User(
        full_name=data.full_name,
        email=email,
        phone=(data.phone or None),
        hashed_password=hash_password(data.password),
        role=UREnum.counselor,
        is_active=True,
    )
    db.add(counselor)
    db.commit()
    db.refresh(counselor)
    log_action(db, admin.id, "create_counselor", "user", counselor.id, "Created counselor: " + email)
    db.commit()
    return {
        "id": counselor.id,
        "full_name": counselor.full_name,
        "email": counselor.email,
        "phone": counselor.phone,
        "role": counselor.role.value,
        "is_active": counselor.is_active,
        "created_at": str(counselor.created_at),
    }


@router.get("/counselors")
def list_counselors_admin(db: Session = Depends(get_db), _=Depends(require_admin)):
    from database import CounselingSession, SessionStatus
    counselors = db.query(User).filter(User.role == UREnum.counselor).order_by(User.created_at.desc()).all()
    result = []
    for c in counselors:
        total  = db.query(CounselingSession).filter(CounselingSession.counselor_id == c.id).count()
        active = db.query(CounselingSession).filter(CounselingSession.counselor_id == c.id, CounselingSession.status == SessionStatus.active).count()
        result.append({"id": c.id, "full_name": c.full_name, "email": c.email, "phone": c.phone, "is_active": c.is_active, "total_sessions": total, "active_now": active > 0, "created_at": str(c.created_at)})
    return result


@router.delete("/counselors/{counselor_id}")
def delete_counselor(counselor_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    counselor = db.query(User).filter(User.id == counselor_id, User.role == UREnum.counselor).first()
    if not counselor:
        raise HTTPException(status_code=404, detail="Counselor not found")
    log_action(db, admin.id, "delete_counselor", "user", counselor_id, "Removed: " + counselor.email)
    db.delete(counselor)
    db.commit()
    return {"message": "Counselor removed"}


@router.patch("/counselors/{counselor_id}/toggle-active")
def toggle_counselor_active(counselor_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    counselor = db.query(User).filter(User.id == counselor_id, User.role == UREnum.counselor).first()
    if not counselor:
        raise HTTPException(status_code=404, detail="Counselor not found")
    counselor.is_active = not counselor.is_active
    status_str = "activated" if counselor.is_active else "deactivated"
    log_action(db, admin.id, "toggle_counselor", "user", counselor_id, "is_active=" + str(counselor.is_active))
    db.commit()
    return {"message": "Counselor " + status_str, "is_active": counselor.is_active}
