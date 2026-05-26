# 🚀 Startup Scripts Guide

This project includes three PowerShell startup scripts to make running the full stack easier.

---

## 📁 Script Files

Located in project root:
- `start-backend.ps1` - Starts FastAPI backend on port 8000
- `start-frontend.ps1` - Starts React dev server on port 3000
- `start-mobile.ps1` - Starts Expo Metro bundler on port 8081+

---

## 🏃 Running the Scripts

### 1. Open Three PowerShell Windows

1. **Terminal 1:**
```powershell
cd "c:\Users\kam54\OneDrive\Desktop\Major\Online-women-and-Child-safety"
.\start-backend.ps1
```

2. **Terminal 2:**
```powershell
cd "c:\Users\kam54\OneDrive\Desktop\Major\Online-women-and-Child-safety"
.\start-frontend.ps1
```

3. **Terminal 3:**
```powershell
cd "c:\Users\kam54\OneDrive\Desktop\Major\Online-women-and-Child-safety"
.\start-mobile.ps1
```

---

## 📋 What Each Script Does

### start-backend.ps1
```powershell
#!/usr/bin/env powershell
Set-Location "c:\Users\kam54\OneDrive\Desktop\Major\Online-women-and-Child-safety\backend"
c:/Users/kam54/OneDrive/Desktop/Major/.venv/Scripts/python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Starts:**
- FastAPI server on `0.0.0.0:8000` (accessible from any network interface)
- Auto-reload enabled (changes detected automatically)
- Database seeding on startup

**Check:** http://localhost:8000/docs

### start-frontend.ps1
```powershell
#!/usr/bin/env powershell
Set-Location "c:\Users\kam54\OneDrive\Desktop\Major\Online-women-and-Child-safety\frontend"
npm start
```

**Starts:**
- React dev server on `localhost:3000`
- Hot-reload enabled (edit code, browser updates automatically)
- Webpack compilation with CSS/SCSS support
- Capacitor integration for Android builds

**Check:** http://localhost:3000

### start-mobile.ps1
```powershell
#!/usr/bin/env powershell
Set-Location "c:\Users\kam54\OneDrive\Desktop\Major\Online-women-and-Child-safety\mobile"
npx expo start
```

**Starts:**
- Expo Metro bundler
- QR code for scanning with Expo Go app
- Live reload for development
- Support for iOS and Android

**Scan:** QR code from terminal with Expo Go app

---

## ✅ Expected Startup Output

### Backend (start-backend.ps1)
```
INFO:     Will watch for changes in these directories: ['C:\\Users\\kam54\\OneDrive\\Desktop\\Major\\Online-women-and-Child-safety\\backend']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [26912] using WatchFiles
✅ Database seeded successfully.
INFO:     Started server process [17316]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### Frontend (start-frontend.ps1)
```
Compiled successfully!

You can now view safeguard-frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://10.223.158.58:3000

Note that the development build is not optimized.
To create a production build, use npm run build.

webpack compiled successfully
```

### Mobile (start-mobile.ps1)
```
Starting project at C:\Users\kam54\OneDrive\Desktop\Major\Online-women-and-Child-safety\mobile
Starting Metro Bundler

▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█ ▄▄▄▄▄ █▄▄▄ ▀ ██▄█ ▄▄▄▄▄ █
█ █   █ ██▄▀ █  ▀▀█ █   █ █
█ █▄▄▄█ ██▀▄ ▄▄██▀█ █▄▄▄█ █
█▄▄▄▄▄▄▄█ ▀▄█ ▀ █▄█▄▄▄▄▄▄▄█
█ ▄█  █▄██▄▀█▄▀█▀▀▀▄█▀█▀▀▄█
█▀ █▀▄▄▄ █▄██▄▄▄▄▄ ▄▀▀▄▀▀ █
█ ▀▀█▀ ▄█ ▄ █▀█▄ █ ▄ ▀█▀ ██
█ ▄▄ █ ▄▀█ ▄█▀▄▀▄▀█▄▄▀▄▀  █
█▄█▄█▄▄▄█▀▄  ▄▄   ▄▄▄  ▄▀▄█
█ ▄▄▄▄▄ ███▀▀▄  █ █▄█ ███ █
█ █   █ █ ██▄ ▀█▄▄▄  ▄ █▀▀█
█ █▄▄▄█ █▀▀  ▀█▄█▄▀▀▀▄█   █
█▄▄▄▄▄▄▄█▄█▄▄██▄▄▄██▄▄███▄█

› Metro waiting on exp://10.223.158.58:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Using Expo Go
› Press s │ switch to development build
› Press a │ open Android
› Press w │ open web
› Press j │ open debugger
› Press r │ reload app
› Press m │ toggle menu
› Press o │ open project code in your editor
› Press ? │ show all commands

Logs for your project will appear below. Press Ctrl+C to exit.
```

