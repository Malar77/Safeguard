from __future__ import annotations

import math
import os
import re
from typing import Literal, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import get_current_user
from database import Helpline, SafePlace, User, get_db

router = APIRouter(prefix="/api/assistant", tags=["AI Assistant"])

ASSISTANT_NAME = "SafeGuard Support Assistant"
CRISIS_ACTIONS = [
    "If you are in immediate danger, call emergency services now (112 in India) or ask someone nearby to call for you.",
    "Move to a public, well-lit place or near other people if it is safe to do so.",
    "If possible, contact a trusted person right now and tell them you need to stay with them.",
    "Use the SOS button in SafeGuard to share your location with trusted contacts.",
]

GENERAL_ACTIONS = [
    "Take one slow breath in for 4 seconds, hold for 4, and breathe out for 6.",
    "Put some distance between you and the situation that is making you feel unsafe.",
    "Message or call one trusted person and tell them what is happening.",
    "If you want, open SafeGuard counseling for more support after this conversation.",
]

TOPIC_KEYWORDS = {
    "self_harm": [
        "kill myself", "suicide", "end my life", "self harm", "hurt myself", "want to die",
        "not worth living", "end it all", "overdose", "cut myself", "i want to disappear",
    ],
    "domestic_violence": [
        "domestic violence", "abuse", "abusive", "hit me", "beating", "slap", "threatened",
        "violence at home", "family violence", "partner hurt", "husband hurt", "wife hurt",
    ],
    "harassment": [
        "harass", "harassment", "stalking", "stalker", "follow me", "catcall", "molest",
        "eve teasing", "bully", "online abuse", "threat message",
    ],
    "sexual_violence": [
        "rape", "assault", "molest", "sexual abuse", "sexual harassment", "groped", "forced sex",
    ],
    "cybercrime": [
        "cyber", "hack", "hacked", "deepfake", "blackmail", "sextortion", "fraud",
        "fake account", "online harassment", "doxx", "password",
    ],
    "panic": [
        "panic", "anxious", "anxiety", "can't breathe", "can't sleep", "overwhelmed",
        "scared", "terrified", "numb", "crying", "hopeless", "stressed",
    ],
    "child_safety": ["child", "teen", "school", "kid", "parent", "guardian", "abuse at school"],
}


class AssistantMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class AssistantChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[AssistantMessage] = Field(default_factory=list)
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class AssistantHelplineOut(BaseModel):
    name: str
    number: str
    category: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    available_24x7: bool = False


class AssistantSafePlaceOut(BaseModel):
    id: int
    name: str
    address: Optional[str] = None
    distance_km: Optional[float] = None
    place_type: Optional[str] = None
    phone: Optional[str] = None


class AssistantChatResponse(BaseModel):
    assistant_name: str
    reply: str
    distress_level: Literal["low", "moderate", "high", "critical"]
    distress_score: int
    detected_topics: list[str]
    safety_actions: list[str]
    helplines: list[AssistantHelplineOut]
    nearby_safe_places: list[AssistantSafePlaceOut]
    should_escalate: bool
    crisis_message: Optional[str] = None


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def _find_topics(text: str) -> tuple[list[str], int]:
    normalized = _normalize(text)
    score = 0
    topics: list[str] = []

    for topic, keywords in TOPIC_KEYWORDS.items():
        matched = any(keyword in normalized for keyword in keywords)
        if not matched:
            continue
        topics.append(topic)
        if topic == "self_harm":
            score += 10
        elif topic in {"sexual_violence", "domestic_violence"}:
            score += 8
        elif topic in {"harassment", "cybercrime", "child_safety"}:
            score += 5
        else:
            score += 4

    if any(word in normalized for word in ["scared", "afraid", "unsafe", "crying", "panic", "hopeless"]):
        score += 2

    if any(word in normalized for word in ["today", "right now", "now", "immediately", "urgent"]):
        score += 1

    if any(word in normalized for word in ["cannot go home", "home is unsafe", "he hit me", "she hit me"]):
        score += 2

    if score == 0:
        topics.append("general_support")

    return topics, score


