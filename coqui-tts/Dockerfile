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

# Copier le serveur TTS
COPY tts_server.py .

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Port du serveur
EXPOSE 5000

# Lancer le serveur
ENV TTS_HOME=/tmp/tts_models
ENV PYTHONUNBUFFERED=1
CMD ["python", "tts_server.py"]
