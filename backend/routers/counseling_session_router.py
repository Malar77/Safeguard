"""
Counseling Session Router
--------------------------
REST endpoints to create / manage counseling sessions, plus a WebSocket-based
WebRTC signalling channel so browser peers can exchange SDP offers/answers and
ICE candidates without a media server.

Flow:
 1. User calls  POST /api/sessions/       → gets back a room_id
 2. User opens  WS   /api/sessions/ws/{room_id}?token=<jwt>
 3. Counselor calls  GET /api/sessions/waiting → sees available sessions
 4. Counselor opens  WS  /api/sessions/ws/{room_id}?token=<jwt>
 5. Both peers exchange { type, data } JSON frames over the WebSocket:
      { "type": "offer",       "data": <SDP> }
      { "type": "answer",      "data": <SDP> }
      { "type": "ice",         "data": <ICE candidate JSON> }
      { "type": "end_call",    "data": null  }
      { "type": "peer_joined", "data": null  }   ← server-sent
      { "type": "peer_left",   "data": null  }   ← server-sent
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database import get_db, User, UserRole, CounselingSession, SessionStatus, Notification
from auth import get_current_user, create_access_token
from email_service import (
    create_notification,
    send_counseling_request_email,
    send_counseling_response_email,
)
from schemas import CounselingAppointmentCreate, CounselingAppointmentAction
from jose import JWTError, jwt

SECRET_KEY = "safeguard_secret_key_change_in_production_2024"
ALGORITHM  = "HS256"

router = APIRouter(prefix="/api/sessions", tags=["Counseling Sessions"])


# ─── In-memory WebSocket room registry ───────────────────────────────────────
# rooms: { room_id -> { user_id: WebSocket } }
rooms: Dict[str, Dict[int, WebSocket]] = {}


def _parse_scheduled_for(raw: str | None):
    if not raw:
        return None
    text = raw.strip()
    if not text:
        return None
    try:
        dt = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scheduled_for datetime format")

    if dt.tzinfo is not None:
        dt = dt.astimezone().replace(tzinfo=None)
    return dt


def _session_to_out(session: CounselingSession, db: Session):
    user = db.query(User).filter(User.id == session.user_id).first()
    counselor = db.query(User).filter(User.id == session.counselor_id).first() if session.counselor_id else None
    duration = None
    if session.started_at and session.ended_at:
        duration = int((session.ended_at - session.started_at).total_seconds() // 60)

    can_start = False
    if session.status == SessionStatus.appointment_accepted:
        can_start = (session.scheduled_for is None) or (session.scheduled_for <= datetime.utcnow())

    return {
        "room_id": session.room_id,
        "call_type": session.call_type,
        "status": session.status,
        "scheduled_for": str(session.scheduled_for) if session.scheduled_for else None,
        "topic": session.topic,
        "notes": session.notes,
        "user_name": user.full_name if user else "Anonymous",
        "user_email": user.email if user else None,
        "counselor_id": session.counselor_id,
        "counselor_name": counselor.full_name if counselor else None,
        "started_at": str(session.started_at) if session.started_at else None,
        "ended_at": str(session.ended_at) if session.ended_at else None,
        "duration_mins": duration,
        "can_start": can_start,
        "created_at": str(session.created_at),
    }


def _get_user_from_token(token: str, db: Session) -> User:
    """Validate JWT and return User (used in WS handshake, no Depends)."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise ValueError()
    except (JWTError, ValueError):
        return None
    return db.query(User).filter(User.email == email, User.is_active == True).first()


# ─── REST endpoints ──────────────────────────────────────────────────────────

@router.get("/counselors", summary="List all counselor-role users with their session stats")
def list_counselors(db: Session = Depends(get_db)):
    """Public endpoint — returns all active counselor accounts with stats."""
    counselors = db.query(User).filter(
        User.role == UserRole.counselor,
        User.is_active == True,
    ).all()
    result = []
    for c in counselors:
        total = db.query(CounselingSession).filter(CounselingSession.counselor_id == c.id).count()
        active = db.query(CounselingSession).filter(
            CounselingSession.counselor_id == c.id,
            CounselingSession.status == SessionStatus.active,
        ).count()
        result.append({
            "id":            c.id,
            "full_name":     c.full_name,
            "email":         c.email,
            "phone":         c.phone,
            "is_active":     c.is_active,
            "total_sessions": total,
            "active_now":    active > 0,
            "joined_at":     str(c.created_at),
        })
    return result


