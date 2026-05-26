# 🛡️ SafeGuard – Run Project & Build APK Guide

Complete guide to run the full stack (Backend + Frontend + Mobile) and build the Android APK.

**Last Updated:** April 27, 2026  
**Environment:** Windows 11 | Python 3.13 | Node 20+ | Java 21+ (Android Studio)

---

## 📋 Prerequisites

### Required Software
- **Windows PowerShell** (or Command Prompt)
- **Python 3.13+** with venv
- **Node.js 20+** and npm
- **Java 21+** (Android Studio JBR or separate JDK)
- **Android SDK** (via Android Studio)
- **Git** (optional, for version control)

### Project Location
```
c:\Users\kam54\OneDrive\Desktop\Major\Online-women-and-Child-safety
```

### Python Virtual Environment
```
c:\Users\kam54\OneDrive\Desktop\Major\.venv
```

---

## 🚀 Quick Start (3 Terminal Tabs)

### Terminal 1: Backend (Port 8000)
```powershell
cd "c:\Users\kam54\OneDrive\Desktop\Major\Online-women-and-Child-safety"
.\start-backend.ps1
```

### Terminal 2: Frontend (Port 3000)
```powershell
cd "c:\Users\kam54\OneDrive\Desktop\Major\Online-women-and-Child-safety"
.\start-frontend.ps1
```

### Terminal 3: Mobile Expo (Port 8081+)
```powershell
cd "c:\Users\kam54\OneDrive\Desktop\Major\Online-women-and-Child-safety"
.\start-mobile.ps1
```

**Then Open:**
- Web UI: http://localhost:3000
- Backend API: http://localhost:8000/docs
- Mobile: Scan QR code in Terminal 3 with Expo Go app

---

## 📦 Step-by-Step Setup

### 1️⃣ Install Dependencies (One Time)

#### Backend
```powershell
cd "c:\Users\kam54\OneDrive\Desktop\Major\Online-women-and-Child-safety\backend"
pip install -r requirements.txt
```

#### Frontend
```powershell
cd "c:\Users\kam54\OneDrive\Desktop\Major\Online-women-and-Child-safety\frontend"
npm install
```

#### Mobile (Expo)
```powershell
cd "c:\Users\kam54\OneDrive\Desktop\Major\Online-women-and-Child-safety\mobile"
npm install
```

---

### 2️⃣ Configure Environment Variables

#### Backend (.env)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=womensafety2716@gmail.com
SMTP_PASSWORD=askh sviw xbnj lbss
SMTP_FROM_EMAIL=womensafety2716@gmail.com
SMTP_USE_TLS=true
SMTP_USE_SSL=false
SMTP_TIMEOUT=15
APP_NAME=SafeGuard
AI_ASSISTANT_PROVIDER=gemini
AI_ASSISTANT_API_KEY=AIzaSyD3B_aamZ4Ekco_pk2a2TwPEcczBTmeq3A
AI_ASSISTANT_MODEL=gemini-1.5-flash
```

File: `backend/.env`

#### Frontend (.env)
```env
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_ANDROID_API_BASE_URL=http://10.223.158.58:8000,http://192.168.156.58:8000
```

File: `frontend/.env`

---

### 3️⃣ Run Backend

```powershell
cd "c:\Users\kam54\OneDrive\Desktop\Major\Online-women-and-Child-safety\backend"

# Using venv Python
c:/Users/kam54/OneDrive/Desktop/Major/.venv/Scripts/python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Database seeded successfully.
INFO:     Application startup complete.
```

**Check:** Visit http://localhost:8000/docs (Swagger UI)

---

### 4️⃣ Run Frontend

```powershell
cd "c:\Users\kam54\OneDrive\Desktop\Major\Online-women-and-Child-safety\frontend"
npm start
```

**Expected Output:**
```
Compiled successfully!

You can now view safeguard-frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://10.223.158.58:3000
```

**Check:** Visit http://localhost:3000

**Note:** If `.env` changes, hard-refresh browser: **Ctrl+Shift+R**

---

### 5️⃣ Run Mobile (Expo)

```powershell
cd "c:\Users\kam54\OneDrive\Desktop\Major\Online-women-and-Child-safety\mobile"
npx expo start
```

**Expected Output:**
```
Metro waiting on exp://10.223.158.58:8081

Scan the QR code above with Expo Go (Android) or Camera app (iOS)
```

**To Test:**
1. Install **Expo Go** app on your phone
2. Scan the QR code
3. App loads with live reload enabled

---

## 🔧 Configuration Updates

### Find Your LAN IP
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254*' } | Select-Object -ExpandProperty IPAddress
```

Example output: `10.223.158.58`

### Update Frontend .env (Mobile/Android)
If your LAN IP changes:

```env
REACT_APP_ANDROID_API_BASE_URL=http://<YOUR_LAN_IP>:8000
```

Example:
```env
REACT_APP_ANDROID_API_BASE_URL=http://10.223.158.58:8000
```

