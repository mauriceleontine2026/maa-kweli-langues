from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.language import Language
from ..models.lesson import Lesson
from ..models.vocabulary import VocabularyItem
from ..services.perplexity_service import (
    PerplexityConfigurationError,
    PerplexityServiceError,
    enrich_vocabulary_item,
    fetch_cultural_context,
)
from ..services.security import require_admin

router = APIRouter(tags=["agent"])


class ResearchRequest(BaseModel):
    target_language: str = Field(..., min_length=2, max_length=100)
    topic: str = Field(..., min_length=2, max_length=300)

    @field_validator("target_language", "topic")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Value must not be empty")
        return value


class AuthenticExpression(BaseModel):
    expression: str = Field(..., min_length=1, max_length=500)
    translation: str = Field(..., min_length=1, max_length=500)
    usage_context: str = Field(..., min_length=1, max_length=1000)


class CulturalContextResponse(BaseModel):
    target_language: str = Field(..., min_length=1, max_length=100)
    topic: str = Field(..., min_length=1, max_length=300)
    cultural_note: str = Field(..., min_length=1, max_length=5000)
    authentic_expressions: list[AuthenticExpression] = Field(default_factory=list, max_length=20)


class VocabularyEnrichment(BaseModel):
    translation_fr: str = Field(..., min_length=1, max_length=255)
    phonetic: str = Field(..., min_length=1, max_length=255)
    example_target: str = Field(..., min_length=1, max_length=2000)
    example_fr: str = Field(..., min_length=1, max_length=2000)
    usage_context: str = Field(..., min_length=1, max_length=2000)


class VocabularyEnrichmentResponse(VocabularyEnrichment):
    item_id: int
    language_code: str
    word: str
    applied: bool


class LessonCorrection(BaseModel):
    lesson_id: int = Field(..., gt=0)
    title: str = Field(..., min_length=1, max_length=255)
    title_fr: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1, max_length=2000)
    level: str = Field(..., pattern=r"^(Débutant|Intermédiaire|Avancé)$")
    type: str = Field(..., pattern=r"^(vocabulary|phrases|letters|sounds)$")
    reason: str = Field(..., min_length=1, max_length=1000)


class MissingLesson(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    title_fr: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1, max_length=2000)
    level: str = Field(..., pattern=r"^(Débutant|Intermédiaire|Avancé)$")
    type: str = Field(..., pattern=r"^(vocabulary|phrases|letters|sounds)$")
    reason: str = Field(..., min_length=1, max_length=1000)


class LanguageAuditResponse(BaseModel):
    language_code: str
    lesson_corrections: list[LessonCorrection] = Field(default_factory=list, max_length=30)
    missing_lessons: list[MissingLesson] = Field(default_factory=list, max_length=5)
    research_note: str = Field(..., min_length=1, max_length=3000)
    applied: bool


class LanguageAuditApplyRequest(BaseModel):
    lesson_corrections: list[LessonCorrection] = Field(default_factory=list, max_length=30)
    missing_lessons: list[MissingLesson] = Field(default_factory=list, max_length=5)


class LessonCatalogItem(BaseModel):
    id: int
    title: str
    title_fr: str | None = None
    language_code: str
    level: str | None = None
    type: str | None = None
    description: str | None = None
    order: int | None = None


class LessonCatalogResponse(BaseModel):
    languages: list[dict]
    lessons: list[LessonCatalogItem]


@router.post("/research", response_model=CulturalContextResponse)
async def research(payload: ResearchRequest) -> CulturalContextResponse:
    try:
        result = await fetch_cultural_context(payload.target_language, payload.topic)
        return CulturalContextResponse.model_validate(result)
    except PerplexityConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except PerplexityServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cultural research response could not be validated",
        ) from exc


@router.get("/catalog", response_model=LessonCatalogResponse)
def lesson_catalog(db: Session = Depends(get_db), _admin=Depends(require_admin)) -> LessonCatalogResponse:
    languages = db.query(Language).order_by(Language.name.asc()).all()
    lessons = db.query(Lesson).order_by(Lesson.language_code.asc(), Lesson.order.asc()).all()
    return LessonCatalogResponse(
        languages=[{"code": language.code, "name": language.name, "name_fr": language.name_fr, "region": language.region} for language in languages],
        lessons=[LessonCatalogItem(
            id=lesson.id,
            title=lesson.title,
            title_fr=lesson.title_fr,
            language_code=lesson.language_code,
            level=lesson.level,
            type=lesson.type,
            description=lesson.description,
            order=lesson.order,
        ) for lesson in lessons],
    )
@router.post("/enrich/vocabulary/{item_id}", response_model=VocabularyEnrichmentResponse)
async def enrich_vocabulary(
    item_id: int,
    apply: bool = False,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
) -> VocabularyEnrichmentResponse:
    item = db.query(VocabularyItem).filter(VocabularyItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vocabulary item not found")

    try:
        enrichment = VocabularyEnrichment.model_validate(await enrich_vocabulary_item({
            "id": item.id,
            "language_code": item.language_code,
            "word": item.word,
            "translation_fr": item.translation_fr,
            "phonetic": item.phonetic,
            "example_target": item.example_target,
            "example_fr": item.example_fr,
        }))
    except PerplexityConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except PerplexityServiceError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Enrichment response could not be validated") from exc

    if apply:
        for field in ("translation_fr", "phonetic", "example_target", "example_fr"):
            setattr(item, field, getattr(enrichment, field))
        db.add(item)
        db.commit()

    return VocabularyEnrichmentResponse(
        item_id=item.id,
        language_code=item.language_code,
        word=item.word,
        applied=apply,
        **enrichment.model_dump(),
    )


@router.post("/audit/language/{language_code}", response_model=LanguageAuditResponse)
async def audit_language(
    language_code: str,
    apply: bool = False,
    payload: LanguageAuditApplyRequest | None = None,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
) -> LanguageAuditResponse:
    lessons = db.query(Lesson).filter(Lesson.language_code == language_code).order_by(Lesson.order.asc()).all()
    if not lessons:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No lessons found for this language")

    language = db.query(Language).filter(Language.code == language_code).first()
    language_name = language.name_fr if language else language_code
    try:
        result = payload.model_dump() if apply and payload else await audit_language_lessons(language_code, language_name, [
            {"id": lesson.id, "title": lesson.title, "title_fr": lesson.title_fr,
             "description": lesson.description, "level": lesson.level, "type": lesson.type,
             "order": lesson.order}
            for lesson in lessons
        ])
        audit = LanguageAuditResponse.model_validate({
            **result,
            "language_code": language_code,
            "research_note": result.get("research_note", "Modifications validées par l'administrateur."),
            "applied": apply,
        })
    except PerplexityConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except PerplexityServiceError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Language audit response could not be validated") from exc

    if apply:
        lesson_by_id = {lesson.id: lesson for lesson in lessons}
        for correction in audit.lesson_corrections:
            lesson = lesson_by_id.get(correction.lesson_id)
            if lesson:
                lesson.title = correction.title
                lesson.title_fr = correction.title_fr
                lesson.description = correction.description
                lesson.level = correction.level
                lesson.type = correction.type
        next_order = max((lesson.order or 0 for lesson in lessons), default=0) + 1
        for missing in audit.missing_lessons:
            db.add(Lesson(title=missing.title, title_fr=missing.title_fr, language_code=language_code,
                          lesson_number=next_order, order=next_order, level=missing.level,
                          type=missing.type, description=missing.description, published=True))
            next_order += 1
        db.commit()

    return audit