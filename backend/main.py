from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from sqlalchemy import text
from database import Base, engine, init_db, SessionLocal
from routers.auth_router import router as auth_router
from routers.sos_router import router as sos_router
from routers.incident_router import router as incident_router
from routers.helpline_router import router as helpline_router
from routers.resources_router import resources_router, counseling_router, child_safety_router
from routers.safe_places_router import router as safe_places_router
from routers.ai_assistant_router import router as ai_assistant_router
from routers.admin_router import router as admin_router
from routers.notifications_router import router as notifications_router
from routers.family_router import router as family_router
from routers.counseling_session_router import router as counseling_session_router

# Initialize database: create all tables and seed data
init_db()

app = FastAPI(
    title="SafeGuard – Women & Child Safety Platform",
    description="Comprehensive API for reporting incidents, SOS alerts, legal resources, counseling, and more.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://127.0.0.1",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://10.223.158.58:3000",
        "http://10.223.158.58:8000",
        "http://192.168.156.58:3000",
        "http://192.168.156.58:8000",
        "capacitor://localhost",
        "ionic://localhost",
        "null",
    ],
    allow_origin_regex=r"^((https?|capacitor|ionic|exp)://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?)|null$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_dir = Path(__file__).resolve().parent / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

app.include_router(auth_router)
app.include_router(sos_router)
app.include_router(incident_router)
app.include_router(helpline_router)
app.include_router(resources_router)
app.include_router(counseling_router)
app.include_router(child_safety_router)
app.include_router(safe_places_router)
app.include_router(ai_assistant_router)
app.include_router(admin_router)
app.include_router(notifications_router)
app.include_router(family_router)
app.include_router(counseling_session_router)


@app.get("/", tags=["Root"])
def root():
    return {
        "platform": "SafeGuard – Women & Child Safety",
        "version": "2.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "ok", "database": "disconnected", "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
