from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db, User, UserRole
from schemas import UserCreate, UserLogin, Token, UserOut, TrustedContactCreate, TrustedContactOut, UserUpdate, ChangePassword
from auth import hash_password, verify_password, create_access_token, get_current_user
from email_service import send_login_alert_email, send_registration_alert_email
from typing import List

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register", response_model=Token)
def register(user_data: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    normalized_email = user_data.email.strip().lower()
    existing = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if existing:
        # Idempotent signup: if account already exists and password matches,
        # return a normal auth token so users can continue without manual login.
        if verify_password(user_data.password, existing.hashed_password):
            if not existing.is_active:
                raise HTTPException(status_code=403, detail="Account is deactivated. Contact support.")
            token = create_access_token({"sub": existing.email})
            return Token(access_token=token, token_type="bearer", user=UserOut.model_validate(existing))
        raise HTTPException(status_code=400, detail="Email already registered. Please log in.")
    # allow child/women/parent; admin/counselor cannot be self-assigned
    allowed_roles = {"user", "child", "women", "parent"}
    requested_role = user_data.role if user_data.role in allowed_roles else "user"
    user = User(
        full_name=user_data.full_name,
        email=normalized_email,
        phone=user_data.phone,
        hashed_password=hash_password(user_data.password),
        role=UserRole(requested_role),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    background_tasks.add_task(send_registration_alert_email, user)
    token = create_access_token({"sub": user.email})
    return Token(access_token=token, token_type="bearer", user=UserOut.model_validate(user))


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated. Contact support.")
    token = create_access_token({"sub": user.email})
    background_tasks.add_task(send_login_alert_email, user, request.client.host if request.client else None)
    return Token(access_token=token, token_type="bearer", user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/search")
def search_user(email: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Search for a user by email during family linking process."""
    normalized_email = email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot link with yourself")
    
    # Return user info (no sensitive data like password)
    return {
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
        }
    }


@router.put("/me", response_model=UserOut)
def update_profile(data: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.full_name is not None:
        current_user.full_name = data.full_name
    if data.phone is not None:
        current_user.phone = data.phone
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password")
def change_password(data: ChangePassword, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    current_user.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


@router.get("/trusted-contacts", response_model=List[TrustedContactOut])
def get_contacts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return current_user.trusted_contacts


@router.post("/trusted-contacts", response_model=TrustedContactOut)
def add_contact(data: TrustedContactCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from database import TrustedContact
    if len(current_user.trusted_contacts) >= 5:
        raise HTTPException(status_code=400, detail="Maximum 5 trusted contacts allowed")
    contact = TrustedContact(user_id=current_user.id, **data.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.put("/trusted-contacts/{contact_id}", response_model=TrustedContactOut)
def update_contact(contact_id: int, data: TrustedContactCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from database import TrustedContact
    contact = db.query(TrustedContact).filter(
        TrustedContact.id == contact_id,
        TrustedContact.user_id == current_user.id
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    for key, value in data.model_dump().items():
        setattr(contact, key, value)
    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/trusted-contacts/{contact_id}")
def delete_contact(contact_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from database import TrustedContact
    contact = db.query(TrustedContact).filter(
        TrustedContact.id == contact_id,
        TrustedContact.user_id == current_user.id
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    db.delete(contact)
    db.commit()
    return {"message": "Contact removed"}


@router.delete("/me")
def delete_account(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Permanently delete the authenticated user's account and all associated data."""
    db.delete(current_user)
    db.commit()
    return {"message": "Account deleted successfully"}

