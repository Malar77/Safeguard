# 🏗️ Architecture & API Overview

Complete technical overview of the SafeGuard platform architecture and API endpoints.

---

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SafeGuard Platform                        │
└─────────────────────────────────────────────────────────────────┘
                                 │
                ┌────────────────┼────────────────┐
                ▼                ▼                ▼
          ┌──────────┐    ┌──────────┐    ┌──────────┐
          │  React   │    │  Expo    │    │ Admin    │
          │  Web UI  │    │ Mobile   │    │ Dashboard│
          │ :3000    │    │ :8081+   │    │ :3000    │
          └────┬─────┘    └────┬─────┘    └────┬─────┘
               │               │              │
               └───────────────┼──────────────┘
                               │
                        ┌──────▼──────┐
                        │ FastAPI     │
                        │ Backend     │
                        │ :8000       │
                        └──────┬──────┘
                               │
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
          ┌──────────┐  ┌───────────┐  ┌──────────┐
          │ SQLite   │  │ SMTP      │  │ Gemini   │
          │ Database │  │ Gmail     │  │ AI API   │
          └──────────┘  └───────────┘  └──────────┘
```

---

## 🏠 Project Structure

```
Online-women-and-Child-safety/
│
├── 📁 backend/                 # FastAPI (Python 3.13)
│   ├── main.py                 # FastAPI app + CORS config
│   ├── database.py             # SQLAlchemy ORM models
│   ├── schemas.py              # Pydantic request/response schemas
│   ├── auth.py                 # JWT authentication
│   ├── email_service.py        # SMTP email sending
│   │
│   ├── 📁 routers/             # API route handlers
│   │   ├── auth_router.py      # Login, register, profile
│   │   ├── admin_router.py     # Admin dashboard
│   │   ├── sos_router.py       # SOS alert triggers
│   │   ├── incident_router.py  # Incident reporting
│   │   ├── helpline_router.py  # Helpline resources
│   │   ├── ai_assistant_router.py  # AI chat
│   │   ├── family_router.py    # Family links
│   │   ├── notifications_router.py # Push notifications
│   │   └── ...
│   │
│   ├── .env                    # Configuration (secrets)
│   ├── requirements.txt        # Python dependencies
│   └── safeguard.db            # SQLite database
│
├── 📁 frontend/                # React Web UI + Capacitor
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js              # Main component
│   │   ├── index.js
│   │   ├── 📁 components/      # Reusable UI components
│   │   ├── 📁 pages/           # Page components (Admin, Dashboard, etc)
│   │   ├── 📁 services/
│   │   │   ├── api.js          # Axios instance + API calls
│   │   │   └── ...
│   │   ├── 📁 context/         # React Context (Auth, etc)
│   │   └── 📁 utils/           # Utility functions
│   │
│   ├── 📁 android/             # Android project (Capacitor)
│   │   ├── app/build/          # Build outputs
│   │   │   └── apk/debug/
│   │   │       └── app-debug.apk  ← **Your APK is here**
│   │   └── gradle/
│   │
│   ├── capacitor.config.json   # Capacitor configuration
│   ├── .env                    # Environment variables
│   ├── package.json
│   └── build/                  # Production React build
│
├── 📁 mobile/                  # Expo React Native (Dev)
│   ├── src/
│   │   ├── screens/            # Screen components
│   │   ├── components/
│   │   ├── services/           # API calls
│   │   ├── context/            # Context providers
│   │   └── theme.js            # Styling
│   ├── app.json                # Expo config
│   ├── eas.json                # EAS Build config
│   └── package.json
│
├── 📁 mobile_expo_build/       # Expo Copy (Keep in Sync)
│   └── [Same as mobile/]
│
├── 🔧 start-backend.ps1        # Startup script (Backend)
├── 🔧 start-frontend.ps1       # Startup script (Frontend)
├── 🔧 start-mobile.ps1         # Startup script (Mobile)
│
├── 📄 RUN_PROJECT_AND_BUILD_APK.md
├── 📄 QUICK_START.md
├── 📄 STARTUP_SCRIPTS.md
├── 📄 TROUBLESHOOTING.md
└── 📄 ARCHITECTURE.md           ← You are here
```

---

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
    id              INTEGER PRIMARY KEY,
    full_name       TEXT NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    phone           TEXT,
    hashed_password TEXT NOT NULL,
    role            ENUM('user', 'parent', 'admin', 'counselor'),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      DATETIME DEFAULT NOW()
);
```

### Key Tables
- **Users** - User accounts
- **SOSAlert** - Emergency alerts
- **Incident** - Incident reports
- **FamilyLink** - Parent-child relationships
- **FamilyAlert** - Alert recipients
- **Notification** - Push notifications
- **CounselingSession** - Counselor sessions
- **ActivityLog** - Admin audit logs
- **Helpline** - Emergency helpline numbers
- **SafePlace** - Safe locations/shelters