---

## 🔄 Live Reload & Hot Module Replacement

### Backend Changes
When you edit Python files in `backend/`:
- ✅ Auto-reloads automatically (thanks to `--reload` flag)
- Browser automatically reconnects
- Database is **NOT** reset on reload

### Frontend Changes
When you edit files in `frontend/src/`:
- ✅ Changes appear instantly in browser
- Hot reload preserves app state
- CSS changes apply without full reload

### Mobile Changes
When you edit files in `mobile/src/`:
- ✅ Changes appear instantly in Expo Go app
- Fast refresh (partial reload)
- No need to rebuild APK during development

---

## 🛑 Stopping the Scripts

### Graceful Shutdown
Press in each terminal:
```powershell
Ctrl+C
```

### Kill All Services (Nuclear Option)
```powershell
# Kill all Node processes
Get-Process node | Stop-Process -Force

# Kill all Python processes
Get-Process python | Stop-Process -Force

# Kill all adb (Android) processes
Get-Process adb | Stop-Process -Force
```

---

## 🔧 Customizing Scripts

### Change Backend Port
Edit `start-backend.ps1`:
```powershell
# Change --port 8000 to your port
c:/Users/kam54/OneDrive/Desktop/Major/.venv/Scripts/python.exe -m uvicorn main:app --host 0.0.0.0 --port 9000 --reload
```

Then update `frontend/.env`:
```env
REACT_APP_API_BASE_URL=http://localhost:9000
```

### Disable Auto-Reload
Edit `start-backend.ps1`:
```powershell
# Remove --reload flag
c:/Users/kam54/OneDrive/Desktop/Major/.venv/Scripts/python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### Skip Frontend Build
Edit `start-frontend.ps1` to skip if only using backend:
```powershell
# Skip and just run dev server
npm start -- --skip-preflight-check
```

---

## 📊 Monitoring

### Check if Services are Running

```powershell
# Check port 8000 (Backend)
Test-NetConnection -ComputerName localhost -Port 8000 -InformationLevel Detailed

# Check port 3000 (Frontend)
Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Detailed

# Check port 8081 (Mobile/Expo)
Test-NetConnection -ComputerName localhost -Port 8081 -InformationLevel Detailed
```

### View Running Processes

```powershell
# All Python processes
Get-Process python

# All Node processes
Get-Process node

# All Java processes (Gradle)
Get-Process java
```

---

## 🐛 Common Script Issues

### "Cannot find python.exe"
Update script with correct path:
```powershell
which python  # Find Python path
# Update in script
```

### "Permission denied" when running script
Run PowerShell as Administrator:
```powershell
# In PowerShell as Admin
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### "npm: command not found"
Use `npm.cmd` instead:
```powershell
npm.cmd start
```

---

## 📝 Creating Your Own Scripts

To add custom startup scripts to the project:

```powershell
# Create new script
New-Item -Path "start-custom.ps1" -ItemType File

# Add content
Add-Content -Path "start-custom.ps1" -Value @'
#!/usr/bin/env powershell
Set-Location "c:\Users\kam54\OneDrive\Desktop\Major\Online-women-and-Child-safety"
Write-Host "Custom startup script" -ForegroundColor Green
'@

# Make it executable
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

# Run it
.\start-custom.ps1
```

---

## 💡 Pro Tips

1. **Pin terminals to taskbar** for quick access
2. **Use tabs in Terminal App** (Windows 11+) instead of multiple windows
3. **Set window layout** - arrange terminals side-by-side for easy monitoring
4. **Add aliases** to your PowerShell profile:
```powershell
Set-Alias -Name start-dev -Value ".\start-backend.ps1; .\start-frontend.ps1; .\start-mobile.ps1"
```

5. **Combine into single script:**
Create `start-all.ps1`:
```powershell
Start-Process pwsh -ArgumentList "-NoExit -Command 'cd .. ; .\start-backend.ps1'"
Start-Process pwsh -ArgumentList "-NoExit -Command 'cd .. ; .\start-frontend.ps1'"
Start-Process pwsh -ArgumentList "-NoExit -Command 'cd .. ; .\start-mobile.ps1'"
```

---

**Status:** All scripts tested and working ✅  
**Last Updated:** April 27, 2026
