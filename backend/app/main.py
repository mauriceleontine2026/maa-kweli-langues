from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .database import Base, engine
from .config import get_allowed_origins, get_backend_proxy_target
from .routers import health, auth, lessons, progress, audio, ai, languages, vocabulary, contributions, users, leaderboard
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import json
import os
import re
import secrets
import unicodedata
from .models.language import Language
from .models.lesson import Lesson
from .models.vocabulary import VocabularyItem
from .database import SessionLocal
from .services import security
from .services.security import require_admin

app = FastAPI(title="M'baara API", version="0.1.0")

allowed_origins = get_allowed_origins()

if any(origin.strip() in {"*", "null"} for origin in allowed_origins):
    raise RuntimeError(
        "Insecure CORS configuration detected. allow_origins must contain only explicit trusted origins when credentials are enabled."
    )

Base.metadata.create_all(bind=engine)

from sqlalchemy import inspect, text


def _ensure_user_role_column():
    inspector = inspect(engine)
    if 'users' not in inspector.get_table_names():
        return
    columns = [column['name'] for column in inspector.get_columns('users')]
    with engine.begin() as conn:
        if 'role' not in columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user'"))
        if 'email_verified' not in columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE NOT NULL"))


def _ensure_lesson_columns():
    inspector = inspect(engine)
    if 'lessons' not in inspector.get_table_names():
        return
    columns = {column['name'] for column in inspector.get_columns('lessons')}
    with engine.begin() as conn:
        if 'title_fr' not in columns:
            conn.execute(text('ALTER TABLE lessons ADD COLUMN title_fr VARCHAR(255)'))
        if 'level' not in columns:
            conn.execute(text('ALTER TABLE lessons ADD COLUMN level VARCHAR(50)'))
        if 'type' not in columns:
            conn.execute(text('ALTER TABLE lessons ADD COLUMN "type" VARCHAR(50)'))
        if '"order"' not in columns and 'order' not in columns:
            conn.execute(text('ALTER TABLE lessons ADD COLUMN "order" INTEGER DEFAULT 1'))
        if 'description' not in columns:
            conn.execute(text('ALTER TABLE lessons ADD COLUMN description TEXT'))


_ensure_user_role_column()
_ensure_lesson_columns()


def _normalize_language_slug(value):
    text = str(value or "").lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = re.sub(r"[^a-z0-9]+", "", text)
    return text