---

## 🔌 API Endpoints

### Authentication (`/api/auth`)
```
POST   /api/auth/register          - Register new user
POST   /api/auth/login             - Login (returns JWT token)
GET    /api/auth/me                - Get current user profile
PUT    /api/auth/me                - Update profile
POST   /api/auth/change-password   - Change password
DELETE /api/auth/me                - Delete account
GET    /api/auth/search            - Search user by email
GET    /api/auth/trusted-contacts  - Get trusted contacts
POST   /api/auth/trusted-contacts  - Add trusted contact
```

### SOS Emergency (`/api/sos`)
```
POST   /api/sos/trigger            - Trigger SOS alert (sends emails)
POST   /api/sos/resolve/:id        - Resolve SOS alert
POST   /api/sos/resolve-active     - Resolve all active SOS alerts
GET    /api/sos/history            - Get user's SOS history
POST   /api/sos/:id/live-frame     - Upload live camera frame
```

### Incidents (`/api/incidents`)
```
POST   /api/incidents              - Report incident
GET    /api/incidents              - List user's incidents
GET    /api/incidents/:id          - Get incident details
PUT    /api/incidents/:id          - Update incident
DELETE /api/incidents/:id          - Delete incident
GET    /api/incidents/types        - Get incident type options
POST   /api/incidents/:id/upload   - Upload evidence
```

### Family Links (`/api/family`)
```
GET    /api/family/links           - Get family links
POST   /api/family/links           - Create family link request
PUT    /api/family/links/:id       - Accept/reject link
DELETE /api/family/links/:id       - Remove family link
GET    /api/family/alerts          - Get alerts from linked family
```

### Counseling (`/api/counseling`)
```
GET    /api/counseling/sessions    - List sessions
POST   /api/counseling/sessions    - Book session
GET    /api/counseling/sessions/:id - Get session details
PUT    /api/counseling/sessions/:id - Update session
GET    /api/counseling/counselors  - List counselors
```

### Resources (`/api/resources`)
```
GET    /api/helplines              - Get helpline numbers
GET    /api/safe-places            - Get safe locations nearby
GET    /api/resources/legal        - Get legal resources
GET    /api/resources/child-safety - Get child safety tips
```

### AI Assistant (`/api/assistant`)
```
POST   /api/assistant/chat         - Chat with AI assistant
```

### Admin (`/api/admin`)
```
GET    /api/admin/stats            - Dashboard stats
GET    /api/admin/users            - List all users
GET    /api/admin/users/:id        - Get user details
PATCH  /api/admin/users/:id/toggle-active - Enable/disable user
GET    /api/admin/incidents        - List all incidents
GET    /api/admin/sos-alerts       - List SOS alerts
GET    /api/admin/counselors       - List counselors
POST   /api/admin/counselors       - Add counselor
```

### Notifications (`/api/notifications`)
```
GET    /api/notifications          - List notifications
GET    /api/notifications/unread-count - Get unread count
POST   /api/notifications/:id/read - Mark as read
```

---

## 🔐 Authentication Flow

### JWT Token
```
Header: Authorization: Bearer <JWT_TOKEN>
```

### Token Structure
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "user",
  "exp": 1704067200
}
```

### Request Example
```bash
curl -H "Authorization: Bearer eyJhbGci..." http://localhost:8000/api/auth/me
```

---

## 🎨 Frontend Components

### Layout
- `Navbar.jsx` - Top navigation bar
- `BottomNav.jsx` - Mobile bottom navigation
- `Sidebar.jsx` - Admin sidebar
- `Footer.jsx` - Footer

### Pages
- `HomePage.jsx` - Landing page
- `LoginPage.jsx` - Login
- `RegisterPage.jsx` - Registration
- `ProfilePage.jsx` - User profile
- `SOSPage.jsx` - SOS trigger
- `IncidentReportPage.jsx` - Report incident
- `AdminDashboard.jsx` - Admin panel
- `CounselingPage.jsx` - Booking counseling

### Context
- `AuthContext.js` - Authentication state (login, user, logout)

---

## 🔄 Data Flow (Example: SOS Trigger)

```
1. User clicks SOS button on mobile app
                    ↓
2. Frontend captures location (GPS)
                    ↓
3. POST /api/sos/trigger
   {
     latitude: 28.6139,
     longitude: 77.2090,
     address: "Delhi, India",
     message: "EMERGENCY! I need help immediately.",
     selfie_data: "base64_video_data"
   }
                    ↓
4. Backend validates JWT token (ensure user is logged in)
                    ↓
5. Create SOSAlert record in database
                    ↓
6. Query FamilyLink to find parent IDs
                    ↓
