# Backend Setup (FastAPI + PostgreSQL)

## Prérequis
- Python 3.10+
- Docker et Docker Compose (fortement recommandé)
- ffmpeg installé pour audio local

## Installation

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## Configuration

1. Copier `.env.example` en `.env` :

```powershell
copy .env.example .env
```

2. Si vous utilisez Docker, démarrez PostgreSQL :

```powershell
docker compose up -d
```

3. Vérifiez la variable `DATABASE_URL` dans `.env`.

## Lancer l'API

```powershell
uvicorn backend.app.main:app --reload
```

## Notes audio

- `faster-whisper` gère la transcription locale.
- `gTTS` génère un MP3 serveur si installé.
- `expo-speech` est utilisé côté mobile pour TTS local.
- Les enregistrements contributeur et l’export dataset utilisent PyAV en l’absence de `ffprobe`/`ffmpeg`; la sortie est normalisée en WAV mono 22.05 kHz.

## Contributions vocales

Configurez `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_CONTRIBUTIONS_BUCKET=voice-contributions` et `VOICE_DATASET_SPEAKER_SALT` dans l’environnement backend uniquement. Dans Supabase Storage, créez le bucket `voice-contributions` en privé. Ne placez jamais la clé service-role dans une variable `VITE_*` ou dans le frontend.

Le backend crée les tables additives de consentement, prompts, adaptateurs de langue et enregistrements au démarrage. Dans l’écran Administration existant, un admin configure d’abord le code ISO 639-3 vérifié et l’identifiant de modèle TTS de chaque langue, puis ajoute les phrases et ne les publie qu’après vérification native. Aucun code n’est déduit du nom de modèle. L’upload associe un consentement `voice-consent-v1`, vérifie le média avec ffprobe et stocke l’objet sous une clé privée. Les écoutes utilisent des URLs signées temporaires.

Les exports admin filtrent sur l’approbation humaine, le prompt natif approuvé, le consentement actif et sa finalité (`internal_tts` ou `public_dataset`). L’export public porte la licence CC BY 4.0. Le ZIP contient les WAV normalisés, un manifeste JSONL, un CSV et les statistiques; le training Coqui/MMS doit être déclenché séparément.

## Commande de test

```powershell
curl http://127.0.0.1:8000/api/health
```