def _seed_dictionary_content(db):
    root_candidates = [
        Path(__file__).resolve().parents[2] / "src" / "data" / "dictionnaires",
        Path(__file__).resolve().parents[2] / "src" / "Dictionnaires des langues de l'application M'Baara",
    ]
    root_candidates = [root for root in root_candidates if root.exists()]
    if not root_candidates:
        return

    def _mark_language_active(language_code: str):
        language_row = db.query(Language).filter(Language.code == language_code).first()
        if language_row:
            language_row.status = "active"
            language_row.total_lessons = max(language_row.total_lessons or 0, 1)

    language_aliases = {
        "francais": "francais",
        "anglais": "anglais",
        "english": "anglais",
        "aleman": "allemand",
        "allemand": "allemand",
        "deutsch": "allemand",
        "arabe": "arabe",
        "arabic": "arabe",
        "espagnol": "espagnol",
        "espanol": "espagnol",
        "italien": "italien",
        "italiano": "italien",
        "portugais": "portugais",
        "portugues": "portugais",
        "russe": "russe",
        "russian": "russe",
        "japonais": "japonais",
        "japanese": "japonais",
        "chinois": "chinois",
        "mandarin": "chinois",
        "pular": "pular",
        "pulaar": "pular",
        "soussou": "soussou",
        "soso": "soussou",
        "malinke": "malinke",
        "malinké": "malinke",
        "guerze": "guerze",
        "kpele": "guerze",
        "kponon": "kono",
        "konnon": "kono",
        "konon": "kono",
        "kono": "kono",
        "bissa": "bissa",
        "kissi": "kissi",
        "kisi": "kissi",
        "lingala": "lingala",
        "swahili": "swahili",
        "yoruba": "yoruba",
        "igbo": "igbo",
        "nouchi": "nouchi",
        "wolof": "wolof",
        "dioula": "dioula",
        "fulfulde": "fulfulde",
        "toma": "toma",
        "loma": "toma",
        "moore": "moore",
        "mooré": "moore",
        "hindi": "hindi",
    }

    def _iter_vocab_entries(payload):
        if isinstance(payload, list):
            for item in payload:
                yield from _iter_vocab_entries(item)
            return
        if not isinstance(payload, dict):
            return
        if "vocabulaire" in payload and isinstance(payload["vocabulaire"], list):
            for item in payload["vocabulaire"]:
                yield from _iter_vocab_entries(item)
            return
        yield payload

    def _extract_text(item, preferred_keys):
        for key in preferred_keys:
            value = item.get(key)
            if value is not None and str(value).strip():
                return str(value)
        for key, value in item.items():
            key_lower = key.lower()
            if key_lower in {"id", "lecon", "titre", "description", "categorie", "category", "vocabulaire"}:
                continue
            if key_lower.endswith("_fr") or key_lower in {"francais", "translation_fr", "translation", "french", "fr"}:
                continue
            if key_lower.startswith("exemple") or key_lower.startswith("example") or key_lower in {"phonetique", "phonetic"}:
                continue
            if isinstance(value, str) and value.strip():
                return value
        return None

    def _extract_translation(item):
        for key in ["francais", "translation_fr", "translation", "french", "fr"]:
            value = item.get(key)
            if value is not None and str(value).strip():
                return str(value)
        for key, value in item.items():
            key_lower = key.lower()
            if key_lower.startswith("exemple") or key_lower.startswith("example"):
                continue
            if key_lower in {"id", "lecon", "titre", "description", "categorie", "category", "vocabulaire"}:
                continue
            if isinstance(value, str) and value.strip() and key_lower not in {"phonetique", "phonetic"}:
                if key_lower not in {"pular", "malinke", "guerze", "kpele", "langue_cible", "word", "target", "term", "phrase", "swahili", "wolof", "yoruba", "igbo", "lingala", "dioula", "bissa", "kissi", "toma", "moore", "kono", "nouchi"}:
                    return value
        return None

    def _extract_example_target(item):
        for key in ["exemple_langue_cible", "example_target", "exemple", "example", "exemple_pular", "exemple_malinke", "exemple_kpele"]:
            value = item.get(key)
            if value is not None and str(value).strip():
                return str(value)
        for key, value in item.items():
            key_lower = key.lower()
            if key_lower.startswith("exemple") or key_lower.startswith("example"):
                if isinstance(value, str) and value.strip():
                    return value
        return None

    def _extract_example_fr(item):
        for key in ["exemple_francais", "example_fr", "example_translation", "exemple_traduction"]:
            value = item.get(key)
            if value is not None and str(value).strip():
                return str(value)
        return None

    languages = db.query(Language).all()
    known_codes = {_normalize_language_slug(lang.code): lang.code for lang in languages}
    known_names = {_normalize_language_slug(lang.name): lang.code for lang in languages if lang.name}
    known_name_fr = {_normalize_language_slug(lang.name_fr): lang.code for lang in languages if lang.name_fr}

    processed_roots = set()
    for root in root_candidates:
        for language_dir in sorted(root.iterdir()):
            if not language_dir.is_dir():
                continue
            if language_dir in processed_roots:
                continue
            processed_roots.add(language_dir)

            folder_slug = _normalize_language_slug(language_dir.name)
            lang_code = language_aliases.get(folder_slug)
            if not lang_code:
                lang_code = known_codes.get(folder_slug) or known_names.get(folder_slug) or known_name_fr.get(folder_slug)
            if not lang_code:
                for candidate in known_codes:
                    if candidate in folder_slug or folder_slug in candidate:
                        lang_code = known_codes[candidate]
                        break
            if not lang_code:
                continue

            language_row = db.query(Language).filter(Language.code == lang_code).first()
            if language_row:
                language_row.status = "active"
                language_row.total_lessons = max(language_row.total_lessons or 0, 1)

            processed_items = 0
            has_content = False
            for json_file in sorted(language_dir.glob("*.json")):
                try:
                    with open(json_file, "r", encoding="utf-8") as fh:
                        payload = json.load(fh)
                except Exception:
                    continue
                if not isinstance(payload, (list, dict)):
                    continue

                has_content = True
                lesson_exists = db.query(Lesson).filter(Lesson.language_code == lang_code, Lesson.lesson_number == 1).first()
                if not lesson_exists:
                    lesson = Lesson(
                        title=f"Leçon 1 - {language_row.name_fr if language_row else lang_code}",
                        language_code=lang_code,
                        lesson_number=1,
                        difficulty="beginner",
                        content=f"Vocabulaire et expressions de base pour {language_row.name_fr if language_row else lang_code}.",
                        published=True,
                    )
                    db.add(lesson)
                    db.commit()
                    db.refresh(lesson)

                for item in _iter_vocab_entries(payload):
                    if not isinstance(item, dict):
                        continue
                    target_value = _extract_text(item, [
                        "langue_cible", "word", "target", "term", "phrase", "pular", "malinke", "guerze", "kpele", "swahili",
                        "wolof", "yoruba", "igbo", "lingala", "dioula", "bissa", "kissi", "toma", "moore", "kono", "nouchi", "hindi"
                    ])
                    if not target_value:
                        continue
                    translation_value = _extract_translation(item) or _extract_text(item, ["francais", "translation_fr", "translation", "french", "fr"])
                    example_target = _extract_example_target(item)
                    example_fr = _extract_example_fr(item) or translation_value
                    phonetic = item.get("phonetique") or item.get("phonetic")
                    category = item.get("categorie") or item.get("category")

                    existing = db.query(VocabularyItem).filter(
                        VocabularyItem.language_code == lang_code,
                        VocabularyItem.lesson_number == 1,
                        VocabularyItem.word == str(target_value),
                    ).first()
                    if existing is None:
                        db.add(VocabularyItem(
                            language_code=lang_code,
                            lesson_number=1,
                            word=str(target_value),
                            translation_fr=str(translation_value) if translation_value is not None else None,
                            phonetic=str(phonetic) if phonetic is not None else None,
                            example_target=str(example_target) if example_target is not None else None,
                            example_fr=str(example_fr) if example_fr is not None else None,
                            difficulty=str(category) if category else "beginner",
                        ))
                        processed_items += 1
                db.commit()
            if has_content or processed_items > 0:
                _mark_language_active(lang_code)
            if processed_items > 0 and language_row:
                language_row.total_lessons = max(language_row.total_lessons or 0, 1)
                db.commit()


