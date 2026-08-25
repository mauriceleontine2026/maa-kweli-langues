import json
import re

from openai import AsyncOpenAI, OpenAI

from ..config import get_perplexity_api_key

PERPLEXITY_BASE_URL = "https://api.perplexity.ai"
PERPLEXITY_MODEL = "sonar"

SYSTEM_PROMPT = """Tu es un chercheur linguistique et culturel spécialisé dans les langues du monde,
notamment les langues ouest-africaines. Effectue des recherches authentiques et actuelles.
Donne des expressions réellement attestées, leur traduction française et leur contexte d'usage local.
Ne fabrique jamais une expression : indique l'incertitude dans la note culturelle si les sources divergent.
Réponds uniquement avec un objet JSON valide, sans Markdown ni texte avant ou après, suivant exactement ce schéma :
{
  "target_language": "string",
  "topic": "string",
  "cultural_note": "string",
  "authentic_expressions": [
    {"expression": "string", "translation": "string", "usage_context": "string"}
  ]
}"""

ENRICHMENT_SYSTEM_PROMPT = """Tu es un chercheur linguistique spécialisé dans la vérification de données.
Utilise des sources actuelles et fiables. Ne fabrique jamais une forme linguistique.
Réponds uniquement avec un objet JSON valide, sans Markdown ni texte avant ou après, contenant exactement:
{"translation_fr":"string","phonetic":"string","example_target":"string","example_fr":"string","usage_context":"string"}"""

AUDIT_SYSTEM_PROMPT = """Tu es un chercheur linguistique et pédagogique spécialisé dans les langues africaines.
Vérifie avec des sources fiables, signale les incertitudes et ne fabrique jamais de contenu linguistique.
Réponds uniquement avec l'objet JSON demandé par l'utilisateur, sans Markdown ni texte supplémentaire."""


class PerplexityServiceError(Exception):
    """Raised when Perplexity cannot provide a valid research response."""


class PerplexityConfigurationError(PerplexityServiceError):
    """Raised when the Perplexity client is not configured."""


def _extract_json(content: str) -> dict:
    cleaned = content.strip()
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned, flags=re.IGNORECASE)
    try:
        value = json.loads(cleaned)
    except json.JSONDecodeError:
        decoder = json.JSONDecoder()
        try:
            value, _ = decoder.raw_decode(cleaned)
        except json.JSONDecodeError as exc:
            raise PerplexityServiceError("Perplexity returned invalid JSON") from exc
    if not isinstance(value, dict):
        raise PerplexityServiceError("Perplexity returned a JSON value instead of an object")
    return value


def _build_user_prompt(target_language: str, topic: str) -> str:
    return (
        f"Recherche culturelle et linguistique en temps réel. Langue cible : {target_language}. "
        f"Sujet : {topic}. Fournis des sources fiables via tes citations intégrées, "
        "mais place toutes les données demandées dans l'objet JSON uniquement."
    )


async def fetch_cultural_context(target_language: str, topic: str) -> dict:
    api_key = get_perplexity_api_key()
    if not api_key:
        raise PerplexityConfigurationError("PERPLEXITY_API_KEY is not configured")

    client = AsyncOpenAI(api_key=api_key, base_url=PERPLEXITY_BASE_URL)
    try:
        response = await client.chat.completions.create(
            model=PERPLEXITY_MODEL,
            temperature=0.2,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": _build_user_prompt(target_language, topic)},
            ],
        )
        content = response.choices[0].message.content if response.choices else None
        if not content:
            raise PerplexityServiceError("Perplexity returned an empty response")
        return _extract_json(content)
    except PerplexityServiceError:
        raise
    except Exception as exc:
        raise PerplexityServiceError("Perplexity request failed") from exc
    finally:
        await client.close()


