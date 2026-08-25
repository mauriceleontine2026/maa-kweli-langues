import os

DEFAULT_ALLOWED_ORIGINS = [
    "https://maa-kweli-langues.vercel.app",
    "https://maa-kwelilangues-l4ty03xvr-maa-kweli-langues.vercel.app",
    "https://maa-kwelilangues-8ipabazry-maa-kweli-langues.vercel.app",
    "https://maa-kwelilangues-o6nchawdz-maa-kweli-langues.vercel.app",
    "https://maa-kwelilangues-qt54s2sr4-maa-kweli-langues.vercel.app",
    "https://maa-kwelilangues-git-main-m-baara-langues.vercel.app",
    "https://mbaara-web.vercel.app",
    "https://mbaara-web-m-baara-langues.vercel.app",
    "https://m-baara-langues.web.app",
    "https://mbaara-backend.vercel.app",
    "https://mbaara-backend-m6hbjeb7i-m-baara-langues.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]


def _clean_origin(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def get_allowed_origins() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS")
    origins = []
    if raw:
        origins.extend(cleaned for cleaned in (_clean_origin(item) for item in raw.split(",")) if cleaned)

    for origin in DEFAULT_ALLOWED_ORIGINS:
        if origin not in origins:
            origins.append(origin)
    return origins


def get_backend_proxy_target() -> str:
    candidates = [
        os.getenv("BACKEND_URL"),
        os.getenv("VERCEL_BACKEND_URL"),
        os.getenv("NEXT_PUBLIC_BACKEND_URL"),
        os.getenv("VITE_API_BASE_URL"),
    ]
    for candidate in candidates:
        cleaned = _clean_origin(candidate)
        if cleaned:
            return cleaned.rstrip("/")
    return "https://mbaara-backend-m6hbjeb7i-m-baara-langues.vercel.app"


def get_perplexity_api_key() -> str | None:
    value = os.getenv("PERPLEXITY_API_KEY")
    return value.strip() if value and value.strip() else None
