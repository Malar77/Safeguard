# 🔧 Troubleshooting Guide

## ❌ Backend Issues

### 1. "Address already in use" on Port 8000

**Problem:** Another process is using port 8000

**Solution:**
```powershell
# Find process
netstat -ano | findstr :8000

# Kill it (replace <PID> with the process ID)
taskkill /PID <PID> /F
```

### 2. "ModuleNotFoundError: No module named 'fastapi'"

**Problem:** Dependencies not installed

**Solution:**
```powershell
cd backend
pip install -r requirements.txt
```

### 3. "Database is locked" or "SQLite error"

**Problem:** Multiple processes accessing database

**Solution:**
```powershell
# Delete database and restart (data will be reseeded)
Remove-Item backend/safeguard.db
# Then restart backend
```

### 4. "SMTP connection failed"

**Problem:** Email configuration invalid

**Solution:**
1. Check `backend/.env` has correct SMTP settings
2. Verify Gmail app password: `askh sviw xbnj lbss`
3. Test connection:
```python
import smtplib
server = smtplib.SMTP('smtp.gmail.com', 587)
server.starttls()
server.login('womensafety2716@gmail.com', 'askh sviw xbnj lbss')
print("✅ SMTP works!")
server.quit()
```

### 5. Gemini API Key Invalid

**Problem:** AI assistant returns errors

**Solution:**
1. Check API key in `backend/.env`: `AIzaSyD3B_aamZ4Ekco_pk2a2TwPEcczBTmeq3A`
2. Verify key is active at https://console.cloud.google.com
3. Enable Generative Language API

---

## ❌ Frontend Issues

### 1. "npm: The term 'npm' is not recognized"

**Problem:** npm not in PATH

**Solution:**
```powershell
# Use full path
npm.cmd start
# OR reinstall Node.js
```

### 2. CORS Error: "Access-Control-Allow-Origin header is missing"

**Problem:** Frontend origin doesn't match backend CORS config

**Solution:**
1. Hard refresh: **Ctrl+Shift+R**
2. Check `backend/.env` - no localhost/127.0.0.1 mismatch
3. Verify `backend/main.py` has correct CORS origins:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8000",
    ],
    ...
)
```

### 3. "Cannot GET /api/admin/users" (500 Error)

**Problem:** User record has NULL timestamp

**Solution:**
```powershell
cd backend
python.exe -c "
from database import SessionLocal, User
from datetime import datetime
db = SessionLocal()
for user in db.query(User).filter(User.created_at == None).all():
    user.created_at = datetime.utcnow()
    print(f'Fixed {user.email}')
db.commit()
db.close()
"
```

### 4. API Requests Timeout

**Problem:** Backend not responding

**Solution:**
1. Verify backend is running: `http://localhost:8000/health`
2. Check firewall allows port 8000
3. Increase timeout in `frontend/src/services/api.js` (change `timeout: 10000`)

### 5. Logo/Icons Not Showing

**Problem:** Assets not generated

**Solution:**
```powershell
cd mobile
npm install jimp
node scripts/generate-icons.js
npm run build
```

---

## ❌ Mobile (Expo) Issues

### 1. "Metro bundler cannot bind to port 8081"

**Problem:** Port in use

**Solution:**
```powershell
netstat -ano | findstr :8081
taskkill /PID <PID> /F

# Or let Expo use next port
npx expo start  # Will ask to use 8082
```

### 2. "Expo Go app cannot connect to backend"

**Problem:** Phone and PC not on same network OR wrong IP

**Solution:**
1. Verify LAN IP:
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' } | Select-Object IPAddress
```

2. Update `frontend/.env`:
```env
REACT_APP_ANDROID_API_BASE_URL=http://<YOUR_LAN_IP>:8000
```

3. Rebuild app:
```powershell
npm run build
npx cap sync android
```

### 3. "Cannot find expo CLI"

**Problem:** Expo not installed

**Solution:**
```powershell
npm install -g expo-cli
# OR use npx
npx expo start
```

### 4. App Crashes on Startup

**Problem:** Missing dependencies or config errors

**Solution:**
```powershell
# Clear cache and reinstall
cd mobile
rm -r node_modules .expo
npm install
npx expo start --clear
```

---

## ❌ APK Build Issues

### 1. "invalid source release: 21" (Java version mismatch)

**Problem:** Gradle Java version doesn't match

**Solution:** Create `frontend/android/gradle.properties`:
```properties
org.gradle.java.home=C:/Program Files/Android/Android Studio/jbr
```

### 2. "Android SDK not found"

**Problem:** SDK path not configured

**Solution:** Create `frontend/android/local.properties`:
```properties
sdk.dir=C:\\Users\\kam54\\AppData\\Local\\Android\\Sdk
```

### 3. Build fails with "AAPT2 error"

**Problem:** Android resource compilation issue

**Solution:**
```powershell
cd frontend/android
.\gradlew.bat clean
.\gradlew.bat assembleDebug
```

### 4. APK won't install on phone

**Problem:** Version mismatch or signature error

**Solution:**
```powershell
# Uninstall old version first
adb uninstall com.safeguard

# Install new APK
adb install "frontend/android/app/build/outputs/apk/debug/app-debug.apk"
```

### 5. "Capacitor sync failed"

**Problem:** Platform files out of sync

**Solution:**
```powershell
cd frontend
npm run build
npx cap sync
npx cap copy android
```

---

## ❌ Network Issues

### 1. Backend not accessible from phone

**Problem:** Firewall blocking ports

**Solution:** Allow ports in Windows Firewall:
```powershell
# For port 8000
New-NetFirewallRule -DisplayName "SafeGuard Backend" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow

# For port 3000
New-NetFirewallRule -DisplayName "SafeGuard Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### 2. "Connection refused" (ERR_CONNECTION_REFUSED)

**Problem:** Backend not running or wrong IP

**Solution:**
```powershell
# Test connection
ping <BACKEND_IP>
curl http://<BACKEND_IP>:8000/health
```

### 3. Slow API responses

**Problem:** Network congestion or slow device

**Solution:**
1. Check network speed on phone
2. Increase timeout in API calls
3. Check backend logs for slow queries
4. Test on 5GHz Wi-Fi instead of 2.4GHz

---

## ✅ Quick Verification Checklist

- [ ] Backend running: `http://localhost:8000/health`
- [ ] Frontend running: `http://localhost:3000`
- [ ] Mobile Expo running: Check terminal for QR code
- [ ] Can login to admin: `admin@safeguard.com`
- [ ] Can see users in admin dashboard
- [ ] AI assistant responds (with Gemini key)
- [ ] Can trigger SOS alert
- [ ] Can view incidents

---

## 📞 Get Help

If issues persist:
1. Check terminal output for error messages
2. Review logs in `backend/routers/` or browser console (F12)
3. Verify all `.env` files are properly configured
4. Try clearing cache: `npm run build:clean` or delete `node_modules/`
5. Restart all services

---

**Last Updated:** April 27, 2026  
**Status:** Production Ready ✅
