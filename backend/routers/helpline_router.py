from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Helpline
from schemas import HelplineOut, HelplineCreate, HelplineUpdate
from auth import require_admin
from typing import List, Optional

router = APIRouter(prefix="/api/helplines", tags=["Helplines"])


@router.get("/", response_model=List[HelplineOut])
def get_helplines(category: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Helpline).filter(Helpline.is_active == True)
    if category:
        query = query.filter(Helpline.category == category)
    return query.order_by(Helpline.category, Helpline.name).all()


@router.get("/{helpline_id}", response_model=HelplineOut)
def get_helpline(helpline_id: int, db: Session = Depends(get_db)):
    h = db.query(Helpline).filter(Helpline.id == helpline_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Helpline not found")
    return h


# ─── Admin CRUD ─────────────────────────────────────────────────────────

@router.post("/", response_model=HelplineOut)
def create_helpline(data: HelplineCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    h = Helpline(**data.model_dump())
    db.add(h)
    db.commit()
    db.refresh(h)
    return h


@router.patch("/{helpline_id}", response_model=HelplineOut)
def update_helpline(helpline_id: int, data: HelplineUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    h = db.query(Helpline).filter(Helpline.id == helpline_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Helpline not found")
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(h, key, value)
    db.commit()
    db.refresh(h)
    return h


@router.delete("/{helpline_id}")
def delete_helpline(helpline_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    h = db.query(Helpline).filter(Helpline.id == helpline_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Helpline not found")
    db.delete(h)
    db.commit()
    return {"message": "Helpline deleted"}