7. For each parent:
   - Send email via SMTP
   - Create Notification record
   - Send push notification (if mobile)
                    ↓
8. Return 200 OK to frontend with alert ID
                    ↓
9. Frontend shows "Alert sent to 2 contacts"
                    ↓
10. Parent receives email with location and SOS details
```

---

## 📤 Email Templates

### SOS Alert Email
```
Subject: EMERGENCY SOS Alert from [Child Name]

Your child [Child Name] has triggered a SOS alert!

Location: [Address]
Time: [Timestamp]
Message: [Custom message]

View Location: [Map Link]
```

### Incident Notification
```
Subject: New Incident Report Submitted

An incident has been reported in your area:

Type: [Incident Type]
Location: [Location]
Date: [Date]
Description: [Description]

[Take Action Link]
```

---

## 🔄 Deployment Pipeline

```
Code Changes
    ↓
GitHub Push
    ↓
GitHub Actions (Optional)
    ↓
Backend: Python uvicorn restart
Frontend: npm build
Mobile: Expo build
    ↓
Android: Gradle assembleRelease (for production APK)
    ↓
APK File Ready for Distribution
```

---

## 📊 Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Backend** | FastAPI | 0.104+ |
| **Backend DB** | SQLAlchemy | 2.0+ |
| **Backend DB** | SQLite | 3.0+ |
| **Backend Email** | SMTP (Gmail) | TLS 1.2+ |
| **Frontend Web** | React | 18+ |
| **Frontend Mobile** | Expo | 50+ |
| **Frontend UI** | Tailwind CSS | 3+ |
| **API Client** | Axios | 1.6+ |
| **Mobile Native** | React Native | 0.73+ |
| **Android Build** | Capacitor | 5+ |
| **Build Tool** | Gradle | 8+ |
| **Java Runtime** | JRE 21 | Java 21 |
| **Node.js** | Node | 20+ |
| **Python** | Python | 3.13 |
| **AI Integration** | Google Gemini | 1.5-flash |

---

## 🔒 Security Considerations

### Implemented
✅ JWT authentication on all protected endpoints  
✅ Password hashing (bcrypt)  
✅ CORS configured for specific origins  
✅ Environment variables for secrets  
✅ HTTPS/TLS for email (SMTP)  
✅ Input validation via Pydantic  
✅ SQL injection prevention (SQLAlchemy ORM)  

### Recommendations for Production
- [ ] Enable HTTPS on backend (use SSL certificate)
- [ ] Move secrets to encrypted vault (AWS Secrets Manager, HashiCorp Vault)
- [ ] Add rate limiting to prevent brute force
- [ ] Add logging & monitoring (Sentry, DataDog)
- [ ] Regular security audits
- [ ] Two-factor authentication (2FA)
- [ ] Database backups and encryption
- [ ] DDoS protection (Cloudflare, AWS Shield)

---

## 📈 Performance Optimization

### Backend
- Database indexes on frequently queried columns
- Connection pooling (SQLAlchemy)
- Response caching for static resources
- Gzip compression enabled

### Frontend
- Code splitting (React lazy loading)
- Image optimization
- Webpack minification
- Service Workers for PWA caching

### Mobile
- Metro bundler caching
- Code splitting with dynamic imports
- Lazy loading screens

---

## 🚀 Deployment Targets

### Development (Local)
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`
- Mobile: Expo Go on phone

### Staging
- Backend: Could deploy to Railway, Render, or AWS EC2
- Frontend: Could deploy to Vercel or Netlify
- Mobile: TestFlight or Firebase App Distribution

### Production
- Backend: Cloud VM (AWS EC2, Google Cloud Run, DigitalOcean)
- Frontend: CDN (Vercel, Netlify, Cloudflare Pages)
- Mobile: Google Play Store, Apple App Store
- Database: Managed DB (AWS RDS, Google Cloud SQL, PlanetScale)

---

## 📚 Key Files Reference

| File | Purpose |
|------|---------|
| `backend/main.py` | FastAPI app, CORS, middleware |
| `backend/database.py` | SQLAlchemy models |
| `backend/auth.py` | JWT token creation/verification |
| `backend/email_service.py` | SMTP email sending |
| `frontend/src/services/api.js` | Axios API client |
| `frontend/src/context/AuthContext.js` | Auth state management |
| `frontend/.env` | Frontend environment variables |
| `backend/.env` | Backend environment variables |

---

## 📖 Documentation Files

- **RUN_PROJECT_AND_BUILD_APK.md** - Complete setup & build guide
- **QUICK_START.md** - 5-minute quick start
- **STARTUP_SCRIPTS.md** - Script documentation
- **TROUBLESHOOTING.md** - Common issues & solutions
- **ARCHITECTURE.md** - This file

---

**Last Updated:** April 27, 2026  
**Status:** Production Ready ✅  
**Version:** 2.0.0
