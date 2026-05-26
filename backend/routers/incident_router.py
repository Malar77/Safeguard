from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Request
from sqlalchemy.orm import Session
from database import (
    get_db,
    Incident,
    User,
    IncidentStatus,
    IncidentType,
    Notification,
    FamilyLink,
    FamilyLinkStatus,
    FamilyAlert,
)
from schemas import IncidentCreate, IncidentOut, IncidentUpdate, IncidentEvidenceUploadOut
from auth import get_current_user, require_admin
from email_service import create_notification
from typing import List, Optional
from datetime import datetime, date, time
from pathlib import Path
from uuid import uuid4
import aiofiles

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])

UPLOAD_ROOT = Path(__file__).resolve().parents[1] / "uploads" / "incidents"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
MAX_EVIDENCE_SIZE_BYTES = 25 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "video/mp4"}


@router.get("/types", response_model=List[str])
def get_incident_types():
    return [t.value for t in IncidentType]


@router.post("/report", response_model=IncidentOut)
def report_incident(data: IncidentCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    incident = Incident(
        reporter_id=current_user.id,
        **data.model_dump()
    )
    db.add(incident)
    db.flush()

    # Notify admin on new incident
    create_notification(
        db,
        user_id=current_user.id,
        title="Incident Reported",
        message=f"Your incident '{incident.title}' has been submitted and is under review.",
        notification_type="info",
        related_incident_id=incident.id,
    )

    # Auto-send guardian alerts for non-anonymous reports.
    if not incident.is_anonymous:
        links = db.query(FamilyLink).filter(
            FamilyLink.child_user_id == current_user.id,
            FamilyLink.status == FamilyLinkStatus.accepted,
        ).all()

        for link in links:
            db.add(
                FamilyAlert(
                    child_user_id=current_user.id,
                    parent_user_id=link.parent_user_id,
                    latitude=incident.latitude,
                    longitude=incident.longitude,
                    address=incident.location,
                    message=f"{current_user.full_name} reported an incident: {incident.title}",
                )
            )
            create_notification(
                db,
                user_id=link.parent_user_id,
                title="Ward Incident Alert",
                message=f"{current_user.full_name} has filed a new incident report: {incident.title}",
                notification_type="ward_incident",
                related_incident_id=incident.id,
            )

    db.commit()
    db.refresh(incident)
    return incident


@router.post("/upload-evidence", response_model=IncidentEvidenceUploadOut)
async def upload_incident_evidence(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    _ = current_user  # Ensure only authenticated users can upload evidence.

    if not file.content_type or file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, and MP4 files are allowed")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".mp4"}:
        raise HTTPException(status_code=400, detail="Invalid file extension")

    stored_name = f"{uuid4().hex}{ext}"
    dest = UPLOAD_ROOT / stored_name

    total_size = 0
    async with aiofiles.open(dest, "wb") as out_file:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            total_size += len(chunk)
            if total_size > MAX_EVIDENCE_SIZE_BYTES:
                await out_file.close()
                if dest.exists():
                    dest.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="File exceeds 25MB limit")
            await out_file.write(chunk)

    evidence_url = str(request.base_url).rstrip("/") + f"/uploads/incidents/{stored_name}"
    return IncidentEvidenceUploadOut(
        filename=file.filename or stored_name,
        evidence_url=evidence_url,
        content_type=file.content_type,
        size_bytes=total_size,
    )


@router.get("/my", response_model=List[IncidentOut])
def my_incidents(
    status: Optional[IncidentStatus] = Query(None),
    incident_type: Optional[IncidentType] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date cannot be after end_date")

    query = db.query(Incident).filter(Incident.reporter_id == current_user.id)

    if status:
        query = query.filter(Incident.status == status)
    if incident_type:
        query = query.filter(Incident.incident_type == incident_type)
    if start_date:
        query = query.filter(Incident.created_at >= datetime.combine(start_date, time.min))
    if end_date:
        query = query.filter(Incident.created_at <= datetime.combine(end_date, time.max))

    return query.order_by(Incident.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/", response_model=List[IncidentOut])
def get_all_incidents(
    status: Optional[str] = None,
    incident_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Incident)
    if status:
        query = query.filter(Incident.status == status)
    if incident_type:
        query = query.filter(Incident.incident_type == incident_type)
    return query.order_by(Incident.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{incident_id}", response_model=IncidentOut)
def get_incident(incident_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if current_user.role.value != "admin" and incident.reporter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return incident


@router.patch("/{incident_id}", response_model=IncidentOut)
def update_incident(incident_id: int, update: IncidentUpdate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    old_status = incident.status
    if update.status:
        incident.status = update.status
    if update.admin_notes is not None:
        incident.admin_notes = update.admin_notes
    incident.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(incident)
    # Notify reporter if status changed
    if update.status and old_status != update.status and incident.reporter_id:
        create_notification(
            db,
            user_id=incident.reporter_id,
            title="Incident Status Updated",
            message=f"Your incident '{incident.title}' status changed to {update.status.value}.",
            notification_type="update",
            related_incident_id=incident.id,
        )
        db.commit()
    return incident


@router.delete("/my/{incident_id}")
def delete_my_incident(incident_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(
        Incident.id == incident_id,
        Incident.reporter_id == current_user.id
    ).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if incident.status.value != "pending":
        raise HTTPException(status_code=400, detail="Only pending incidents can be deleted")
    db.delete(incident)
    db.commit()
    return {"message": "Incident deleted"}


@router.delete("/{incident_id}")
def admin_delete_incident(incident_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    db.delete(incident)
    db.commit()
    return {"message": "Incident deleted by admin"}

