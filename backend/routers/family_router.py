"""
Family / Guardian Router
------------------------
Handles parent-child linking and family alert delivery.
When a child/ward triggers SOS the frontend also calls POST /api/family/alert
which stores the location + live video clip and marks alerts for every linked parent.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, User, UserRole, FamilyLink, FamilyLinkStatus, FamilyAlert, Incident, Notification
from schemas import (
    FamilyLinkRequest, FamilyLinkOut,
    FamilyAlertCreate, FamilyAlertOut,
)
from auth import get_current_user
from email_service import create_notification
from datetime import datetime, timedelta
from typing import List

router = APIRouter(prefix="/api/family", tags=["Family / Guardian"])
_SOS_ACTIVE_WINDOW_MINUTES = 30


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _link_to_out(link: FamilyLink) -> dict:
    return {
        "id": link.id,
        "parent_user_id": link.parent_user_id,
        "child_user_id":  link.child_user_id,
        "status":         link.status,
        "created_at":     link.created_at,
        "accepted_at":    link.accepted_at,
        "parent_name":    link.parent.full_name  if link.parent else None,
        "parent_email":   link.parent.email      if link.parent else None,
        "parent_role":    link.parent.role.value if link.parent and link.parent.role else None,
        "child_name":     link.child.full_name   if link.child  else None,
        "child_email":    link.child.email       if link.child  else None,
        "child_phone":    link.child.phone       if link.child  else None,
        "child_role":     link.child.role.value  if link.child and link.child.role else None,
    }


def _is_recent_active_sos(alert: FamilyAlert) -> bool:
    if not alert.sos or not alert.sos.is_active:
        return False

    reference_time = alert.sos.live_frame_updated_at or alert.sos.created_at or alert.created_at
    if not reference_time:
        return True

    return (datetime.utcnow() - reference_time) <= timedelta(minutes=_SOS_ACTIVE_WINDOW_MINUTES)


def _alert_to_out(alert: FamilyAlert) -> dict:
    return {
        "id":              alert.id,
        "child_user_id":   alert.child_user_id,
        "parent_user_id":  alert.parent_user_id,
        "sos_alert_id":    alert.sos_alert_id,
        "latitude":        alert.latitude,
        "longitude":       alert.longitude,
        "address":         alert.address,
        "selfie_data":     alert.selfie_data,
        "live_frame_data":  alert.sos.live_frame_data if alert.sos else None,
        "live_frame_updated_at": alert.sos.live_frame_updated_at if alert.sos else None,
        "sos_is_active":    _is_recent_active_sos(alert),
        "message":         alert.message,
        "is_read":         alert.is_read,
        "created_at":      alert.created_at,
        "child_name":      alert.child.full_name if alert.child else None,
        "child_phone":     alert.child.phone     if alert.child else None,
    }


# ─── Linking ─────────────────────────────────────────────────────────────────

@router.post("/request-link", summary="Child sends link request to a parent email")
def request_link(
    data: FamilyLinkRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """The currently-logged-in user (child/ward) asks to link with a parent."""
    parent = db.query(User).filter(User.email == data.parent_email).first()
    if not parent:
        raise HTTPException(status_code=404, detail="No user found with that email address.")
    if parent.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot link with yourself.")

    # check if link already exists
    existing = db.query(FamilyLink).filter(
        FamilyLink.parent_user_id == parent.id,
        FamilyLink.child_user_id  == current_user.id,
    ).first()
    if existing:
        if existing.status == FamilyLinkStatus.accepted:
            raise HTTPException(status_code=400, detail="Already linked with this guardian.")
        if existing.status == FamilyLinkStatus.pending:
            raise HTTPException(status_code=400, detail="A pending request already exists.")
        # if rejected, allow re-request
        existing.status = FamilyLinkStatus.pending
        existing.created_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return {"message": "Link request re-sent.", "link_id": existing.id}

    link = FamilyLink(
        parent_user_id=parent.id,
        child_user_id=current_user.id,
        requested_by_id=current_user.id,
        status=FamilyLinkStatus.pending,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    
    # Send notification to parent
    create_notification(
        db,
        user_id=parent.id,
        title=f"Family Link Request from {current_user.full_name}",
        message=f"{current_user.full_name} ({current_user.email}) wants to link with you as a guardian. Please confirm or reject this request.",
        notification_type="family_link_request",
    )
    db.commit()
    
    return {"message": "Link request sent to guardian.", "link_id": link.id}


@router.get("/pending-requests", summary="Parent: see pending link requests awaiting acceptance")
def pending_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    links = db.query(FamilyLink).filter(
        FamilyLink.parent_user_id == current_user.id,
        FamilyLink.status == FamilyLinkStatus.pending,
    ).all()
    return [_link_to_out(l) for l in links]


@router.post("/accept/{link_id}", summary="Parent accepts a pending link request")
def accept_link(
    link_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    link = db.query(FamilyLink).filter(
        FamilyLink.id == link_id,
        FamilyLink.parent_user_id == current_user.id,
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link request not found.")
    link.status = FamilyLinkStatus.accepted
    link.accepted_at = datetime.utcnow()
    db.commit()
    return {"message": "Link accepted. You will now receive alerts from this ward."}


@router.post("/reject/{link_id}", summary="Parent rejects a pending link request")
def reject_link(
    link_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    link = db.query(FamilyLink).filter(
        FamilyLink.id == link_id,
        FamilyLink.parent_user_id == current_user.id,
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link request not found.")
    link.status = FamilyLinkStatus.rejected
    db.commit()
    return {"message": "Link rejected."}


@router.delete("/unlink/{link_id}", summary="Either party can remove an existing link")
def unlink(
    link_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    link = db.query(FamilyLink).filter(
        FamilyLink.id == link_id,
        (FamilyLink.parent_user_id == current_user.id) |
        (FamilyLink.child_user_id  == current_user.id),
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found.")
    db.delete(link)
    db.commit()
    return {"message": "Link removed."}


@router.get("/my-parents", summary="Child: list all accepted parent/guardian links")
def my_parents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    links = db.query(FamilyLink).filter(
        FamilyLink.child_user_id == current_user.id,
        FamilyLink.status == FamilyLinkStatus.accepted,
    ).all()
    return [_link_to_out(l) for l in links]


@router.get("/my-children", summary="Parent: list all accepted child/ward links")
def my_children(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    links = db.query(FamilyLink).filter(
        FamilyLink.parent_user_id == current_user.id,
        FamilyLink.status == FamilyLinkStatus.accepted,
    ).all()
    return [_link_to_out(l) for l in links]


@router.get("/all-my-links", summary="Get all family links (both as parent and child)")
def all_my_links(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    as_child  = db.query(FamilyLink).filter(FamilyLink.child_user_id  == current_user.id).all()
    as_parent = db.query(FamilyLink).filter(FamilyLink.parent_user_id == current_user.id).all()
    return {
        "as_child":  [_link_to_out(l) for l in as_child],
        "as_parent": [_link_to_out(l) for l in as_parent],
    }


# ─── Family Alerts ────────────────────────────────────────────────────────────

@router.post("/alert", summary="Child triggers family alert (location + live video) to all linked parents")
def create_family_alert(
    data: FamilyAlertCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Called automatically when the child/ward triggers SOS on the frontend.
    Creates one FamilyAlert row per accepted parent.
    """
    parents = db.query(FamilyLink).filter(
        FamilyLink.child_user_id == current_user.id,
        FamilyLink.status == FamilyLinkStatus.accepted,
    ).all()

    if not parents:
        return {"message": "No linked guardians found. Alert not delivered.", "count": 0}

    created = []
    for link in parents:
        alert = FamilyAlert(
            child_user_id=current_user.id,
            parent_user_id=link.parent_user_id,
            sos_alert_id=data.sos_alert_id,
            latitude=data.latitude,
            longitude=data.longitude,
            address=data.address,
            selfie_data=data.selfie_data,
            message=data.message or f"EMERGENCY! {current_user.full_name} needs immediate help!",
        )
        db.add(alert)
        created.append(link.parent_user_id)

    db.commit()
    return {
        "message": f"Family alert sent to {len(created)} guardian(s).",
        "notified_parent_ids": created,
    }


