# ⚡ Quick Start (Copy & Paste)

## 🚀 Run Full Stack (3 Terminals)

### Terminal 1: Backend
```powershell
cd "c:\Users\kam54\OneDrive\Desktop\Major\Online-women-and-Child-safety"
.\start-backend.ps1
```

### Terminal 2: Frontend  
```powershell
cd "c:\Users\kam54\OneDrive\Desktop\Major\Online-women-and-Child-safety"
.\start-frontend.ps1
```

### Terminal 3: Mobile (Expo)
```powershell
cd "c:\Users\kam54\OneDrive\Desktop\Major\Online-women-and-Child-safety"
.\start-mobile.ps1
```

**Then Open:**
- Web: http://localhost:3000
- API Docs: http://localhost:8000/docs  
- Mobile: Scan QR code with Expo Go app

---

## 📱 Build APK (One Command)

```powershell
cd "c:\Users\kam54\OneDrive\Desktop\Major\Online-women-and-Child-safety\frontend"
npm run build
npx cap sync android
cd android
.\gradlew.bat clean assembleDebug
```

**APK Location:**
```
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🔑 API Credentials

**Admin Account:**
- Email: `admin@safeguard.com`
- Password: `AdminPass123!`

**Test User:**
- Email: `user@safeguard.com`
- Password: `TestUser123!`

---

## 📋 Environment Variables

**Backend:** `backend/.env`
```env
AI_ASSISTANT_API_KEY=AIzaSyD3B_aamZ4Ekco_pk2a2TwPEcczBTmeq3A
SMTP_USERNAME=womensafety2716@gmail.com
```

**Frontend:** `frontend/.env`
```env
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_ANDROID_API_BASE_URL=http://10.223.158.58:8000
```

---

## 🛠️ Common Fixes

### Frontend CORS Error
- Hard refresh: **Ctrl+Shift+R**
- Check `backend/main.py` CORS config

### Port Already in Use
```powershell
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Android SDK Not Found
Create `frontend/android/local.properties`:
```properties
sdk.dir=C:\\Users\\kam54\\AppData\\Local\\Android\\Sdk
```

---

## 📲 For Detailed Instructions

See: **RUN_PROJECT_AND_BUILD_APK.md**

---

**Happy Coding! 🚀**