---

## 📱 Build Android APK

### Prerequisites
- ✅ Backend and Frontend fully tested
- ✅ Node 20+, Java 21+, Android SDK
- ✅ `frontend/.env` has correct `REACT_APP_ANDROID_API_BASE_URL`

### Build Steps

#### Step 1: Generate React Production Build
```powershell
cd "c:\Users\kam54\OneDrive\Desktop\Major\Online-women-and-Child-safety\frontend"
npm run build
```

This creates `frontend/build/` directory.

#### Step 2: Sync Capacitor Android Assets
```powershell
npx cap sync android
```

Copies React build to Android project.

#### Step 3: Generate APK
```powershell
cd "c:\Users\kam54\OneDrive\Desktop\Major\Online-women-and-Child-safety\frontend\android"

# Clean and build
.\gradlew.bat clean assembleDebug
```

**Build Time:** ~2-5 minutes first time, ~1 minute subsequent

#### Step 4: Locate APK
```
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

#### Step 5: Copy to Desktop (Optional)
```powershell
Copy-Item "frontend/android/app/build/outputs/apk/debug/app-debug.apk" "c:/Users/kam54/OneDrive/Desktop/app-debug.apk" -Force
```

### Install on Phone
```powershell
# Connect Android phone via USB (Developer Mode enabled)
adb install "c:/Users/kam54/OneDrive/Desktop/app-debug.apk"
```

Or manually download and install the APK file on your phone.

---

## 🎨 Generate App Icons (Optional)

Icons are already generated at:
- `mobile/assets/icon.png` (1024x1024)
- `mobile/assets/adaptive-icon.png` (adaptive)
- `mobile/assets/splash-icon.png` (512x512)
- `mobile/assets/favicon.png` (48x48)

To regenerate:
```powershell
cd "c:\Users\kam54\OneDrive\Desktop\Major\Online-women-and-Child-safety\mobile"
node scripts/generate-icons.js
```

Then rebuild APK.

---

## 🐛 Troubleshooting

### Backend: "Address already in use"
Port 8000 is in use. Kill process:
```powershell
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

Or change port in `start-backend.ps1`.

### Frontend: "npm: The term 'npm' is not recognized"
Use `npm.cmd` instead:
```powershell
npm.cmd start
```

### Frontend: API returns CORS errors
1. Hard refresh browser: **Ctrl+Shift+R**
2. Verify `backend/main.py` CORS config includes `localhost:3000`
3. Check `frontend/.env` has correct `REACT_APP_API_BASE_URL`

### APK Build: "invalid source release: 21"
Set Java home in `frontend/android/gradle.properties`:
```properties
org.gradle.java.home=C:/Program Files/Android/Android Studio/jbr
```

### APK Build: "Android SDK not found"
Create `frontend/android/local.properties`:
```properties
sdk.dir=C:\\Users\\kam54\\AppData\\Local\\Android\\Sdk
```

### Mobile: "Cannot connect to backend"
1. Verify backend is running: `http://<LAN_IP>:8000/health`
2. Update `frontend/.env` with correct LAN IP
3. Ensure phone and PC are on **same Wi-Fi**
4. Check Windows Firewall allows ports 8000 & 3000:
   ```powershell
   New-NetFirewallRule -DisplayName "SafeGuard Backend" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
   New-NetFirewallRule -DisplayName "SafeGuard Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
   ```

---

## 📊 Project Structure

```
Online-women-and-Child-safety/
├── backend/               # FastAPI (Python 3.13)
│   ├── main.py
│   ├── requirements.txt
│   ├── .env              # Configuration
│   └── routers/          # API endpoints
├── frontend/             # React (Web UI + Capacitor)
│   ├── src/
│   ├── public/
│   ├── .env
│   ├── package.json
│   └── android/          # Android project
├── mobile/               # Expo React Native
│   ├── src/
│   ├── .env
│   └── scripts/
├── start-backend.ps1     # Backend startup script
├── start-frontend.ps1    # Frontend startup script
└── start-mobile.ps1      # Mobile startup script
```

---

## 🚢 Deployment Checklist

Before going to production:

- [ ] Test all endpoints at `http://localhost:8000/docs`
- [ ] Test web UI at `http://localhost:3000`
- [ ] Test mobile app via Expo
- [ ] Build and test APK on Android device
- [ ] Verify SMTP emails send correctly
- [ ] Update `REACT_APP_ANDROID_API_BASE_URL` to production server
- [ ] Review security: remove hardcoded secrets, use environment variables
- [ ] Test on slow networks (throttle to 3G in DevTools)
- [ ] Review error logs: `docker logs` or terminal output

---

## 📞 Support

For issues:
1. Check terminal output for errors
2. Review logs at backend/routers logs
3. Open browser DevTools (F12) for frontend errors
4. Check `.env` files are not in `.gitignore`

---

**Happy Coding! 🚀**
