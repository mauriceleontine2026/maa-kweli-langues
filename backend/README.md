Backend (FastAPI) — instructions de développement

## Contributions vocales

Voir `README_SETUP.md` pour la configuration Supabase Storage privée, `ffprobe`/`ffmpeg`, le consentement `voice-consent-v1` et l’export dataset. Les endpoints de contribution sont ajoutés au routeur existant `/api/contributions`; aucun écran ni route de page frontend supplémentaire n’est nécessaire.

Démarrage PostgreSQL local via Docker Compose

```bash
cd backend
docker compose up -d
```

Fichier d'environnement
- Copiez `backend/.env` et modifiez la variable `DATABASE_URL` si nécessaire.
- Exemple `DATABASE_URL=postgresql+psycopg://mbaara:mbaara@127.0.0.1:5432/mbaara_dev`
- Configurez `JWT_SECRET` et `JWT_ALGORITHM` pour signer les tokens JWT. La valeur par défaut est `HS256`.
- Si vous utilisez `RS256`, `ES256`, `PS256` ou similaire, fournissez aussi `JWT_PRIVATE_KEY` et `JWT_PUBLIC_KEY` en format PEM.
- En production multi-instance, configurez `REDIS_URL` afin de partager les limiteurs de débit entre instances.

Installer et lancer l'API

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
uvicorn backend.app.main:app --reload
```

Notes:
- Si Docker n'est pas disponible, installez PostgreSQL localement et mettez à jour `DATABASE_URL`.
- Les endpoints audio sont conditionnels: `/api/audio/transcribe` nécessite `faster-whisper` et `/api/audio/synthesize` utilise `gTTS` si présent sinon renvoie un fallback pour `expo-speech`.
- Pour initialiser la base SQLite par défaut, supprimez `DATABASE_URL` pour retomber sur `sqlite:///./mbaara.db`.
