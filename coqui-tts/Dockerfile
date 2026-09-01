# Dockerfile pour serveur Coqui TTS v2
# Utilisé pour MMS et synthèse vocale local
# Support: sus, mnk, bam, kss, kek, yal, kno, mev, tom, mos, + 100+ langues via gTTS
# Build cache invalidation: 2026-09-01T00:40:00Z

FROM python:3.11-slim

WORKDIR /app

# Installer ffmpeg et dépendances système
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    build-essential \
    libsndfile1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copier les requirements
COPY requirements.txt .

# Installer dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Copier le serveur TTS et scripts
COPY tts_server.py .
COPY init_model.py .

# Health check
# start-period: allow time for the first model download/load on CPU
HEALTHCHECK --interval=30s --timeout=10s --start-period=180s --retries=5 \
    CMD sh -c 'curl -fsS "http://localhost:${PORT:-5000}/health" >/dev/null || exit 1'

# Port du serveur
ENV PORT=8080
EXPOSE 8080

# Lancer le serveur
ENV TTS_HOME=/tmp/tts_models
ENV PYTHONUNBUFFERED=1
# Run model initialization but do not crash the container if it fails; the app can still lazy-load.
CMD sh -c 'python init_model.py || echo "Preload failed; continuing to app startup"; python tts_server.py'