def _build_theme_vocab(theme_title: str, difficulty: str):
    normalized = (theme_title or "").lower()
    if "couleur" in normalized:
        return [
            ("rouge", "rouge", "Le rouge est ma couleur préférée."),
            ("bleu", "bleu", "Le ciel est bleu aujourd'hui."),
            ("vert", "vert", "J'aime le vert dans la nature."),
        ]
    if "famille" in normalized:
        return [
            ("mère", "mère", "Ma mère prépare le dîner."),
            ("père", "père", "Mon père travaille beaucoup."),
            ("frère", "frère", "Mon frère joue au football."),
        ]
    if "nombre" in normalized or "compter" in normalized or "prix" in normalized:
        return [
            ("un", "un", "Un livre sur la table."),
            ("deux", "deux", "Deux amis attendent ici."),
            ("trois", "trois", "Trois pommes dans le panier."),
        ]
    if "salut" in normalized or "bonjour" in normalized or "merci" in normalized:
        return [
            ("bonjour", "bonjour", "Bonjour, comment ça va ?"),
            ("merci", "merci", "Merci beaucoup pour votre aide."),
            ("au revoir", "au revoir", "Au revoir, à bientôt !"),
        ]
    if "temps" in normalized or "météo" in normalized or "saison" in normalized:
        return [
            ("soleil", "soleil", "Le soleil brille aujourd'hui."),
            ("pluie", "pluie", "La pluie tombe doucement."),
            ("hiver", "hiver", "L'hiver est très froid."),
        ]
    if "direction" in normalized or "ville" in normalized or "marché" in normalized:
        return [
            ("gauche", "gauche", "Tournez à gauche au carrefour."),
            ("droite", "droite", "Continuez tout droit."),
            ("marché", "marché", "Je vais au marché ce matin."),
        ]
    if "aliment" in normalized or "nourriture" in normalized or "restaurant" in normalized:
        return [
            ("pain", "pain", "Je mange du pain tous les jours."),
            ("eau", "eau", "Je bois de l'eau fraîche."),
            ("riz", "riz", "Le riz est un aliment de base."),
        ]
    if "maison" in normalized or "pièce" in normalized or "objet" in normalized:
        return [
            ("chambre", "chambre", "La chambre est propre."),
            ("cuisine", "cuisine", "La cuisine est grande."),
            ("table", "table", "La table est en bois."),
        ]
    if "animal" in normalized:
        return [
            ("chien", "chien", "Le chien aboie fort."),
            ("chat", "chat", "Le chat dort sur le canapé."),
            ("oiseau", "oiseau", "L'oiseau chante le matin."),
        ]
    if "émotion" in normalized or "sentiment" in normalized:
        return [
            ("heureux", "heureux", "Je suis heureux aujourd'hui."),
            ("triste", "triste", "Je suis triste ce matin."),
            ("calme", "calme", "Je me sens calme."),
        ]
    if "santé" in normalized or "malade" in normalized or "symptôme" in normalized:
        return [
            ("douleur", "douleur", "J'ai une douleur dans la tête."),
            ("médicament", "médicament", "Je prends un médicament."),
            ("repos", "repos", "Le repos aide à guérir."),
        ]
    if "vêtement" in normalized or "robe" in normalized or "chaussure" in normalized:
        return [
            ("robe", "robe", "Je porte une robe bleue."),
            ("pantalon", "pantalon", "Mon pantalon est noir."),
            ("chaussure", "chaussure", "Mes chaussures sont propres."),
        ]
    if "transport" in normalized or "train" in normalized or "bus" in normalized or "voiture" in normalized:
        return [
            ("bus", "bus", "Je prends le bus le matin."),
            ("train", "train", "Le train part à l'heure."),
            ("voiture", "voiture", "La voiture est garée dehors."),
        ]
    if "loisir" in normalized or "sport" in normalized or "jeu" in normalized:
        return [
            ("football", "football", "J'aime jouer au football."),
            ("musique", "musique", "La musique me détend."),
            ("lecture", "lecture", "La lecture est très agréable."),
        ]
    if "voyage" in normalized or "culture" in normalized:
        return [
            ("gare", "gare", "Où se trouve la gare ?"),
            ("voyage", "voyage", "Le voyage est agréable."),
            ("culture", "culture", "La culture locale est fascinante."),
        ]
    if "tradition" in normalized or "coutume" in normalized or "fête" in normalized:
        return [
            ("fête", "fête", "Nous célébrons cette fête ensemble."),
            ("coutume", "coutume", "Cette coutume est ancienne."),
            ("tradition", "tradition", "La tradition locale est importante."),
        ]

    return [
        (f"{theme_title} 1", f"Mot 1", f"{theme_title} 1"),
        (f"{theme_title} 2", f"Mot 2", f"{theme_title} 2"),
        (f"{theme_title} 3", f"Mot 3", f"{theme_title} 3"),
    ]


