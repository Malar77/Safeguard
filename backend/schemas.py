from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict
from datetime import datetime
from database import UserRole, IncidentStatus, IncidentType, FamilyLinkStatus


# ─── Auth ────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    role: Optional[str] = "user"  # "user" or "parent"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    full_name: str
    email: str
    phone: Optional[str]
    role: UserRole
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None


class ChangePassword(BaseModel):
    current_password: str
    new_password: str


# ─── Trusted Contacts ────────────────────────────────────────────────────

class TrustedContactCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    relation: Optional[str] = None


class TrustedContactOut(TrustedContactCreate):
    id: int
    class Config:
        from_attributes = True


# ─── SOS ─────────────────────────────────────────────────────────────────

class SOSCreate(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    message: Optional[str] = "EMERGENCY! I need help immediately."
    selfie_data: Optional[str] = None   # base64 video clip


class SOSOut(BaseModel):
    id: int
    user_id: int
    latitude: Optional[float]
    longitude: Optional[float]
    address: Optional[str]
    message: str
    is_active: bool
    created_at: datetime
    resolved_at: Optional[datetime] = None
    selfie_data: Optional[str] = None   # base64 video clip
    live_frame_data: Optional[str] = None   # base64 JPEG frame
    live_frame_updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Incidents ───────────────────────────────────────────────────────────

class IncidentCreate(BaseModel):
    incident_type: IncidentType
    title: str = Field(min_length=3, max_length=160)
    description: str = Field(min_length=20, max_length=5000)
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_anonymous: bool = False
    evidence_url: Optional[str] = None


class IncidentUpdate(BaseModel):
    status: Optional[IncidentStatus] = None
    admin_notes: Optional[str] = None


class IncidentOut(BaseModel):
    id: int
    incident_type: IncidentType
    title: str
    description: str
    location: Optional[str]
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: IncidentStatus
    is_anonymous: bool
    admin_notes: Optional[str] = None
    evidence_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    reporter_id: Optional[int]

    class Config:
        from_attributes = True


class IncidentEvidenceUploadOut(BaseModel):
    filename: str
    evidence_url: str
    content_type: Optional[str] = None
    size_bytes: int


# ─── Helplines ───────────────────────────────────────────────────────────

class HelplineCreate(BaseModel):
    name: str
    number: str
    category: str
    description: Optional[str] = None
    available_24x7: bool = True
    website: Optional[str] = None


class HelplineUpdate(BaseModel):
    name: Optional[str] = None
    number: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    available_24x7: Optional[bool] = None
    website: Optional[str] = None
    is_active: Optional[bool] = None


class HelplineOut(BaseModel):
    id: int
    name: str
    number: str
    category: str
    description: Optional[str]
    available_24x7: bool
    website: Optional[str]
    is_active: bool = True

    class Config:
        from_attributes = True


# ─── Legal Resources ─────────────────────────────────────────────────────

class LegalResourceCreate(BaseModel):
    title: str
    category: str
    law_name: Optional[str] = None
    summary: str
    full_text: Optional[str] = None
    reference_url: Optional[str] = None


class LegalResourceUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    law_name: Optional[str] = None
    summary: Optional[str] = None
    full_text: Optional[str] = None
    reference_url: Optional[str] = None


class LegalResourceOut(BaseModel):
    id: int
    title: str
    category: str
    law_name: Optional[str]
    summary: str
    full_text: Optional[str]
    reference_url: Optional[str]

    class Config:
        from_attributes = True


class LegalBookmarkOut(BaseModel):
    id: int
    user_id: int
    legal_resource_id: int
    created_at: datetime
    resource: Optional[LegalResourceOut] = None

    class Config:
        from_attributes = True


# ─── Counseling Resources ─────────────────────────────────────────────────

class CounselingResourceCreate(BaseModel):
    title: str
    category: str
    description: str
    contact: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None
    is_online: bool = False


class CounselingResourceUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    contact: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None
    is_online: Optional[bool] = None


class CounselingResourceOut(BaseModel):
    id: int
    title: str
    category: str
    description: str
    contact: Optional[str]
    website: Optional[str]
    location: Optional[str]
    is_online: bool

    class Config:
        from_attributes = True


# ─── Safe Places ─────────────────────────────────────────────────────────

class SafePlaceCreate(BaseModel):
    name: str
    place_type: str
    address: str
    city: Optional[str] = None
    latitude: float
    longitude: float
    phone: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    is_verified: bool = False


class SafePlaceUpdate(BaseModel):
    name: Optional[str] = None
    place_type: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    is_verified: Optional[bool] = None
    is_active: Optional[bool] = None


class SafePlaceOut(BaseModel):
    id: int
    name: str
    place_type: str
    address: str
    city: Optional[str] = None
    latitude: float
    longitude: float
    phone: Optional[str]
    website: Optional[str] = None
    description: Optional[str] = None
    is_verified: bool
    is_active: bool = True

    class Config:
        from_attributes = True


# ─── Notifications ────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    notification_type: str
    is_read: bool
    related_incident_id: Optional[int] = None
    related_sos_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Child Safety Tips ────────────────────────────────────────────────────

class ChildSafetyTipCreate(BaseModel):
    title: str
    category: str
    content: str
    age_group: Optional[str] = None


class ChildSafetyTipUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    content: Optional[str] = None
    age_group: Optional[str] = None
    is_active: Optional[bool] = None


class ChildSafetyTipOut(BaseModel):
    id: int
    title: str
    category: str
    content: str
    age_group: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Dashboard Stats ─────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_users: int
    total_incidents: int
    active_sos: int
    pending_incidents: int
    resolved_incidents: int
    incidents_by_type: Dict[str, int]


# ─── Family / Guardian ────────────────────────────────────────────────────────

class FamilyLinkRequest(BaseModel):
    """Child/ward sends their parent's email to request a link."""
    parent_email: EmailStr


class FamilyLinkOut(BaseModel):
    id: int
    parent_user_id: int
    child_user_id: int
    status: FamilyLinkStatus
    created_at: datetime
    accepted_at: Optional[datetime] = None
    parent_name: Optional[str] = None
    parent_email: Optional[str] = None
    parent_role: Optional[str] = None
    child_name: Optional[str] = None
    child_email: Optional[str] = None
    child_phone: Optional[str] = None
    child_role: Optional[str] = None

    class Config:
        from_attributes = True


class FamilyAlertCreate(BaseModel):
    """Payload sent by frontend when SOS is triggered (auto-called)."""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    selfie_data: Optional[str] = None          # base64 video clip
    message: Optional[str] = "EMERGENCY! I need help immediately."
    sos_alert_id: Optional[int] = None


class FamilyAlertOut(BaseModel):
    id: int
    child_user_id: int
    parent_user_id: int
    sos_alert_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    selfie_data: Optional[str] = None          # base64 video clip
    message: Optional[str] = None
    is_read: bool
    created_at: datetime
    child_name: Optional[str] = None
    child_phone: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Counseling Appointments ──────────────────────────────────────────────

class CounselingAppointmentCreate(BaseModel):
    """User books an appointment with a specific counselor."""
    counselor_id: int
    scheduled_for: datetime = Field(..., description="Appointment date and time (ISO format)")
    topic: str = Field(..., min_length=5, max_length=200, description="What will be discussed")
    notes: Optional[str] = Field(None, max_length=1000, description="Additional notes or concerns")


class CounselingAppointmentAction(BaseModel):
    """Counselor accepts or rejects an appointment request."""
    action: str = Field(..., pattern="^(accept|reject)$", description="accept or reject")
    response_notes: Optional[str] = Field(None, max_length=500, description="Reason for rejection or acceptance message")


class CounselingAppointmentResponse(BaseModel):
    """Response showing appointment details."""
    room_id: str
    counselor_id: Optional[int] = None
    counselor_name: Optional[str] = None
    user_id: int
    user_name: str
    scheduled_for: Optional[str] = None
    topic: Optional[str] = None
    notes: Optional[str] = None
    status: str
    created_at: str
    can_start: bool = False  # True if appointment_accepted and current_time >= scheduled_for

    class Config:
        from_attributes = True


class CounselingSessionOut(BaseModel):
    """Full counseling session details."""
    room_id: str
    user_id: int
    user_name: str
    user_email: Optional[str] = None
    counselor_id: Optional[int] = None
    counselor_name: Optional[str] = None
    status: str
    scheduled_for: Optional[str] = None
    topic: Optional[str] = None
    notes: Optional[str] = None
    started_at: Optional[str] = None
    ended_at: Optional[str] = None
    duration_mins: Optional[int] = None
    created_at: str
    call_type: str = "video"

    class Config:
        from_attributes = True
