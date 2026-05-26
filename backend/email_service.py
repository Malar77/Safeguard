from __future__ import annotations

import os
import smtplib
import ssl
from datetime import datetime
from email.message import EmailMessage
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from database import Notification, User


def _load_local_env_file() -> None:
    """Best-effort load of backend/.env when process env variables are missing."""
    env_path = Path(__file__).resolve().parent / ".env"
    if not env_path.exists():
        return

    try:
        for raw in env_path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            name, value = line.split("=", 1)
            key = name.strip()
            if key in os.environ:
                continue
            val = value.strip()
            if len(val) >= 2 and ((val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'"))):
                val = val[1:-1]
            os.environ[key] = val
    except Exception as exc:
        print(f"[SMTP] Could not read local .env file: {exc}")


def _smtp_settings() -> dict:
    _load_local_env_file()

    host = os.getenv("SMTP_HOST", "").strip()
    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USERNAME", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip()
    if host.lower() == "smtp.gmail.com":
        # Gmail app password is often copied as 4 words; remove spaces safely.
        password = password.replace(" ", "")
    sender = os.getenv("SMTP_FROM_EMAIL", username).strip()
    use_tls = os.getenv("SMTP_USE_TLS", "true").strip().lower() in {"1", "true", "yes", "on"}
    use_ssl = os.getenv("SMTP_USE_SSL", "false").strip().lower() in {"1", "true", "yes", "on"}
    timeout = int(os.getenv("SMTP_TIMEOUT", "15"))

    return {
        "enabled": bool(host and sender),
        "host": host,
        "port": port,
        "username": username,
        "password": password,
        "sender": sender,
        "use_tls": use_tls,
        "use_ssl": use_ssl,
        "timeout": timeout,
        "app_name": os.getenv("APP_NAME", "SafeGuard"),
    }


def send_email(to_email: str | None, subject: str, body: str) -> bool:
    if not to_email:
        return False

    settings = _smtp_settings()
    if not settings["enabled"]:
        print("[SMTP] Disabled: SMTP_HOST or SMTP_FROM_EMAIL is missing.")
        return False

    message = EmailMessage()
    message["From"] = settings["sender"]
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    try:
        if settings["use_ssl"]:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(settings["host"], settings["port"], timeout=settings["timeout"], context=context) as server:
                if settings["username"]:
                    server.login(settings["username"], settings["password"])
                failures = server.send_message(message)
                if failures:
                    print(f"[SMTP] Recipient rejected: {failures}")
                    return False
        else:
            with smtplib.SMTP(settings["host"], settings["port"], timeout=settings["timeout"]) as server:
                server.ehlo()
                if settings["use_tls"]:
                    server.starttls(context=ssl.create_default_context())
                    server.ehlo()
                if settings["username"]:
                    server.login(settings["username"], settings["password"])
                failures = server.send_message(message)
                if failures:
                    print(f"[SMTP] Recipient rejected: {failures}")
                    return False
        return True
    except Exception as exc:
        print(f"[SMTP] Failed to send email to {to_email}: {exc}")
        return False


def send_login_alert_email(user: User, ip_address: str | None = None) -> bool:
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    lines = [
        f"Hello {user.full_name},",
        "",
        "A login to your SafeGuard account was just detected.",
        f"Time: {timestamp}",
    ]
    if ip_address:
        lines.append(f"IP Address: {ip_address}")
    lines.extend([
        "",
        "If this was you, no action is needed.",
        "If you do not recognize this login, please change your password immediately.",
        "",
        "- SafeGuard Security",
    ])
    subject = f"SafeGuard login alert for {user.full_name}"
    return send_email(user.email, subject, "\n".join(lines))


def send_registration_alert_email(user: User) -> bool:
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    subject = f"Welcome to SafeGuard, {user.full_name}"
    body = "\n".join([
        f"Hello {user.full_name},",
        "",
        "Your SafeGuard account has been created successfully.",
        f"Registered at: {timestamp}",
        f"Role: {user.role.value}",
        "",
        "You will receive email alerts for important security and emergency events.",
        "",
        "- SafeGuard Team",
    ])
    return send_email(user.email, subject, body)


def _format_dt(dt: Optional[datetime]) -> str:
    if not dt:
        return "Not specified"
    return dt.strftime("%Y-%m-%d %H:%M UTC")


def send_counseling_request_email(
    counselor: User,
    requester: User,
    scheduled_for: Optional[datetime],
    topic: Optional[str],
    room_id: str,
) -> bool:
    subject = f"New counseling appointment request from {requester.full_name}"
    body = "\n".join([
        f"Hello {counselor.full_name},",
        "",
        f"{requester.full_name} ({requester.email}) requested a counseling appointment.",
        f"Scheduled for: {_format_dt(scheduled_for)}",
        f"Topic: {topic or 'General counseling'}",
        f"Room ID: {room_id}",
        "",
        "Please review and respond from your counselor dashboard.",
        "",
        "- SafeGuard Counseling",
    ])
    return send_email(counselor.email, subject, body)


def send_counseling_response_email(
    user: User,
    counselor_name: str,
    scheduled_for: Optional[datetime],
    topic: Optional[str],
    room_id: str,
    accepted: bool,
    response_notes: Optional[str] = None,
) -> bool:
    decision = "accepted" if accepted else "declined"
    subject = f"Your counseling appointment was {decision}"
    lines = [
        f"Hello {user.full_name},",
        "",
        f"Counselor {counselor_name} has {decision} your appointment request.",
        f"Scheduled for: {_format_dt(scheduled_for)}",
        f"Topic: {topic or 'General counseling'}",
        f"Room ID: {room_id}",
    ]
    if response_notes:
        lines.extend(["", f"Counselor note: {response_notes}"])
    lines.extend(["", "- SafeGuard Counseling"])
    return send_email(user.email, subject, "\n".join(lines))


def send_sos_alert_email(
    recipient: User,
    child_name: str,
    message: Optional[str],
    latitude: Optional[float],
    longitude: Optional[float],
    address: Optional[str],
    triggered_at: Optional[datetime] = None,
) -> bool:
    maps_link = None
    if latitude is not None and longitude is not None:
        maps_link = f"https://maps.google.com/?q={latitude},{longitude}"

    lines = [
        f"Hello {recipient.full_name},",
        "",
        f"Emergency SOS alert from {child_name}.",
        f"Triggered at: {_format_dt(triggered_at or datetime.utcnow())}",
        f"Message: {message or 'Emergency! Immediate help needed.'}",
        f"Address: {address or 'Not available'}",
    ]
    if latitude is not None and longitude is not None:
        lines.append(f"Coordinates: {latitude}, {longitude}")
    if maps_link:
        lines.append(f"Map link: {maps_link}")
    lines.extend([
        "",
        "Please contact emergency services and the child immediately.",
        "",
        "- SafeGuard Emergency",
    ])

    return send_email(
        recipient.email,
        f"EMERGENCY SOS: {child_name} needs help",
        "\n".join(lines),
    )


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "info",
    related_incident_id: int | None = None,
    related_sos_id: int | None = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        related_incident_id=related_incident_id,
        related_sos_id=related_sos_id,
    )
    db.add(notification)

    user = db.query(User).filter(User.id == user_id).first()
    if user and user.email:
        send_email(
            user.email,
            f"SafeGuard alert: {title}",
            f"Hello {user.full_name},\n\n{message}\n\n- SafeGuard",
        )

    return notification