@router.get("/counselor/dashboard", summary="Counselor's own dashboard stats")
def counselor_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.counselor:
        raise HTTPException(status_code=403, detail="Counselor accounts only")
    total   = db.query(CounselingSession).filter(CounselingSession.counselor_id == current_user.id).count()
    active  = db.query(CounselingSession).filter(
        CounselingSession.counselor_id == current_user.id,
        CounselingSession.status == SessionStatus.active,
    ).count()
    ended   = db.query(CounselingSession).filter(
        CounselingSession.counselor_id == current_user.id,
        CounselingSession.status == SessionStatus.ended,
    ).count()
    waiting = db.query(CounselingSession).filter(
        CounselingSession.status == SessionStatus.waiting,
        or_(CounselingSession.scheduled_for == None, CounselingSession.scheduled_for <= datetime.utcnow()),
    ).count()
    upcoming = db.query(CounselingSession).filter(
        or_(
            CounselingSession.status == SessionStatus.appointment_pending,
            CounselingSession.status == SessionStatus.appointment_accepted,
            (CounselingSession.status == SessionStatus.waiting) & (CounselingSession.scheduled_for > datetime.utcnow()),
        ),
        or_(CounselingSession.counselor_id == None, CounselingSession.counselor_id == current_user.id),
    ).count()
    recent = db.query(CounselingSession).filter(
        CounselingSession.counselor_id == current_user.id,
    ).order_by(CounselingSession.created_at.desc()).limit(10).all()
    recent_out = []
    for s in recent:
        u = db.query(User).filter(User.id == s.user_id).first()
        duration = None
        if s.started_at and s.ended_at:
            duration = int((s.ended_at - s.started_at).total_seconds() // 60)
        recent_out.append({
            "room_id": s.room_id,
            "call_type": s.call_type,
            "status": s.status,
            "user_name": u.full_name if u else "Anonymous",
            "user_email": u.email if u else None,
            "scheduled_for": str(s.scheduled_for) if s.scheduled_for else None,
            "started_at": str(s.started_at) if s.started_at else None,
            "ended_at": str(s.ended_at) if s.ended_at else None,
            "duration_mins": duration,
            "created_at": str(s.created_at),
        })
    return {
        "total_sessions":   total,
        "active_sessions":  active,
        "completed_sessions": ended,
        "waiting_queue":    waiting,
        "upcoming_appointments": upcoming,
        "recent_sessions":  recent_out,
    }


@router.get("/counselor/sessions", summary="Counselor's full session history")
def counselor_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.counselor:
        raise HTTPException(status_code=403, detail="Counselor accounts only")
    sessions = db.query(CounselingSession).filter(
        CounselingSession.counselor_id == current_user.id,
    ).order_by(CounselingSession.created_at.desc()).all()
    result = []
    for s in sessions:
        u = db.query(User).filter(User.id == s.user_id).first()
        duration = None
        if s.started_at and s.ended_at:
            duration = int((s.ended_at - s.started_at).total_seconds() // 60)
        result.append({
            "room_id": s.room_id,
            "call_type": s.call_type,
            "status": s.status,
            "user_name": u.full_name if u else "Anonymous",
            "scheduled_for": str(s.scheduled_for) if s.scheduled_for else None,
            "topic": s.topic,
            "started_at": str(s.started_at) if s.started_at else None,
            "ended_at": str(s.ended_at) if s.ended_at else None,
            "duration_mins": duration,
            "created_at": str(s.created_at),
        })
    return result


@router.post("/", summary="Create a new counseling session room")
def create_session(
    call_type: str = "video",
    counselor_id: int | None = None,
    scheduled_for: str | None = None,
    topic: str | None = None,
    notes: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if call_type not in ("audio", "video"):
        raise HTTPException(status_code=400, detail="call_type must be 'audio' or 'video'")

    scheduled_dt = _parse_scheduled_for(scheduled_for)
    if scheduled_dt and scheduled_dt < datetime.utcnow() - timedelta(minutes=1):
        raise HTTPException(status_code=400, detail="scheduled_for cannot be in the past")

    assigned_counselor_id = counselor_id
    counselor = None
    if counselor_id is not None:
        counselor = db.query(User).filter(
            User.id == counselor_id,
            User.role == UserRole.counselor,
            User.is_active == True,
        ).first()
        if not counselor:
            raise HTTPException(status_code=404, detail="Selected counselor is not available")

    room_id = str(uuid.uuid4())
    session = CounselingSession(
        room_id=room_id,
        user_id=current_user.id,
        counselor_id=assigned_counselor_id,
        call_type=call_type,
        status=SessionStatus.waiting,
        scheduled_for=scheduled_dt,
        topic=(topic or "").strip()[:200] or None,
        notes=(notes or "").strip()[:2000] or None,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    if counselor:
        send_counseling_request_email(
            counselor=counselor,
            requester=current_user,
            scheduled_for=session.scheduled_for,
            topic=session.topic,
            room_id=room_id,
        )
    return _session_to_out(session, db)


@router.get("/waiting", summary="List sessions waiting for a counselor")
def waiting_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in (UserRole.counselor, UserRole.admin):
        raise HTTPException(status_code=403, detail="Counselor or admin access required")

    sessions = (
        db.query(CounselingSession)
        .filter(CounselingSession.status == SessionStatus.waiting)
        .filter(or_(CounselingSession.scheduled_for == None, CounselingSession.scheduled_for <= datetime.utcnow()))
        .filter(or_(CounselingSession.counselor_id == None, CounselingSession.counselor_id == current_user.id))
        .order_by(CounselingSession.created_at)
        .all()
    )
    result = []
    for s in sessions:
        user = db.query(User).filter(User.id == s.user_id).first()
        result.append({
            "room_id":    s.room_id,
            "call_type":  s.call_type,
            "user_name":  user.full_name if user else "Anonymous",
            "scheduled_for": str(s.scheduled_for) if s.scheduled_for else None,
            "topic": s.topic,
            "created_at": str(s.created_at),
        })
    return result


@router.get("/appointments/my", summary="Current user's counseling appointments")
def my_appointments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == UserRole.counselor:
        sessions = db.query(CounselingSession).filter(
            CounselingSession.counselor_id == current_user.id,
            CounselingSession.status.in_([SessionStatus.waiting, SessionStatus.active, SessionStatus.ended, SessionStatus.cancelled, SessionStatus.appointment_pending, SessionStatus.appointment_accepted]),
        ).all()
    else:
        sessions = db.query(CounselingSession).filter(
            CounselingSession.user_id == current_user.id,
            CounselingSession.status.in_([SessionStatus.waiting, SessionStatus.active, SessionStatus.ended, SessionStatus.cancelled, SessionStatus.appointment_pending, SessionStatus.appointment_accepted]),
        ).all()

    sessions.sort(key=lambda s: (s.scheduled_for or s.created_at), reverse=True)
    return [_session_to_out(s, db) for s in sessions]


@router.post("/appointment", summary="Book a counseling appointment with a specific counselor")
def book_appointment(
    appointment: CounselingAppointmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """User books an appointment with a specific counselor."""
    # Verify counselor exists and is active
    counselor = db.query(User).filter(
        User.id == appointment.counselor_id,
        User.role == UserRole.counselor,
        User.is_active == True,
    ).first()
    if not counselor:
        raise HTTPException(status_code=404, detail="Counselor not found or unavailable")
    
    scheduled_for = appointment.scheduled_for
    if scheduled_for.tzinfo is not None:
        scheduled_for = scheduled_for.astimezone(timezone.utc).replace(tzinfo=None)

    # Validate scheduled time is not in the past
    if scheduled_for < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Appointment time cannot be in the past")
    
    # Create counseling session with appointment_pending status
    room_id = str(uuid.uuid4())
    session = CounselingSession(
        room_id=room_id,
        user_id=current_user.id,
        counselor_id=appointment.counselor_id,
        call_type="video",
        status=SessionStatus.appointment_pending,
        scheduled_for=scheduled_for,
        topic=appointment.topic,
        notes=appointment.notes,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    # Create notification for counselor
    create_notification(
        db,
        user_id=appointment.counselor_id,
        title=f"New Appointment Request from {current_user.full_name}",
        message=f"{current_user.full_name} requested an appointment on {scheduled_for.strftime('%Y-%m-%d %H:%M')} about '{appointment.topic}'",
        notification_type="appointment_request",
    )
    db.commit()
    
    return _session_to_out(session, db)


@router.get("/appointments/pending", summary="Pending appointment requests for counselor")
def pending_appointments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Counselor views all pending appointment requests."""
    if current_user.role != UserRole.counselor:
        raise HTTPException(status_code=403, detail="Counselor access only")
    
    sessions = db.query(CounselingSession).filter(
        CounselingSession.counselor_id == current_user.id,
        CounselingSession.status == SessionStatus.appointment_pending,
    ).order_by(CounselingSession.scheduled_for).all()
    
    return [_session_to_out(s, db) for s in sessions]


@router.post("/{room_id}/respond", summary="Counselor accepts or rejects appointment")
def respond_to_appointment(
    room_id: str,
    action_payload: CounselingAppointmentAction,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Counselor accepts or rejects a pending appointment request."""
    session = db.query(CounselingSession).filter(
        CounselingSession.room_id == room_id,
        CounselingSession.status == SessionStatus.appointment_pending,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Appointment not found or already responded")
    
    if session.counselor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to respond to this appointment")
    
    action = action_payload.action.lower()
    appointment_user = db.query(User).filter(User.id == session.user_id).first()
    if action == "accept":
        session.status = SessionStatus.appointment_accepted
        # Create notification for user
        create_notification(
            db,
            user_id=session.user_id,
            title=f"Appointment Accepted by {current_user.full_name}",
            message=f"{current_user.full_name} accepted your appointment request for {session.scheduled_for.strftime('%Y-%m-%d %H:%M')}. Join the call when ready!",
            notification_type="appointment_accepted",
        )

        if appointment_user:
            send_counseling_response_email(
                user=appointment_user,
                counselor_name=current_user.full_name,
                scheduled_for=session.scheduled_for,
                topic=session.topic,
                room_id=session.room_id,
                accepted=True,
            )
    
    elif action == "reject":
        session.status = SessionStatus.rejected
        session.ended_at = datetime.utcnow()
        # Create notification for user
        create_notification(
            db,
            user_id=session.user_id,
            title=f"Appointment Declined by {current_user.full_name}",
            message=f"{current_user.full_name} declined your appointment request. {action_payload.response_notes or 'Please try booking with another counselor.'}",
            notification_type="appointment_rejected",
        )

        if appointment_user:
            send_counseling_response_email(
                user=appointment_user,
                counselor_name=current_user.full_name,
                scheduled_for=session.scheduled_for,
                topic=session.topic,
                room_id=session.room_id,
                accepted=False,
                response_notes=action_payload.response_notes,
            )
    else:
        raise HTTPException(status_code=400, detail="Action must be 'accept' or 'reject'")
    
    db.commit()
    db.refresh(session)
    
    return {
        "status": "success",
        "room_id": room_id,
        "action": action,
        "session_status": session.status,
        "message": f"Appointment {action}ed successfully"
    }


@router.get("/my", summary="Current user's counseling session history")
def my_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sessions = (
        db.query(CounselingSession)
        .filter(CounselingSession.user_id == current_user.id)
        .order_by(CounselingSession.created_at.desc())
        .limit(20)
        .all()
    )
    return [_session_to_out(s, db) for s in sessions]


@router.patch("/{room_id}/cancel", summary="Cancel a waiting counseling appointment")
def cancel_session(
    room_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(CounselingSession).filter(CounselingSession.room_id == room_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    is_owner = session.user_id == current_user.id
    is_assigned_counselor = session.counselor_id == current_user.id if session.counselor_id else False
    is_admin = current_user.role == UserRole.admin
    if not (is_owner or is_assigned_counselor or is_admin):
        raise HTTPException(status_code=403, detail="Not allowed to cancel this session")
    cancellable_statuses = {
        SessionStatus.waiting,
        SessionStatus.appointment_pending,
        SessionStatus.appointment_accepted,
    }
    if session.status not in cancellable_statuses:
        raise HTTPException(status_code=400, detail="Only pending/accepted appointments can be cancelled")

    session.status = SessionStatus.cancelled
    session.ended_at = datetime.utcnow()
    db.commit()
    return {"message": "Appointment cancelled", "room_id": room_id}


@router.post("/{room_id}/end", summary="Mark a session as ended")
def end_session(
    room_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(CounselingSession).filter(
        CounselingSession.room_id == room_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    is_owner = session.user_id == current_user.id
    is_assigned_counselor = session.counselor_id == current_user.id if session.counselor_id else False
    is_admin = current_user.role == UserRole.admin
    if not (is_owner or is_assigned_counselor or is_admin):
        raise HTTPException(status_code=403, detail="Not allowed to end this session")

    session.status   = SessionStatus.ended
    session.ended_at = datetime.utcnow()
    db.commit()
    return {"message": "Session ended"}


# ─── WebSocket signalling ─────────────────────────────────────────────────────

@router.websocket("/ws/{room_id}")
async def signalling_ws(
    room_id: str,
    websocket: WebSocket,
    token: str = Query(...),
):
    # Authenticate via JWT passed as query param (WS can't send Auth headers)
    from database import SessionLocal
    db = SessionLocal()
    user = _get_user_from_token(token, db)
    if not user:
        await websocket.close(code=4001)
        db.close()
        return

    session = db.query(CounselingSession).filter(
        CounselingSession.room_id == room_id
    ).first()
    if not session:
        await websocket.close(code=4004)
        db.close()
        return

    # Only session owner, counselors, or admins can join the signaling room.
    if user.id != session.user_id and user.role not in (UserRole.counselor, UserRole.admin):
        await websocket.close(code=4003)
        db.close()
        return

    if user.role == UserRole.counselor and user.id != session.user_id:
        if session.counselor_id and session.counselor_id != user.id:
            await websocket.close(code=4003)
            db.close()
            return

    await websocket.accept()

    # Register in room
    if room_id not in rooms:
        rooms[room_id] = {}
    rooms[room_id][user.id] = websocket

    # If a counselor/admin joins, claim assignment when needed and move waiting sessions to active.
    if user.role in (UserRole.counselor, UserRole.admin) and session.user_id != user.id:
        changed = False
        if not session.counselor_id:
            session.counselor_id = user.id
            changed = True
        if session.status == SessionStatus.waiting:
            session.status = SessionStatus.active
            if not session.started_at:
                session.started_at = datetime.utcnow()
            changed = True
        if changed:
            db.commit()

    # Notify the other peer that someone joined
    await _broadcast(room_id, user.id, {"type": "peer_joined", "data": {"name": user.full_name}})

    try:
        while True:
            raw = await websocket.receive_json()
            msg_type = raw.get("type", "")

            if msg_type in ("offer", "answer", "ice"):
                # Forward to the other peer(s) in the room
                await _broadcast(room_id, user.id, raw)

            elif msg_type == "end_call":
                await _broadcast(room_id, user.id, {"type": "peer_left", "data": None})
                # Mark session ended
                session.status   = SessionStatus.ended
                session.ended_at = datetime.utcnow()
                db.commit()
                break

    except WebSocketDisconnect:
        pass
    finally:
        rooms.get(room_id, {}).pop(user.id, None)
        if not rooms.get(room_id):
            rooms.pop(room_id, None)
        db.close()
        # Notify remaining peer
        await _broadcast(room_id, user.id, {"type": "peer_left", "data": None})


async def _broadcast(room_id: str, sender_id: int, message: dict):
    """Send message to all peers in room except the sender."""
    for uid, ws in list(rooms.get(room_id, {}).items()):
        if uid != sender_id:
            try:
                await ws.send_json(message)
            except Exception:
                pass