def _distress_level(score: int, topics: list[str]) -> str:
    if "self_harm" in topics or score >= 12:
        return "critical"
    if score >= 8:
        return "high"
    if score >= 4:
        return "moderate"
    return "low"


def _build_actions(topics: list[str], level: str) -> list[str]:
    actions: list[str] = []
    if level in {"high", "critical"}:
        actions.extend(CRISIS_ACTIONS)
    else:
        actions.extend(GENERAL_ACTIONS)

    if "domestic_violence" in topics:
        actions.extend([
            "If it is safe, keep essential documents, medicines, keys, and a charger together.",
            "Avoid confronting the person who is hurting you if that could increase the risk.",
            "Use the Safe Routes or Safe Places page to get to a public location.",
        ])
    if "harassment" in topics or "sexual_violence" in topics:
        actions.extend([
            "Save screenshots, messages, and dates so you can report the harassment later.",
            "Block the account or number if doing so will not increase the danger.",
            "Report the incident in SafeGuard so the history is preserved.",
        ])
    if "cybercrime" in topics:
        actions.extend([
            "Change passwords, enable two-factor authentication, and log out of unknown sessions.",
            "Report the issue to the cybercrime helpline if money, impersonation, or blackmail is involved.",
        ])
    if "child_safety" in topics:
        actions.extend([
            "Tell a trusted adult, teacher, counselor, or guardian as soon as possible.",
            "Do not stay alone with anyone making you feel unsafe.",
        ])

    seen = set()
    unique_actions = []
    for action in actions:
        if action not in seen:
            seen.add(action)
            unique_actions.append(action)
    return unique_actions[:7]


def _helpline_categories(topics: list[str], level: str) -> list[str]:
    categories = ["counseling"]
    if level in {"high", "critical"}:
        categories.append("emergency")
    if "domestic_violence" in topics or "sexual_violence" in topics or "harassment" in topics:
        categories.append("women")
    if "child_safety" in topics:
        categories.append("child")
    if "cybercrime" in topics:
        categories.append("cyber")
    return categories


def _query_helplines(db: Session, topics: list[str], level: str) -> list[AssistantHelplineOut]:
    categories = _helpline_categories(topics, level)
    helplines = (
        db.query(Helpline)
        .filter(Helpline.category.in_(categories))
        .order_by(Helpline.available_24x7.desc(), Helpline.name.asc())
        .limit(6)
        .all()
    )
    return [
        AssistantHelplineOut(
            name=h.name,
            number=h.number,
            category=h.category,
            description=h.description,
            website=h.website,
            available_24x7=bool(h.available_24x7),
        )
        for h in helplines
    ]


def _distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _query_safe_places(db: Session, latitude: Optional[float], longitude: Optional[float]) -> list[AssistantSafePlaceOut]:
    if latitude is None or longitude is None:
        return []

    places = db.query(SafePlace).filter(SafePlace.is_active == True).all()
    ranked: list[tuple[float, SafePlace]] = []
    for place in places:
        if place.latitude is None or place.longitude is None:
            continue
        ranked.append((_distance_km(latitude, longitude, place.latitude, place.longitude), place))

    ranked.sort(key=lambda item: item[0])
    return [
        AssistantSafePlaceOut(
            id=place.id,
            name=place.name,
            address=place.address,
            distance_km=round(distance, 2),
            place_type=place.place_type,
            phone=place.phone,
        )
        for distance, place in ranked[:3]
    ]


def _build_local_reply(message: str, topics: list[str], level: str, user_name: str) -> str:
    if level == "critical":
        return (
            f"{user_name}, I am really sorry you are going through this. Your safety comes first. "
            "Please contact emergency services now or move to a public place with trusted people nearby. "
            "If you can, tell one person you trust that you need immediate help and use the SOS button in SafeGuard."
        )
    if level == "high":
        return (
            f"{user_name}, I hear you. This sounds serious, and you do not have to handle it alone. "
            "Take a slow breath, move a little distance from the situation, and contact someone you trust. "
            "I can help you pick the safest next step right now."
        )
    if level == "moderate":
        return (
            f"{user_name}, thank you for telling me. What you described sounds stressful, but we can break it down one step at a time. "
            "If you want, I can suggest a safe action, a helpline, or a nearby safe place."
        )
    return (
        f"{user_name}, I am here with you. Tell me what happened, and I will help with support, safety actions, and the next best step."
    )


