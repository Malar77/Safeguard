from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db, SOSAlert, SOSLiveFrame, User, UserRole, FamilyLink, FamilyLinkStatus, FamilyAlert, Notification
from schemas import SOSCreate, SOSOut
from auth import get_current_user
from email_service import send_sos_alert_email
from datetime import datetime, timedelta
from typing import List, Optional
import base64
import threading

router = APIRouter(prefix="/api/sos", tags=["SOS"])

# Roles that are NOT allowed to trigger SOS (they monitor or manage)
_OBSERVER_ROLES = {UserRole.admin, UserRole.parent, UserRole.counselor}
_SOS_ACTIVE_WINDOW_MINUTES = 30


def _expire_stale_active_sos(db: Session) -> int:
    """Mark long-running active SOS alerts as resolved to avoid stale dashboard state."""
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


def _get_linked_parent_count(user_id: int, db: Session) -> int:
    """Check how many accepted parents are linked to this user."""
    count = db.query(FamilyLink).filter(
        FamilyLink.child_user_id == user_id,
        FamilyLink.status == FamilyLinkStatus.accepted
    ).count()
    return count


def _get_valid_parent_recipients(current_user: User, db: Session) -> List[User]:
    """Return unique, valid guardian recipients for SOS email fanout."""
    accepted_links = db.query(FamilyLink).filter(
        FamilyLink.child_user_id == current_user.id,
        FamilyLink.status == FamilyLinkStatus.accepted,
    ).all()

    current_email = (current_user.email or "").strip().lower()
    seen_emails = set()
    recipients: List[User] = []

    for link in accepted_links:
        parent_user = link.parent
        if not parent_user or not parent_user.is_active:
            continue
        if parent_user.id == current_user.id:
            continue

        parent_email = (parent_user.email or "").strip().lower()
        if not parent_email:
            continue
        if parent_email == current_email:
            continue
        if parent_email in seen_emails:
            continue

        seen_emails.add(parent_email)
        recipients.append(parent_user)

    return recipients


def _can_view_alert(current_user: User, alert: SOSAlert, db: Session) -> bool:
    if current_user.id == alert.user_id:
        return True
    if current_user.role in {UserRole.admin, UserRole.counselor}:
        return True
    return db.query(FamilyLink).filter(
        FamilyLink.parent_user_id == current_user.id,
        FamilyLink.child_user_id == alert.user_id,
        FamilyLink.status == FamilyLinkStatus.accepted,
    ).first() is not None


def _close_parent_sos_alerts(sos_alert_id: int, db: Session) -> None:
    """Mark parent-facing SOS fanout entries as read when SOS is resolved."""
    db.query(FamilyAlert).filter(
        FamilyAlert.sos_alert_id == sos_alert_id,
        FamilyAlert.is_read == False,
    ).update({"is_read": True}, synchronize_session=False)

    db.query(Notification).filter(
        Notification.related_sos_id == sos_alert_id,
        Notification.is_read == False,
    ).update({"is_read": True}, synchronize_session=False)


def _send_sos_email_async(
    recipient: User,
    child_name: str,
    message: Optional[str],
    latitude: Optional[float],
    longitude: Optional[float],
    address: Optional[str],
    triggered_at: Optional[datetime],
) -> None:
    """Dispatch guardian SOS email in background so /trigger is not blocked by SMTP latency."""

    def _worker() -> None:
        try:
            send_sos_alert_email(
                recipient=recipient,
                child_name=child_name,
                message=message,
                latitude=latitude,
                longitude=longitude,
                address=address,
                triggered_at=triggered_at,
            )
        except Exception as exc:
            print(f"[SOS] Background email send failed for {recipient.email}: {exc}")

    threading.Thread(target=_worker, daemon=True).start()