def _seed_missing_lessons(db, min_lessons: int = 20):
    lesson_themes = [
        {
            "title": "Salutations",
            "summary": "Apprenez à dire bonjour, au revoir, merci et bienvenue dans cette langue.",
        },
        {
            "title": "Se présenter",
            "summary": "Présentez-vous, donnez votre nom, votre âge et votre pays d'origine.",
        },
        {
            "title": "Les nombres",
            "summary": "Comptez, dites les prix et exprimez des quantités simples.",
        },
        {
            "title": "Les couleurs",
            "summary": "Découvrez les noms des couleurs et décrivez des objets du quotidien.",
        },
        {
            "title": "La famille",
            "summary": "Parlez des membres de votre famille et de leurs relations.",
        },
        {
            "title": "Le temps",
            "summary": "Apprenez à parler du temps qu'il fait et des saisons.",
        },
        {
            "title": "Les directions",
            "summary": "Demandez et donnez des directions dans la ville ou au marché.",
        },
        {
            "title": "Les aliments",
            "summary": "Nommez les aliments de base et exprimez vos goûts.",
        },
        {
            "title": "Au marché",
            "summary": "Achetez des produits, négociez et demandez les prix.",
        },
        {
            "title": "La maison",
            "summary": "Parlez des pièces, des objets et de la vie quotidienne à la maison.",
        },
        {
            "title": "Les animaux",
            "summary": "Identifiez les animaux, leurs sons et leur habitat.",
        },
        {
            "title": "Les émotions",
            "summary": "Exprimez ce que vous ressentez : joie, tristesse, colère, surprise.",
        },
        {
            "title": "La santé",
            "summary": "Demandez de l'aide, expliquez vos symptômes et prenez soin de vous.",
        },
        {
            "title": "Les vêtements",
            "summary": "Nommez les vêtements, les couleurs et décrivez ce que vous portez.",
        },
        {
            "title": "Les transports",
            "summary": "Parlez des moyens de transport et achetez des billets.",
        },
        {
            "title": "Au restaurant",
            "summary": "Commandez un repas, demandez l'addition et exprimez vos préférences.",
        },
        {
            "title": "La météo",
            "summary": "Parlez du temps, des saisons et de vos activités météorologiques.",
        },
        {
            "title": "Les loisirs",
            "summary": "Discutez de vos passe-temps, sports et activités culturelles.",
        },
        {
            "title": "Voyage et culture",
            "summary": "Apprenez des phrases utiles pour voyager et découvrir la culture locale.",
        },
        {
            "title": "Les traditions",
            "summary": "Découvrez les coutumes, les fêtes et les expressions traditionnelles.",
        },
    ]

    def _lesson_content(language, lesson_number, theme):
        return (
            f"Leçon {lesson_number} - {theme['title']}\n"
            f"{theme['summary']}\n"
            f"Cette leçon présente des mots et expressions essentiels pour {language}. "
            "Pratiquez des phrases courantes, enrichissez votre vocabulaire et améliorez votre aisance."
        )

    added = 0
    for language_row in db.query(Language).all():
        existing_numbers = {
            lesson.lesson_number
            for lesson in db.query(Lesson).filter(Lesson.language_code == language_row.code).all()
        }
        language_label = language_row.name_fr or language_row.name or language_row.code
        for lesson_number in range(1, min_lessons + 1):
            if lesson_number in existing_numbers:
                continue
            theme = lesson_themes[(lesson_number - 1) % len(lesson_themes)]
            title = f"Leçon {lesson_number} - {theme['title']}"
            content = _lesson_content(language_label, lesson_number, theme)
            difficulty = (
                "beginner"
                if lesson_number <= 5
                else "intermediate"
                if lesson_number <= 15
                else "advanced"
            )
            db.add(Lesson(
                title=title,
                language_code=language_row.code,
                lesson_number=lesson_number,
                difficulty=difficulty,
                content=content,
                published=True,
            ))
            themed_vocab = _build_theme_vocab(theme['title'], difficulty)
            for idx, (word, translation, example) in enumerate(themed_vocab[:3], start=1):
                db.add(VocabularyItem(
                    language_code=language_row.code,
                    lesson_number=lesson_number,
                    word=word,
                    translation_fr=translation,
                    phonetic=None,
                    example_target=example,
                    example_fr=translation,
                    difficulty=difficulty,
                ))
            added += 1
        language_row.total_lessons = max(language_row.total_lessons or 0, min_lessons)
    if added > 0:
        db.commit()


