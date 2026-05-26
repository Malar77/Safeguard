from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, LegalResource, CounselingResource, ChildSafetyTip, LegalResourceBookmark, User
from schemas import (LegalResourceOut, LegalResourceCreate, LegalResourceUpdate,
                     CounselingResourceOut, CounselingResourceCreate, CounselingResourceUpdate,
                     ChildSafetyTipOut, ChildSafetyTipCreate, ChildSafetyTipUpdate, LegalBookmarkOut)
from auth import require_admin, get_current_user
from typing import List, Optional

resources_router = APIRouter(prefix="/api/resources", tags=["Resources"])
counseling_router = APIRouter(prefix="/api/counseling", tags=["Counseling"])
child_safety_router = APIRouter(prefix="/api/child-safety", tags=["Child Safety"])


# ─── Legal Resources ────────────────────────────────────────────────────

@resources_router.get("/legal", response_model=List[LegalResourceOut])
def get_legal_resources(category: Optional[str] = None, q: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(LegalResource)
    if category:
        query = query.filter(LegalResource.category == category)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            (LegalResource.title.ilike(like)) |
            (LegalResource.summary.ilike(like)) |
            (LegalResource.law_name.ilike(like))
        )
    return query.order_by(LegalResource.title).all()


@resources_router.get("/legal/categories", response_model=List[str])
def get_legal_categories(db: Session = Depends(get_db)):
    rows = db.query(LegalResource.category).distinct().order_by(LegalResource.category).all()
    return [r[0] for r in rows if r[0]]