async def _maybe_generate_llm_reply(
    message: str,
    history: list[AssistantMessage],
    user_name: str,
    topics: list[str],
    level: str,
    actions: list[str],
) -> Optional[str]:
    provider = os.getenv("AI_ASSISTANT_PROVIDER", "rule_based").strip().lower()
    api_key = os.getenv("AI_ASSISTANT_API_KEY", "").strip()
    base_url = os.getenv("AI_ASSISTANT_BASE_URL", "").strip()
    model = os.getenv("AI_ASSISTANT_MODEL", "gemini-1.5-flash")

    if not api_key:
        return None

    system_prompt = (
        "You are SafeGuard Support Assistant, a trauma-informed safety chatbot for women and children. "
        "Be empathetic, concise, and practical. Do not mention policy. Do not give diagnosis. "
        "If the user seems in immediate danger, explicitly advise emergency services and the in-app SOS flow. "
        f"User name: {user_name}. Distress level: {level}. Topics: {', '.join(topics)}. "
        f"Suggested safety actions: {'; '.join(actions)}. "
        "Write one short supportive reply in plain language, 80-120 words max."
    )

    # ─── Google Gemini API ───────────────────────────────────────────────────────
    if provider == "gemini":
        gemini_base_url = "https://generativelanguage.googleapis.com/v1beta/models"
        
        # Build conversation history
        contents = []
        for item in history[-8:]:
            contents.append({"role": "user" if item.role == "user" else "model", "text": item.content})
        contents.append({"role": "user", "text": message})

        payload = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": contents,
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": 180,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.post(
                    f"{gemini_base_url}/{model}:generateContent?key={api_key}",
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
                if "candidates" in data and len(data["candidates"]) > 0:
                    candidate = data["candidates"][0]
                    if "content" in candidate and "parts" in candidate["content"]:
                        return candidate["content"]["parts"][0]["text"].strip()
        except Exception:
            return None

    # ─── OpenAI API ──────────────────────────────────────────────────────────────
    if provider not in {"openai", "openai-compatible", "llm", "chatgpt"}:
        return None

    if not base_url:
        base_url = "https://api.openai.com/v1"
    base_url = base_url.rstrip("/")

    messages = [{"role": "system", "content": system_prompt}]
    for item in history[-8:]:
        messages.append({"role": item.role, "content": item.content})
    messages.append({"role": "user", "content": message})

    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.4,
        "max_tokens": 180,
    }

    headers = {"Authorization": f"Bearer {api_key}"}
    if provider in {"openai-compatible", "llm"}:
        headers["Content-Type"] = "application/json"

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(f"{base_url}/chat/completions", headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
    except Exception:
        return None


@router.post("/chat", response_model=AssistantChatResponse)
async def chat_with_assistant(
    payload: AssistantChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    topics, score = _find_topics(message)
    level = _distress_level(score, topics)
    safety_actions = _build_actions(topics, level)
    helplines = _query_helplines(db, topics, level)
    nearby_safe_places = _query_safe_places(db, payload.latitude, payload.longitude)

    llm_reply = await _maybe_generate_llm_reply(
        message=message,
        history=payload.history,
        user_name=current_user.full_name,
        topics=topics,
        level=level,
        actions=safety_actions,
    )
    reply = llm_reply or _build_local_reply(message, topics, level, current_user.full_name)

    crisis_message = None
    should_escalate = level in {"high", "critical"}
    if level == "critical":
        crisis_message = "This message suggests immediate danger or self-harm risk. Emergency support is recommended now."

    return AssistantChatResponse(
        assistant_name=ASSISTANT_NAME,
        reply=reply,
        distress_level=level,
        distress_score=score,
        detected_topics=topics,
        safety_actions=safety_actions,
        helplines=helplines,
        nearby_safe_places=nearby_safe_places,
        should_escalate=should_escalate,
        crisis_message=crisis_message,
    )