def _seed_default_languages():
    db = SessionLocal()
    try:
        existing_languages = {lang.code: lang for lang in db.query(Language).all()}
        if not existing_languages:
            default_languages = [
            {"code": "pular", "name": "Pular", "name_fr": "Pular (Fouta Djallon)", "region": "Guinée", "family": "Atlantique", "status": "active", "color": "#D4622A", "flag_emoji": "🇬🇳", "total_lessons": 20, "description": "Langue peule de Guinée"},
            {"code": "soussou", "name": "Soussou", "name_fr": "Soussou", "region": "Guinée", "family": "Atlantique", "status": "active", "color": "#E8A838", "flag_emoji": "🇬🇳", "total_lessons": 20, "description": "Langue côtière de Guinée"},
            {"code": "malinke", "name": "Malinké", "name_fr": "Malinké", "region": "Guinée", "family": "Mandé", "status": "active", "color": "#2E7D32", "flag_emoji": "🇬🇳", "total_lessons": 20, "description": "Langue mandingue de Guinée"},
            {"code": "fulfulde", "name": "Fulfulde", "name_fr": "Fulfulde", "region": "Burkina Faso", "family": "Atlantique", "status": "active", "color": "#C62828", "flag_emoji": "🇧🇫", "total_lessons": 1, "description": "Langue peule du Burkina"},
            {"code": "guerze", "name": "Guerzé (Kpelé)", "name_fr": "Guerzé", "region": "Guinée Forestière", "family": "Kru", "status": "active", "color": "#5C3D91", "flag_emoji": "🇬🇳", "total_lessons": 20, "description": "Langue de la Guinée forestière"},
            {"code": "dioula", "name": "Dioula", "name_fr": "Dioula", "region": "Burkina Faso / Côte d'Ivoire", "family": "Mandé", "status": "active", "color": "#00695C", "flag_emoji": "🇧🇫", "total_lessons": 1, "description": "Langue commerciale d'Afrique de l'Ouest"},
            {"code": "lingala", "name": "Lingala", "name_fr": "Lingala", "region": "Congo / RDC", "family": "Bantoue", "status": "active", "color": "#B71C1C", "flag_emoji": "🇨🇩", "total_lessons": 5, "description": "Langue nationale du Congo"},
            {"code": "swahili", "name": "Swahili", "name_fr": "Swahili", "region": "Afrique de l'Est", "family": "Bantoue", "status": "active", "color": "#004D40", "flag_emoji": "🌍", "total_lessons": 1, "description": "Langue africaine la plus parlée"},
            {"code": "bissa", "name": "Bissa", "name_fr": "Bissa", "region": "Burkina Faso", "family": "Gur", "status": "active", "color": "#558B2F", "flag_emoji": "🇧🇫", "total_lessons": 1, "description": "Langue du Burkina Faso"},
            {"code": "kissi", "name": "Kissi", "name_fr": "Kissi", "region": "Guinée Forestière", "family": "Atlantique", "status": "active", "color": "#AD1457", "flag_emoji": "🇬🇳", "total_lessons": 1, "description": "Langue de Guinée forestière"},
            {"code": "kono", "name": "Kono", "name_fr": "Kono", "region": "Guinée", "family": "Mandé", "status": "active", "color": "#6D4C41", "flag_emoji": "🇬🇳", "total_lessons": 1, "description": "Langue guinéenne"},
            {"code": "toma", "name": "Toma", "name_fr": "Toma", "region": "Guinée Forestière", "family": "Mandé", "status": "active", "color": "#1565C0", "flag_emoji": "🇬🇳", "total_lessons": 1, "description": "Langue forestière guinéenne"},
            {"code": "moore", "name": "Mooré", "name_fr": "Mooré", "region": "Burkina Faso", "family": "Gur", "status": "active", "color": "#EF6C00", "flag_emoji": "🇧🇫", "total_lessons": 1, "description": "Langue du Burkina Faso"},
            {"code": "wolof", "name": "Wolof", "name_fr": "Wolof", "region": "Sénégal", "family": "Atlantique", "status": "active", "color": "#1B5E20", "flag_emoji": "🇸🇳", "total_lessons": 1, "description": "Langue nationale du Sénégal"},
            {"code": "yoruba", "name": "Yoruba", "name_fr": "Yoruba", "region": "Nigeria", "family": "Niger-Congo", "status": "active", "color": "#4A148C", "flag_emoji": "🇳🇬", "total_lessons": 1, "description": "Langue du sud-ouest nigérian"},
            {"code": "igbo", "name": "Igbo", "name_fr": "Igbo", "region": "Nigeria", "family": "Niger-Congo", "status": "active", "color": "#01579B", "flag_emoji": "🇳🇬", "total_lessons": 1, "description": "Langue du sud-est nigérian"},
            {"code": "nouchi", "name": "Nouchi", "name_fr": "Nouchi", "region": "Côte d'Ivoire", "family": "Argot franco-africain", "status": "active", "color": "#F57F17", "flag_emoji": "🇨🇮", "total_lessons": 5, "description": "Argot ivoirien"},
            {"code": "anglais", "name": "English", "name_fr": "Anglais", "region": "Monde", "family": "Germanique", "status": "active", "color": "#880E4F", "flag_emoji": "🇬🇧", "total_lessons": 20, "description": "Langue germanique internationale"},
            {"code": "francais", "name": "Français", "name_fr": "Français", "region": "Monde", "family": "Roman", "status": "active", "color": "#1565C0", "flag_emoji": "🇫🇷", "total_lessons": 20, "description": "Langue romane internationale"},
            {"code": "espagnol", "name": "Español", "name_fr": "Espagnol", "region": "Monde", "family": "Roman", "status": "active", "color": "#E65100", "flag_emoji": "🇪🇸", "total_lessons": 20, "description": "Langue romane internationale"},
            {"code": "allemand", "name": "Deutsch", "name_fr": "Allemand", "region": "Europe", "family": "Germanique", "status": "active", "color": "#212121", "flag_emoji": "🇩🇪", "total_lessons": 20, "description": "Langue germanique"},
            {"code": "italien", "name": "Italiano", "name_fr": "Italien", "region": "Europe", "family": "Roman", "status": "active", "color": "#2E7D32", "flag_emoji": "🇮🇹", "total_lessons": 20, "description": "Langue romane"},
            {"code": "portugais", "name": "Português", "name_fr": "Portugais", "region": "Monde", "family": "Roman", "status": "active", "color": "#1B5E20", "flag_emoji": "🇵🇹", "total_lessons": 20, "description": "Langue romane internationale"},
            {"code": "russe", "name": "Русский", "name_fr": "Russe", "region": "Monde", "family": "Slave", "status": "active", "color": "#B71C1C", "flag_emoji": "🇷🇺", "total_lessons": 20, "description": "Langue slave internationale"},
            {"code": "arabe", "name": "العربية", "name_fr": "Arabe", "region": "Monde arabe", "family": "Sémitique", "status": "active", "color": "#1A237E", "flag_emoji": "🇸🇦", "total_lessons": 20, "description": "Langue sémitique internationale"},
            {"code": "hindi", "name": "हिन्दी", "name_fr": "Hindi", "region": "Inde", "family": "Indo-aryen", "status": "active", "color": "#FF6F00", "flag_emoji": "🇮🇳", "total_lessons": 1, "description": "Langue officielle de l'Inde"},
            {"code": "chinois", "name": "中文", "name_fr": "Chinois (Mandarin)", "region": "Chine", "family": "Sino-tibétain", "status": "active", "color": "#C62828", "flag_emoji": "🇨🇳", "total_lessons": 20, "description": "Langue la plus parlée au monde"},
            {"code": "japonais", "name": "日本語", "name_fr": "Japonais", "region": "Japon", "family": "Japono-ryukyu", "status": "active", "color": "#AD1457", "flag_emoji": "🇯🇵", "total_lessons": 20, "description": "Langue du Japon"},
        ]
            for payload in default_languages:
                db.add(Language(**payload))
            db.commit()
            existing_languages = {lang.code: lang for lang in db.query(Language).all()}

        lesson_seed = [
            {"title": "Saluer", "language_code": "francais", "lesson_number": 1, "difficulty": "beginner", "content": "Commencez par saluer en français.", "published": True},
            {"title": "Se présenter", "language_code": "francais", "lesson_number": 2, "difficulty": "beginner", "content": "Apprenez à vous présenter.", "published": True},
            {"title": "Commander à manger", "language_code": "francais", "lesson_number": 3, "difficulty": "beginner", "content": "Apprenez à commander au restaurant avec des phrases simples.", "published": True},
            {"title": "Les bases", "language_code": "anglais", "lesson_number": 1, "difficulty": "beginner", "content": "Start with everyday English words.", "published": True},
            {"title": "Se présenter", "language_code": "bissa", "lesson_number": 1, "difficulty": "beginner", "content": "Apprenez les premiers mots du bissa.", "published": True},
        ]
        for payload in lesson_seed:
            existing = db.query(Lesson).filter(Lesson.language_code == payload["language_code"], Lesson.lesson_number == payload["lesson_number"]).first()
            if existing is None:
                db.add(Lesson(**payload))
        db.commit()

        vocabulary_seed = [
            {"language_code": "francais", "lesson_number": 1, "word": "bonjour", "translation_fr": "bonjour", "phonetic": "bɔ̃.ʒuʁ", "example_target": "Bonjour !", "example_fr": "Bonjour !", "difficulty": "beginner"},
            {"language_code": "francais", "lesson_number": 1, "word": "merci", "translation_fr": "merci", "phonetic": "mɛʁ.si", "example_target": "Merci beaucoup", "example_fr": "Merci beaucoup", "difficulty": "beginner"},
            {"language_code": "francais", "lesson_number": 2, "word": "je", "translation_fr": "je", "phonetic": "ʒə", "example_target": "Je m'appelle Mali", "example_fr": "Je m'appelle Mali", "difficulty": "beginner"},
            {"language_code": "francais", "lesson_number": 2, "word": "m'appelle", "translation_fr": "m'appelle", "phonetic": "ma.pɛl", "example_target": "Je m'appelle Awa", "example_fr": "Je m'appelle Awa", "difficulty": "beginner"},
            {"language_code": "francais", "lesson_number": 3, "word": "croissant", "translation_fr": "croissant", "phonetic": "kʁwa.sɑ̃", "example_target": "Je voudrais un croissant.", "example_fr": "Je voudrais un croissant.", "difficulty": "beginner"},
            {"language_code": "francais", "lesson_number": 3, "word": "café", "translation_fr": "coffee", "phonetic": "ka.fe", "example_target": "Je voudrais un café.", "example_fr": "Je voudrais un café.", "difficulty": "beginner"},
            {"language_code": "francais", "lesson_number": 3, "word": "s'il vous plaît", "translation_fr": "please", "phonetic": "sil vu plɛ", "example_target": "Un jus d'orange, s'il vous plaît.", "example_fr": "Un jus d'orange, s'il vous plaît.", "difficulty": "beginner"},
            {"language_code": "francais", "lesson_number": 3, "word": "l'addition", "translation_fr": "the bill", "phonetic": "la.di.sjɔ̃", "example_target": "L'addition, s'il vous plaît.", "example_fr": "L'addition, s'il vous plaît.", "difficulty": "beginner"},
            {"language_code": "anglais", "lesson_number": 1, "word": "hello", "translation_fr": "bonjour", "phonetic": "həˈloʊ", "example_target": "Hello there", "example_fr": "Bonjour à tous", "difficulty": "beginner"},
            {"language_code": "anglais", "lesson_number": 1, "word": "thank you", "translation_fr": "merci", "phonetic": "θæŋk ju", "example_target": "Thank you very much", "example_fr": "Merci beaucoup", "difficulty": "beginner"},
            {"language_code": "bissa", "lesson_number": 1, "word": "sanu", "translation_fr": "salut", "phonetic": "sa.nu", "example_target": "Sanu yé", "example_fr": "Salut à toi", "difficulty": "beginner"},
            {"language_code": "bissa", "lesson_number": 1, "word": "mbo", "translation_fr": "viens", "phonetic": "mbo", "example_target": "Mbo wa", "example_fr": "Viens ici", "difficulty": "beginner"},
        ]
        for payload in vocabulary_seed:
            existing = db.query(VocabularyItem).filter(
                VocabularyItem.language_code == payload["language_code"],
                VocabularyItem.lesson_number == payload["lesson_number"],
                VocabularyItem.word == payload["word"],
            ).first()
            if existing is None:
                db.add(VocabularyItem(**payload))
        db.commit()

        _seed_dictionary_content(db)
        _seed_missing_lessons(db, min_lessons=20)
    finally:
        db.close()