@resources_router.get("/legal/{resource_id}", response_model=LegalResourceOut)
def get_legal_resource(resource_id: int, db: Session = Depends(get_db)):
    res = db.query(LegalResource).filter(LegalResource.id == resource_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Resource not found")
    return res


@resources_router.post("/legal", response_model=LegalResourceOut)
def create_legal_resource(data: LegalResourceCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    res = LegalResource(**data.model_dump())
    db.add(res)
    db.commit()
    db.refresh(res)
    return res


@resources_router.patch("/legal/{resource_id}", response_model=LegalResourceOut)
def update_legal_resource(resource_id: int, data: LegalResourceUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    res = db.query(LegalResource).filter(LegalResource.id == resource_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Resource not found")
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(res, key, value)
    db.commit()
    db.refresh(res)
    return res


@resources_router.delete("/legal/{resource_id}")
def delete_legal_resource(resource_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    res = db.query(LegalResource).filter(LegalResource.id == resource_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Resource not found")
    db.delete(res)
    db.commit()
    return {"message": "Legal resource deleted"}


@resources_router.get("/legal/bookmarks", response_model=List[LegalBookmarkOut])
def my_legal_bookmarks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.query(LegalResourceBookmark).filter(
        LegalResourceBookmark.user_id == current_user.id
    ).order_by(LegalResourceBookmark.created_at.desc()).all()

    out = []
    for b in rows:
        out.append({
            "id": b.id,
            "user_id": b.user_id,
            "legal_resource_id": b.legal_resource_id,
            "created_at": b.created_at,
            "resource": b.resource,
        })
    return out


@resources_router.post("/legal/{resource_id}/bookmark", response_model=LegalBookmarkOut)
def add_legal_bookmark(
    resource_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resource = db.query(LegalResource).filter(LegalResource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    existing = db.query(LegalResourceBookmark).filter(
        LegalResourceBookmark.user_id == current_user.id,
        LegalResourceBookmark.legal_resource_id == resource_id,
    ).first()
    if existing:
        return {
            "id": existing.id,
            "user_id": existing.user_id,
            "legal_resource_id": existing.legal_resource_id,
            "created_at": existing.created_at,
            "resource": existing.resource,
        }

    bookmark = LegalResourceBookmark(user_id=current_user.id, legal_resource_id=resource_id)
    db.add(bookmark)
    db.commit()
    db.refresh(bookmark)
    return {
        "id": bookmark.id,
        "user_id": bookmark.user_id,
        "legal_resource_id": bookmark.legal_resource_id,
        "created_at": bookmark.created_at,
        "resource": bookmark.resource,
    }


@resources_router.delete("/legal/{resource_id}/bookmark")
def remove_legal_bookmark(
    resource_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bookmark = db.query(LegalResourceBookmark).filter(
        LegalResourceBookmark.user_id == current_user.id,
        LegalResourceBookmark.legal_resource_id == resource_id,
    ).first()
    if not bookmark:
        return {"message": "Bookmark already removed"}

    db.delete(bookmark)
    db.commit()
    return {"message": "Bookmark removed"}


# ─── Counseling Resources ────────────────────────────────────────────────

@counseling_router.get("/", response_model=List[CounselingResourceOut])
def get_counseling(category: Optional[str] = None, is_online: Optional[bool] = None, db: Session = Depends(get_db)):
    query = db.query(CounselingResource)
    if category:
        query = query.filter(CounselingResource.category == category)
    if is_online is not None:
        query = query.filter(CounselingResource.is_online == is_online)
    return query.order_by(CounselingResource.title).all()


@counseling_router.get("/{resource_id}", response_model=CounselingResourceOut)
def get_counseling_resource(resource_id: int, db: Session = Depends(get_db)):
    res = db.query(CounselingResource).filter(CounselingResource.id == resource_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Resource not found")
    return res


@counseling_router.post("/", response_model=CounselingResourceOut)
def create_counseling_resource(data: CounselingResourceCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    res = CounselingResource(**data.model_dump())
    db.add(res)
    db.commit()
    db.refresh(res)
    return res


@counseling_router.patch("/{resource_id}", response_model=CounselingResourceOut)
def update_counseling_resource(resource_id: int, data: CounselingResourceUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    res = db.query(CounselingResource).filter(CounselingResource.id == resource_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Resource not found")
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(res, key, value)
    db.commit()
    db.refresh(res)
    return res


@counseling_router.delete("/{resource_id}")
def delete_counseling_resource(resource_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    res = db.query(CounselingResource).filter(CounselingResource.id == resource_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Resource not found")
    db.delete(res)
    db.commit()
    return {"message": "Counseling resource deleted"}


# ─── Child Safety Tips ───────────────────────────────────────────────────

@child_safety_router.get("/", response_model=List[ChildSafetyTipOut])
def get_child_safety_tips(category: Optional[str] = None, age_group: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(ChildSafetyTip).filter(ChildSafetyTip.is_active == True)
    if category:
        query = query.filter(ChildSafetyTip.category == category)
    if age_group:
        query = query.filter(ChildSafetyTip.age_group == age_group)
    return query.order_by(ChildSafetyTip.category, ChildSafetyTip.title).all()


@child_safety_router.get("/{tip_id}", response_model=ChildSafetyTipOut)
def get_child_safety_tip(tip_id: int, db: Session = Depends(get_db)):
    tip = db.query(ChildSafetyTip).filter(ChildSafetyTip.id == tip_id).first()
    if not tip:
        raise HTTPException(status_code=404, detail="Tip not found")
    return tip


@child_safety_router.post("/", response_model=ChildSafetyTipOut)
def create_child_safety_tip(data: ChildSafetyTipCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    tip = ChildSafetyTip(**data.model_dump())
    db.add(tip)
    db.commit()
    db.refresh(tip)
    return tip


@child_safety_router.patch("/{tip_id}", response_model=ChildSafetyTipOut)
def update_child_safety_tip(tip_id: int, data: ChildSafetyTipUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    tip = db.query(ChildSafetyTip).filter(ChildSafetyTip.id == tip_id).first()
    if not tip:
        raise HTTPException(status_code=404, detail="Tip not found")
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(tip, key, value)
    db.commit()
    db.refresh(tip)
    return tip


@child_safety_router.delete("/{tip_id}")
def delete_child_safety_tip(tip_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    tip = db.query(ChildSafetyTip).filter(ChildSafetyTip.id == tip_id).first()
    if not tip:
        raise HTTPException(status_code=404, detail="Tip not found")
    tip.is_active = False
    db.commit()
    return {"message": "Tip deactivated"}