@router.get("/alerts", summary="Parent: get all family alerts from linked children")
def get_family_alerts(
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(FamilyAlert).filter(FamilyAlert.parent_user_id == current_user.id)
    if unread_only:
        query = query.filter(FamilyAlert.is_read == False)
    alerts = query.order_by(FamilyAlert.created_at.desc()).all()
    return [_alert_to_out(a) for a in alerts]


@router.get("/alerts/unread-count", summary="Parent: unread alert count")
def unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = db.query(FamilyAlert).filter(
        FamilyAlert.parent_user_id == current_user.id,
        FamilyAlert.is_read == False,
    ).count()
    return {"unread_count": count}


@router.post("/alerts/{alert_id}/read", summary="Parent marks a family alert as read")
def mark_alert_read(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a specific alert as read. Supports both POST and PATCH methods for compatibility."""
    alert = db.query(FamilyAlert).filter(
        FamilyAlert.id == alert_id,
        FamilyAlert.parent_user_id == current_user.id,
    ).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")
    alert.is_read = True
    db.commit()
    return {"message": "Marked as read.", "alert_id": alert_id}


@router.post("/alerts/mark-all-read", summary="Parent marks all family alerts as read")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all unread alerts as read. Supports both POST and PATCH methods for compatibility."""
    count = db.query(FamilyAlert).filter(
        FamilyAlert.parent_user_id == current_user.id,
        FamilyAlert.is_read == False,
    ).count()
    db.query(FamilyAlert).filter(
        FamilyAlert.parent_user_id == current_user.id,
        FamilyAlert.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"message": "All alerts marked as read.", "count": count}


@router.delete("/alerts/{alert_id}", summary="Parent deletes a family alert")
def delete_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = db.query(FamilyAlert).filter(
        FamilyAlert.id == alert_id,
        FamilyAlert.parent_user_id == current_user.id,
    ).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")
    db.delete(alert)
    db.commit()
    return {"message": "Alert deleted."}


# ─── Ward Incidents ───────────────────────────────────────────────────────────

@router.get("/ward-incidents", summary="Parent: view non-anonymous incidents reported by linked wards")
def ward_incidents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all non-anonymous incidents filed by the current parent's accepted wards."""
    links = db.query(FamilyLink).filter(
        FamilyLink.parent_user_id == current_user.id,
        FamilyLink.status == FamilyLinkStatus.accepted,
    ).all()
    child_ids = [lnk.child_user_id for lnk in links]
    if not child_ids:
        return []
    incidents = (
        db.query(Incident)
        .filter(
            Incident.reporter_id.in_(child_ids),
            Incident.is_anonymous == False,
        )
        .order_by(Incident.created_at.desc())
        .all()
    )
    child_map = {
        u.id: u.full_name
        for u in db.query(User).filter(User.id.in_(child_ids)).all()
    }
    return [
        {
            "id": inc.id,
            "title": inc.title,
            "incident_type": inc.incident_type,
            "description": inc.description,
            "location": inc.location,
            "status": inc.status,
            "created_at": str(inc.created_at),
            "reporter_id": inc.reporter_id,
            "reporter_name": child_map.get(inc.reporter_id, "Unknown"),
        }
        for inc in incidents
    ]
