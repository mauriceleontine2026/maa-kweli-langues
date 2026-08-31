# 🎤 Coqui TTS Server pour M'baara

Serveur de synthèse vocale avec support **Meta MMS** et **XTTS-v2** pour 130+ langues, particulièrement optimisé pour les langues guinéennes.

## 📋 Langues supportées

### Guinéennes (MMS via Coqui) 🇬🇳
- **Soussou** (sus)
- **Malinké** (mnk)
- **Bambara** (bam)
- **Kissi** (kss)
- **Kuranko** (kek)
- **Yalunka** (yal)
- **Kono** (kno)
- **Mano** (mev)
- **Toma** (tom)
- **Mossi/Moore** (mos)

### Internationales (XTTS multilingual)
- Français, Anglais, Espagnol, Allemand, Italien, Portugais, Arabe
- Et 120+ autres langues

---

## 🚀 Déploiement

### Option 1: Render.com (⭐ Recommandé)

1. **Créer un compte** sur [render.com](https://render.com)
2. **Fork ce repo** ou connecter votre GitHub
3. **Créer un Web Service**:
   - Repository: `maa-kweli-langues`
   - Branch: `main`
   - Build Command: `pip install -r coqui-tts/requirements.txt`
   - Start Command: `cd coqui-tts && python tts_server.py`
4. **Choisir l'instance**:
   - **Starter** ($7/mois): OK pour dev, lent pour prod
   - **Premium** ($20/mois): ⭐ Recommandé (CPU plus rapide)
   - **GPU** ($19+/mois): Pour haute performance
5. **Ajouter variables d'env**:
   ```
   TTS_MODEL=tts_models/multilingual/multi-dataset/xtts_v2
   USE_CUDA=false
   PORT=5000
   ```
6. **Deploy** et attendre ~5-10 min

**URL finale**: `https://mbaara-tts-XXXX.onrender.com` (adapter le nom)

### Option 2: Docker Local

```bash
cd coqui-tts
docker build -t mbaara-tts .
docker run -p 5000:5000 -e TTS_MODEL="tts_models/multilingual/multi-dataset/xtts_v2" mbaara-tts
```

Accès: `http://localhost:5000`

### Option 3: Fly.io

```bash
cd coqui-tts
flyctl launch
flyctl deploy
```

---

## 🔗 Connexion au Backend M'baara

Une fois déployé, mettre à jour `.env.example` ou Vercel env vars:

```bash
COQUI_TTS_URL=https://mbaara-tts-XXXX.onrender.com
```

Le backend utilisera automatiquement Coqui pour les langues **experimental** (sus, mnk, bam, etc.).

---

## 📡 API Endpoints

### POST `/tts` (binary WAV)
Retourne directement le WAV audio.

```bash
curl -X POST http://localhost:5000/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Bonjour",
    "language": "fra",
    "speaker_idx": "random"
  }' \
  -o output.wav
```

### POST `/tts-json` (data URL)
Retourne audio en base64.

```bash
curl -X POST http://localhost:5000/tts-json \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Salam alaikum",
    "language": "sus",
    "speaker_idx": "random"
  }' | jq '.audio_url'
```

### GET `/health`
Vérifier l'état.

```bash
curl http://localhost:5000/health
```

Réponse:
```json
{
  "status": "ok",
  "model": "tts_models/multilingual/multi-dataset/xtts_v2",
  "device": "cpu"
}
```

---

## ⚙️ Configuration

| Variable | Défaut | Description |
|----------|--------|-------------|
| `PORT` | `5000` | Port du serveur |
| `TTS_MODEL` | `tts_models/multilingual/multi-dataset/xtts_v2` | Modèle TTS (voir [liste](https://github.com/coqui-ai/TTS/blob/main/TTS/server/server.md)) |
| `USE_CUDA` | `false` | Utiliser GPU (nécessite CUDA) |
| `HOST` | `0.0.0.0` | Adresse d'écoute |

---

## 📊 Performance

| Métrique | Valeur |
|----------|--------|
| Temps init | ~30-60s (first load) |
| Temps synth (10 mots) | ~2-5s (CPU), ~0.5-1s (GPU) |
| Latency réseau | ~100-500ms (Render ↔ Backend) |
| Memory | ~2-4 GB |

💡 **Conseil**: Mettre en cache les résultats côté backend (Redis) pour éviter les appels répétés.

---

## 🐛 Debugging

### Le serveur ne répond pas

```bash
# Vérifier health
curl http://localhost:5000/health

# Voir les logs
# Sur Render: Console → Logs
# En local: docker logs <container_id>
```

### Erreur "Model not found"

```bash
# Vérifier que TTS_MODEL est correct
# Valeurs acceptées:
# - tts_models/multilingual/multi-dataset/xtts_v2 (recommandé)
# - tts_models/multilingual/meta_learning/multilingual_glow_tts
# - tts_models/en/ljspeech/glow-tts
```

### Démarrage lent

- Premier appel charge le modèle (~60s): normal
- Utiliser `USE_CUDA=true` sur GPU pour vitesse
- Utiliser instance Premium sur Render

---

## 🔐 Sécurité

⚠️ **À faire**:
- [ ] Ajouter rate limiting (ex: 100 req/min par IP)
- [ ] Ajouter authentification (API key)
- [ ] Chiffrer les communications (HTTPS obligatoire)
- [ ] Mettre à jour TTS régulièrement (`pip install --upgrade TTS`)

---

## 📚 Ressources

- [Coqui TTS Docs](https://github.com/coqui-ai/TTS)
- [Render.com Docs](https://render.com/docs)
- [XTTS v2 Paper](https://arxiv.org/abs/2406.04631)
- [Meta MMS Paper](https://research.facebook.com/publications/multilingual-massive-multitask-language-models-mms/)

---

## 📞 Support

Questions ou problèmes?
1. Vérifier `/health` endpoint
2. Consulter les logs Render
3. Ouvrir une issue sur GitHub

Bon déploiement! 🚀
