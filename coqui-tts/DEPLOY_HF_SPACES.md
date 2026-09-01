# Déployer Coqui TTS sur Hugging Face Spaces

## Étapes Rapides

### 1. Créer un Espace Hugging Face
1. Aller à https://huggingface.co/spaces
2. Cliquer "Create new Space"
3. Remplir:
   - **Space name**: `mbaara-coqui-tts` (adapter le nom)
   - **License**: Apache 2.0
   - **Space SDK**: Docker
   - **Visibility**: Public
4. Cliquer "Create Space"

### 2. Cloner et Pusher le Code
```bash
cd /tmp
git clone https://huggingface.co/spaces/<votre-username>/mbaara-coqui-tts
cd mbaara-coqui-tts

# Copier les fichiers Coqui
cp <path-to-maa-kweli>/coqui-tts/Dockerfile .
cp <path-to-maa-kweli>/coqui-tts/tts_server.py .
cp <path-to-maa-kweli>/coqui-tts/requirements.txt .

# Ajouter un README.md (requis par HF)
cat > README.md << 'EOF'
---
title: Coqui TTS Server
emoji: 🎙️
colorFrom: blue
colorTo: green
sdk: docker
pinned: false
---

# Coqui TTS Server for Mǎa-kwɛ́lî

FastAPI server pour synthèse vocale multilingue (sus, mnk, bam, kss, kek, etc.)

## API Endpoints
- `GET /health` - Server status
- `POST /tts` - Synthesize audio
EOF

# Pusher vers HF
git add .
git commit -m "Initial Coqui TTS deployment"
git push
```

### 3. Configurer dans Vercel Backend
Une fois déployé, l'URL sera: `https://<username>-mbaara-coqui-tts.hf.space`

Ajouter dans Vercel Backend environment:
```
COQUI_TTS_URL=https://<username>-mbaara-coqui-tts.hf.space
```

### 4. Tester
```bash
curl https://<username>-mbaara-coqui-tts.hf.space/health
# {"status":"ok","model":"xtts_v2","device":"cpu"}
```

---

## Avantages HF Spaces
✅ Support natif Docker  
✅ Pas d'UI complexe à naviguer  
✅ Deploy automatique via git push  
✅ Gratuit (CPU) ou $7/mo (GPU)  
✅ Logs visibles en temps réel  

## Alternatives
- **Fly.io**: `fly deploy` (nécessite compte + CLI)
- **Railway**: Drag-and-drop simple (payant après essai gratuit)
- **Localhost**: Garder localement, exposer via `ngrok` ou `cloudflare tunnel`
