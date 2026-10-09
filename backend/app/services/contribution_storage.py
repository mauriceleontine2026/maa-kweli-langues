import os
from urllib.parse import quote

import httpx


class ContributionStorageError(RuntimeError):
    pass


def _configuration() -> tuple[str, str, str]:
    base_url = (os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or "").rstrip("/")
    service_key = os.getenv("SUPABASE_SERVICE_KEY", "")
    bucket = os.getenv("SUPABASE_CONTRIBUTIONS_BUCKET", "voice-contributions").strip()
    if not base_url or not service_key or not bucket:
        raise ContributionStorageError(
            "Supabase Storage is not configured. Set SUPABASE_URL, SUPABASE_SERVICE_KEY, and SUPABASE_CONTRIBUTIONS_BUCKET."
        )
    return base_url, service_key, bucket


def _request(method: str, path: str, **kwargs):
    base_url, service_key, _ = _configuration()
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        **kwargs.pop("headers", {}),
    }
    try:
        response = httpx.request(
            method,
            f"{base_url}/storage/v1/{path.lstrip('/')}" ,
            headers=headers,
            timeout=30.0,
            **kwargs,
        )
    except httpx.HTTPError as exc:
        raise ContributionStorageError("Supabase Storage could not be reached.") from exc
    if response.is_error:
        raise ContributionStorageError(f"Supabase Storage request failed (HTTP {response.status_code}).")
    return response


def _bucket_path(bucket: str) -> str:
    return quote(bucket, safe="")


def _object_path(bucket: str, storage_key: str) -> str:
    return f"{_bucket_path(bucket)}/{quote(storage_key, safe='/')}"


def _require_private_bucket() -> tuple[str, str]:
    base_url, _, bucket = _configuration()
    response = _request("GET", f"bucket/{_bucket_path(bucket)}")
    try:
        bucket_data = response.json()
    except ValueError as exc:
        raise ContributionStorageError("Supabase Storage returned an invalid bucket response.") from exc
    if bucket_data.get("public") is not False:
        raise ContributionStorageError("The voice-contributions bucket must be private.")
    return base_url, bucket


def store_audio(storage_key: str, contents: bytes, content_type: str) -> None:
    _, bucket = _require_private_bucket()
    _request(
        "POST",
        f"object/{_object_path(bucket, storage_key)}",
        content=contents,
        headers={"Content-Type": content_type, "x-upsert": "false"},
    )


def create_audio_signed_url(storage_key: str, expires_in: int = 900) -> str:
    base_url, bucket = _require_private_bucket()
    response = _request(
        "POST",
        f"object/sign/{_object_path(bucket, storage_key)}",
        json={"expiresIn": expires_in},
    )
    try:
        signed_path = response.json().get("signedURL")
    except ValueError as exc:
        raise ContributionStorageError("Supabase Storage returned an invalid signed URL response.") from exc
    if not isinstance(signed_path, str) or not signed_path:
        raise ContributionStorageError("Supabase Storage did not return a signed URL.")
    if signed_path.startswith("http://") or signed_path.startswith("https://"):
        return signed_path
    if signed_path.startswith("/storage/v1/"):
        return f"{base_url}{signed_path}"
    return f"{base_url}/storage/v1/{signed_path.lstrip('/')}"


def download_audio(storage_key: str) -> bytes:
    _, bucket = _require_private_bucket()
    response = _request("GET", f"object/authenticated/{_object_path(bucket, storage_key)}")
    return response.content


def delete_audio(storage_key: str) -> None:
    _, bucket = _require_private_bucket()
    _request("DELETE", f"object/{_bucket_path(bucket)}", json={"prefixes": [storage_key]})