async def enrich_vocabulary_item(item: dict) -> dict:
    api_key = get_perplexity_api_key()
    if not api_key:
        raise PerplexityConfigurationError("PERPLEXITY_API_KEY is not configured")

    prompt = f"""Analyse et enrichis cette entrée de dictionnaire pour la langue {item['language_code']}.
Corrige uniquement ce qui est nécessaire et ne fabrique aucune donnée. Vérifie l'usage local,
la traduction française, la phonétique IPA, un exemple authentique et sa traduction.
Réponds uniquement avec un objet JSON valide suivant ce schéma:
{{"translation_fr":"string","phonetic":"string","example_target":"string","example_fr":"string","usage_context":"string"}}

Entrée actuelle:
{json.dumps(item, ensure_ascii=False)}"""

    client = AsyncOpenAI(api_key=api_key, base_url=PERPLEXITY_BASE_URL)
    try:
        response = await client.chat.completions.create(
            model=PERPLEXITY_MODEL,
            temperature=0.1,
            messages=[
                {"role": "system", "content": ENRICHMENT_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        )
        content = response.choices[0].message.content if response.choices else None
        if not content:
            raise PerplexityServiceError("Perplexity returned an empty response")
        return _extract_json(content)
    except PerplexityServiceError:
        raise
    except Exception as exc:
        raise PerplexityServiceError("Perplexity enrichment request failed") from exc
    finally:
        await client.close()


async def audit_language_lessons(language_code: str, language_name: str, lessons: list[dict]) -> dict:
    api_key = get_perplexity_api_key()
    if not api_key:
        raise PerplexityConfigurationError("PERPLEXITY_API_KEY is not configured")

    prompt = f"""Audite le contenu pédagogique de la langue {language_name} ({language_code}).
Analyse les leçons existantes ci-dessous avec des sources linguistiques et culturelles fiables.
Corrige les titres ou descriptions inexactes, sans inventer de formes linguistiques.
Repère les thèmes essentiels absents et propose au maximum 5 leçons manquantes.
Réponds uniquement avec un objet JSON valide suivant exactement ce schéma:
{{"lesson_corrections":[{{"lesson_id":0,"title":"string","title_fr":"string","description":"string","level":"Débutant|Intermédiaire|Avancé","type":"vocabulary|phrases|letters|sounds","reason":"string"}}],"missing_lessons":[{{"title":"string","title_fr":"string","description":"string","level":"Débutant|Intermédiaire|Avancé","type":"vocabulary|phrases|letters|sounds","reason":"string"}}],"research_note":"string"}}

Leçons existantes:
{json.dumps(lessons, ensure_ascii=False)}"""

    client = AsyncOpenAI(api_key=api_key, base_url=PERPLEXITY_BASE_URL)
    try:
        response = await client.chat.completions.create(
            model=PERPLEXITY_MODEL,
            temperature=0.1,
            messages=[
                {"role": "system", "content": AUDIT_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        )
        content = response.choices[0].message.content if response.choices else None
        if not content:
            raise PerplexityServiceError("Perplexity returned an empty response")
        return _extract_json(content)
    except PerplexityServiceError:
        raise
    except Exception as exc:
        raise PerplexityServiceError("Perplexity lesson audit request failed") from exc
    finally:
        await client.close()


def fetch_cultural_context_sync(target_language: str, topic: str) -> dict:
    api_key = get_perplexity_api_key()
    if not api_key:
        raise PerplexityConfigurationError("PERPLEXITY_API_KEY is not configured")

    client = OpenAI(api_key=api_key, base_url=PERPLEXITY_BASE_URL)
    try:
        response = client.chat.completions.create(
            model=PERPLEXITY_MODEL,
            temperature=0.2,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": _build_user_prompt(target_language, topic)},
            ],
        )
        content = response.choices[0].message.content if response.choices else None
        if not content:
            raise PerplexityServiceError("Perplexity returned an empty response")
        return _extract_json(content)
    except PerplexityServiceError:
        raise
    except Exception as exc:
        raise PerplexityServiceError("Perplexity request failed") from exc
    finally:
        client.close()