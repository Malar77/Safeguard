from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, SafePlace
from schemas import SafePlaceOut, SafePlaceCreate, SafePlaceUpdate
from auth import require_admin
from typing import List, Optional
import math

router = APIRouter(prefix="/api/safe-places", tags=["Safe Places"])


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in km between two lat/lon coordinates."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@router.get("/", response_model=List[SafePlaceOut])
def get_safe_places(
    place_type: Optional[str] = None,
    city: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(SafePlace).filter(SafePlace.is_active == True)
    if place_type:
        query = query.filter(SafePlace.place_type == place_type)
    if city:
        query = query.filter(SafePlace.city.ilike(f"%{city}%"))
    return query.order_by(SafePlace.name).all()


@router.get("/nearby", response_model=List[SafePlaceOut])
def get_nearby_places(
    lat: float,
    lon: float,
    radius_km: float = 20.0,
    place_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get safe places within radius_km of given coordinates."""
    query = db.query(SafePlace).filter(SafePlace.is_active == True)
    if place_type:
        query = query.filter(SafePlace.place_type == place_type)
    all_places = query.all()
    nearby = []
    for place in all_places:
        dist = haversine_distance(lat, lon, place.latitude, place.longitude)
        if dist <= radius_km:
            nearby.append((dist, place))
    nearby.sort(key=lambda x: x[0])
    return [p for _, p in nearby]


@router.get("/{place_id}", response_model=SafePlaceOut)
def get_safe_place(place_id: int, db: Session = Depends(get_db)):
    place = db.query(SafePlace).filter(SafePlace.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Safe place not found")
    return place


# ─── Admin CRUD ──────────────────────────────────────────────────────────

@router.post("/", response_model=SafePlaceOut)
def create_safe_place(data: SafePlaceCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    place = SafePlace(**data.model_dump())
    db.add(place)
    db.commit()
    db.refresh(place)
    return place


@router.patch("/{place_id}", response_model=SafePlaceOut)
def update_safe_place(place_id: int, data: SafePlaceUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    place = db.query(SafePlace).filter(SafePlace.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Safe place not found")
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(place, key, value)
    db.commit()
    db.refresh(place)
    return place


@router.delete("/{place_id}")
def delete_safe_place(place_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    place = db.query(SafePlace).filter(SafePlace.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Safe place not found")
    db.delete(place)
    db.commit()
    return {"message": "Safe place deleted"}