_seed_default_languages()

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Authorization",
        "Content-Language",
        "Content-Type",
        "Origin",
        "X-CSRF-Token",
        "X-Requested-With",
        "X-HTTP-Method-Override",
        "bypass-tunnel-reminder",
    ],
    expose_headers=["Content-Type"],
    max_age=600,
)


@app.middleware("http")
async def csrf_protect(request, call_next):
    # Only requests authenticated via the httpOnly cookie are exposed to
    # CSRF (a malicious site can make the browser send that cookie
    # automatically). Bearer-token requests (the Expo mobile app) require an
    # explicit Authorization header an attacker's page cannot set, so they
    # are not vulnerable and are exempt. See security.set_auth_cookies for
    # why the cookie has to be SameSite=None in the first place.
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        cookie_token = request.cookies.get(security.ACCESS_TOKEN_COOKIE_NAME)
        header_auth = request.headers.get("authorization")
        # Certain auth-related endpoints (login/register) should be
        # allowed without CSRF even when an access cookie exists because they
        # are used to establish or refresh authentication rather than perform
        # actions in the context of an existing session.
        exempt_paths = {
            "/api/auth/login",
            "/api/auth/login/form",
            "/api/auth/register",
            "/api/auth/register/form",
            "/api/auth/supabase",
            "/api/auth/supabase/form",
        }
        if cookie_token and not header_auth and request.url.path not in exempt_paths:
            csrf_cookie = request.cookies.get(security.CSRF_COOKIE_NAME)
            csrf_header = request.headers.get(security.CSRF_HEADER_NAME)
            csrf_form = None
            
            # For form submissions, also check for CSRF token in the request body
            content_type = request.headers.get("content-type", "")
            if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
                try:
                    # Read the body for form-based CSRF token
                    body = await request.body()
                    if body:
                        from urllib.parse import parse_qs
                        parsed = parse_qs(body.decode())
                        csrf_form = parsed.get("_csrf_token", [None])[0]
                except Exception:
                    pass
            
            # Validate CSRF token from header or form
            csrf_provided = csrf_header or csrf_form
            if not csrf_cookie or not csrf_provided or not secrets.compare_digest(csrf_cookie, csrf_provided):
                return JSONResponse(status_code=403, content={"detail": "CSRF token missing or invalid"})
    return await call_next(request)


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=(), payment=()"
    response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
    response.headers["X-Download-Options"] = "noopen"
    response.headers["X-DNS-Prefetch-Control"] = "off"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "img-src 'self' data: https:; "
        "style-src 'self' 'unsafe-inline'; "
        "script-src 'self' https://www.google.com https://www.gstatic.com; "
        "frame-ancestors 'none'; "
        "base-uri 'self'"
    )
    return response

