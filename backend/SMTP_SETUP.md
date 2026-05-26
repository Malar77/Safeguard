# SMTP Setup

The backend now sends email for:
- login alerts
- registration confirmation alerts
- counseling appointment request/accept/reject alerts
- emergency SOS guardian alerts
- incident / SOS / family / appointment notifications
- admin broadcast notifications

Email delivery is enabled only when SMTP environment variables are set.

## Environment Variables

Set these in PowerShell before starting the backend, or copy them into [backend/.env.example](backend/.env.example) as [backend/.env](backend/.env) and use the startup script:

```powershell
$env:SMTP_HOST = "smtp.gmail.com"
$env:SMTP_PORT = "587"
$env:SMTP_USERNAME = "womensafety2716@gmail.com"
$env:SMTP_PASSWORD = "your-app-password"
$env:SMTP_FROM_EMAIL = "womensafety2716@gmail.com"
$env:SMTP_USE_TLS = "true"
$env:SMTP_USE_SSL = "false"
$env:SMTP_TIMEOUT = "15"
$env:APP_NAME = "SafeGuard"
```

## Notes

- For Gmail, use an App Password, not your normal account password.
- If you only have an encrypted password, decrypt it first and place the usable SMTP app password in `SMTP_PASSWORD`. The backend cannot send mail directly from ciphertext.
- If SMTP settings are missing, the app will keep working and only store in-app notifications.
- Login emails are sent after a successful login.
- Registration emails are sent after a successful signup.
- Counseling emails are sent when appointments are requested, accepted, or rejected.
- SOS emails are sent to linked guardians with location details.
- Alert emails are sent when the backend creates notifications.
