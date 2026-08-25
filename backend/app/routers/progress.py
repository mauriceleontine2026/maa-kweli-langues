from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.progress import UserProgress
from ..services.security import get_current_user

router = APIRouter()

MAX_XP_PER_UPDATE = 100


class ProgressUpdateRequest(BaseModel):
    type: str | None = None
    language_code: str | None = None
    lesson_number: int | None = None
    xp: int | None = Field(default=None, ge=0, le=MAX_XP_PER_UPDATE)


def _next_unlocked_lesson(completed_lessons: list | None) -> int:
    lessons = []
    if completed_lessons:
        for item in completed_lessons:
            try:
                lessons.append(int(item))
            except (TypeError, ValueError):
                continue
    lessons = sorted(set(lessons))
    next_lesson = 1
    for lesson in lessons:
        if lesson == next_lesson:
            next_lesson += 1
        elif lesson > next_lesson:
            break
    return next_lesson


@router.get("")
def get_progress(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = str(current_user.id)
    progresses = db.query(UserProgress).filter(UserProgress.user_id == user_id).all()

    return [
        {
            "language_code": progress.language_code,
            "xp": progress.xp,
            "streak": progress.streak,
            "completed_lessons": progress.completed_lessons,
            "current_lesson": _next_unlocked_lesson(progress.completed_lessons),
            "next_goal": progress.next_goal,
        }
        for progress in progresses
    ]


@router.post("")
def update_progress(payload: ProgressUpdateRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = str(current_user.id)
    language_code = payload.language_code or "fr"
    progress = db.query(UserProgress).filter(UserProgress.user_id == user_id, UserProgress.language_code == language_code).first()

    if not progress:
        progress = UserProgress(user_id=user_id, language_code=language_code, xp=0, streak=0, completed_lessons=[], next_goal=None)
        db.add(progress)

    completed_lessons = list(progress.completed_lessons or [])
    is_new_lesson_completion = payload.lesson_number is not None and payload.lesson_number not in completed_lessons
    if is_new_lesson_completion:
        completed_lessons.append(payload.lesson_number)

    # Only award XP/streak for a genuinely new lesson completion, and cap XP
    # per call (MAX_XP_PER_UPDATE) — otherwise a client could repeatedly call
    # this endpoint with an untouched lesson_number to inflate its own
    # ranking indefinitely. Streak is further limited to once per UTC
    # calendar day so replaying the same completion can't fast-forward it.
    now = datetime.now(timezone.utc)
    already_counted_today = bool(progress.updated_at and progress.updated_at.date() == now.date())
    if is_new_lesson_completion:
        progress.xp = (progress.xp or 0) + (payload.xp or 0)
        if not already_counted_today:
            progress.streak = (progress.streak or 0) + 1

    progress.completed_lessons = completed_lessons
    progress.language_code = language_code
    progress.updated_at = now
    if not progress.next_goal:
        progress.next_goal = "Terminer 3 leçons cette semaine"

    db.commit()
    db.refresh(progress)
    completed_lessons = progress.completed_lessons or []
    current_lesson = _next_unlocked_lesson(completed_lessons)
    return {
        "language_code": progress.language_code,
        "xp": progress.xp,
        "streak": progress.streak,
        "completed_lessons": progress.completed_lessons,
        "current_lesson": current_lesson,
        "next_goal": progress.next_goal,
    }