app.include_router(health, prefix="/api")
app.include_router(auth, prefix="/api/auth")
app.include_router(lessons, prefix="/api/lessons")
app.include_router(progress, prefix="/api/progress")
app.include_router(audio, prefix="/api/audio")
app.include_router(ai, prefix="/api/ai")
app.include_router(leaderboard, prefix="/api/leaderboard")
app.include_router(languages, prefix="/api/languages")
app.include_router(vocabulary, prefix="/api/vocabulary")
app.include_router(contributions, prefix="/api/contributions")
app.include_router(users, prefix="/api/users")

# Admin endpoint to trigger dictionary seeding on demand
@app.post("/api/admin/seed-dictionaries")
def admin_seed_dictionaries(_admin=Depends(require_admin)):
    db = SessionLocal()
    try:
        _seed_dictionary_content(db)
        return {"status": "ok", "message": "Seeding triggered"}
    finally:
        db.close()


@app.get("/", tags=["root"])
def root():
    return {"message": "M'baara API is running", "health": "/api/health"}

# Serve static files (audio outputs, etc.)
ROOT_DIR = Path(__file__).resolve().parents[2]
STATIC_DIR = Path(os.environ.get("MBAARA_STATIC_DIR", "/tmp/mbaara/static"))
if os.access(ROOT_DIR, os.W_OK):
    STATIC_DIR = ROOT_DIR / "backend" / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