@router.post("/trigger", response_model=SOSOut)
def trigger_sos(data: SOSCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role in _OBSERVER_ROLES:
        raise HTTPException(
            status_code=403,
            detail=f"{current_user.role.value.title()} accounts cannot trigger SOS. Only child/women/user accounts can send emergency alerts."
        )
    
    # Require at least one linked parent for personal SOS flow.
    valid_parent_recipients = _get_valid_parent_recipients(current_user, db)
    if len(valid_parent_recipients) == 0:
        raise HTTPException(
            status_code=400,
            detail="No valid linked guardians found. Please link a parent/guardian account with a different email.",
        )

    if data.latitude is None or data.longitude is None:
        raise HTTPException(
            status_code=400,
            detail="Live location is required for SOS. Enable GPS and try again.",
        )

    # Keep only one active SOS per user by resolving any previous open alerts.
    existing_active_alerts = db.query(SOSAlert).filter(
        SOSAlert.user_id == current_user.id,
        SOSAlert.is_active == True,
    ).all()
    for old_alert in existing_active_alerts:
        old_alert.is_active = False
        if not old_alert.resolved_at:
            old_alert.resolved_at = datetime.utcnow()
        _close_parent_sos_alerts(old_alert.id, db)
    
    alert = SOSAlert(
        user_id=current_user.id,
        latitude=data.latitude,
        longitude=data.longitude,
        address=data.address,
        message=data.message,
        selfie_data=data.selfie_data,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    # Automatically fan out to all accepted linked parents.
    accepted_links = db.query(FamilyLink).filter(
        FamilyLink.child_user_id == current_user.id,
        FamilyLink.status == FamilyLinkStatus.accepted,
    ).all()

    valid_parent_by_id = {user.id: user for user in valid_parent_recipients}

    for link in accepted_links:
        parent_user = valid_parent_by_id.get(link.parent_user_id)
        if not parent_user:
            continue
        fam_alert = FamilyAlert(
            child_user_id=current_user.id,
            parent_user_id=link.parent_user_id,
            sos_alert_id=alert.id,
            latitude=data.latitude,
            longitude=data.longitude,
            address=data.address,
            selfie_data=data.selfie_data,
            message=data.message or f"EMERGENCY! {current_user.full_name} needs immediate help!",
        )
        db.add(fam_alert)

        # Create in-app guardian notification without blocking on SMTP.
        db.add(Notification(
            user_id=link.parent_user_id,
            title=f"SOS from {current_user.full_name}",
            message=f"{current_user.full_name} triggered SOS with live location and live video.",
            notification_type="sos_alert",
            related_sos_id=alert.id,
        ))

        _send_sos_email_async(
            recipient=parent_user,
            child_name=current_user.full_name,
            message=data.message,
            latitude=data.latitude,
            longitude=data.longitude,
            address=data.address,
            triggered_at=alert.created_at,
        )

    db.commit()
    
    return alert


@router.post("/resolve/{alert_id}")
def resolve_sos(alert_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    alert = db.query(SOSAlert).filter(
        SOSAlert.id == alert_id,
        SOSAlert.user_id == current_user.id
    ).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_active = False
    alert.resolved_at = datetime.utcnow()
    _close_parent_sos_alerts(alert.id, db)
    db.commit()
    return {"message": "SOS resolved", "alert_id": alert_id}


@router.post("/resolve-active")
def resolve_active_sos(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Resolve the caller's most-recent active SOS alert (fallback when alert_id is unknown)."""
    alert = db.query(SOSAlert).filter(
        SOSAlert.user_id == current_user.id,
        SOSAlert.is_active == True
    ).order_by(SOSAlert.created_at.desc()).first()
    if not alert:
        raise HTTPException(status_code=404, detail="No active SOS alert found")
    alert.is_active = False
    alert.resolved_at = datetime.utcnow()
    _close_parent_sos_alerts(alert.id, db)
    db.commit()
    return {"message": "SOS resolved", "alert_id": alert.id}


@router.get("/check-parents", summary="Check if user has linked parents for notifications")
def check_parents(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns parent count and details. Used by frontend to warn if no parents linked."""
    recipients = _get_valid_parent_recipients(current_user, db)

    parent_list = [
        {
            "parent_id": parent.id,
            "parent_name": parent.full_name,
            "parent_email": parent.email,
            "parent_phone": parent.phone,
        }
        for parent in recipients
    ]
    
    return {
        "has_parents": len(recipients) > 0,
        "parent_count": len(recipients),
        "parents": parent_list,
        "warning": "No valid linked guardians found. Alerts will NOT be sent to parents." if len(recipients) == 0 else None,
    }


@router.get("/my-alerts", response_model=List[SOSOut])
def my_alerts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(SOSAlert).filter(SOSAlert.user_id == current_user.id)\
             .order_by(SOSAlert.created_at.desc()).all()


@router.get("/{alert_id}/stream-frame")
def get_stream_frame(alert_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    alert = db.query(SOSAlert).filter(SOSAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if not _can_view_alert(current_user, alert, db):
        raise HTTPException(status_code=403, detail="Not allowed to view this alert")
    return {
        "alert_id": alert.id,
        "live_frame_data": alert.live_frame_data,
        "live_frame_updated_at": alert.live_frame_updated_at,
        "is_active": alert.is_active,
    }


@router.get("/{alert_id}/stream-frames")
def get_stream_frame_history(
    alert_id: int,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = db.query(SOSAlert).filter(SOSAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if not _can_view_alert(current_user, alert, db):
        raise HTTPException(status_code=403, detail="Not allowed to view this alert")

    safe_limit = max(1, min(limit, 500))
    frames = db.query(SOSLiveFrame).filter(
        SOSLiveFrame.sos_alert_id == alert_id,
    ).order_by(SOSLiveFrame.created_at.desc()).limit(safe_limit).all()

    return {
        "alert_id": alert_id,
        "frame_count": len(frames),
        "frames": [
            {
                "id": frame.id,
                "frame_number": frame.frame_number,
                "frame_data": frame.frame_data,
                "content_type": frame.content_type,
                "size_bytes": frame.size_bytes,
                "created_at": frame.created_at,
            }
            for frame in frames
        ],
    }


@router.get("/active", response_model=List[SOSOut])
def active_alerts(db: Session = Depends(get_db)):
    """Public endpoint for emergency services or admin"""
    if _expire_stale_active_sos(db) > 0:
        db.commit()
    return db.query(SOSAlert).filter(SOSAlert.is_active == True).all()


@router.post("/{alert_id}/stream-frame")
async def stream_video_frame(
    alert_id: int,
    frame: UploadFile = File(...),
    frame_number: int = Form(default=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Receive video frames from live video stream during SOS.
    
    Frames are stored and can be retrieved by linked parents/guardians
    to watch the live stream in real-time.
    """
    alert = db.query(SOSAlert).filter(
        SOSAlert.id == alert_id,
        SOSAlert.user_id == current_user.id
    ).first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    if not alert.is_active:
        raise HTTPException(status_code=400, detail="Alert is not active")
    
    try:
        frame_data = await frame.read()
        content_type = frame.content_type or "image/jpeg"
        encoded_frame = base64.b64encode(frame_data).decode('ascii')
        data_uri = f"data:{content_type};base64,{encoded_frame}"

        # Keep latest frame snapshot on SOS alert for fast dashboard polling.
        alert.live_frame_data = data_uri
        alert.live_frame_updated_at = datetime.utcnow()

        # Persist every frame so complete live transport is stored in DB.
        db.add(
            SOSLiveFrame(
                sos_alert_id=alert.id,
                child_user_id=current_user.id,
                frame_number=frame_number,
                frame_data=data_uri,
                content_type=content_type,
                size_bytes=len(frame_data),
                created_at=alert.live_frame_updated_at,
            )
        )
        db.commit()

        print(f"[SOS Live Stream] Alert {alert_id}: Frame {frame_number} ({len(frame_data)} bytes) stored")
        
        return {
            "status": "frame_received",
            "alert_id": alert_id,
            "frame_number": frame_number,
            "bytes_received": len(frame_data),
            "live_frame_updated_at": alert.live_frame_updated_at.isoformat(),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        print(f"[SOS Live Stream] Error processing frame: {e}")
        raise HTTPException(status_code=500, detail="Failed to process frame")
