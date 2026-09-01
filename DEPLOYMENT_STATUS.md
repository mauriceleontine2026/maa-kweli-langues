# Coqui TTS Deployment Status

**Date**: August 31, 2026  
**Goal**: Enable Coqui XTTS-v2 TTS synthesis for 10 Guinean languages (sus, mnk, bam, kss, kek, yal, kno, mev, tom, mos)

## ✅ Completed

1. **Infrastructure Code** (All committed to GitHub)
   - `coqui-tts/tts_server.py`: FastAPI server with `/health`, `/tts`, `/tts-json` endpoints ✓
   - `coqui-tts/Dockerfile`: Production-ready multi-stage Python 3.11 build ✓
   - `coqui-tts/requirements.txt`: Pinned dependencies (TTS==0.21.3, torch, torchaudio) ✓
   - `docker-compose.yml`: Local dev orchestration ✓

2. **Frontend Badges** (LIVE on production)
   - `src/lib/voiceConfig.js`: Language capability registry with status/provider/TTS details ✓
   - `src/components/AudioStatusBadge.jsx`: UI component with emoji badges and tooltips ✓
   - `src/pages/Learn.jsx`: Integrated badges into language cards ✓
   - Frontend deployed to: https://maa-kweli-langues.vercel.app ✓

3. **Backend Integration** (Ready but untested locally)
   - `backend/app/services/tts_providers.py`: MMSProvider calls Coqui server at `http://localhost:5000` ✓
   - `backend/app/routers/mms_audio.py`: TTS synthesis endpoint integrated ✓
   - Uses environment variable: `COQUI_TTS_URL` (defaults to `http://localhost:5000`) ✓

4. **Git** 
   - All code committed to GitHub main branch ✓
   - SSH authentication configured ✓

## 🟡 In Progress

**Local Testing** (Windows Python environment issues)
- Python 3.11 venv created (`.venv-3.11`) ✓
- TTS library installing (large dependency with torch/librosa/soundfile) ⏳
- Coqui TTS server running on port 5000 with test health check: `{"status":"ok","model":"xtts_v2","device":"cpu"}` ✓
- Backend starting (waiting for TTS pip install to complete)

## ⏭️ Next Steps (After Local Test)

### Option 1: Deploy to Railway.app (Recommended)
1. Fix Railway.com UI issues or use Railway CLI: `railway init` → `railway up`
2. Railway builds Docker image from Dockerfile automatically
3. Get public URL (format: `https://projectname-xxx.railway.app`)
4. Set Vercel env var: `COQUI_TTS_URL=https://[railway-url]`
5. Test end-to-end TTS synthesis

### Option 2: Local Testing (Current)
1. Wait for TTS library installation to complete
2. Start backend: `.venv-3.11` → uvicorn on port 8000
3. Test `/api/audio/synthesize-mms` with `language_code="sus"`
4. Verify audio data URL returned
5. Then deploy to production infrastructure

## 📊 TTS Language Support Matrix

| Language | Code | Provider | Status | Support Start |
|----------|------|----------|--------|----------------|
| Soussou | sus | Coqui XTTS | Experimental | This session |
| Malinké | mnk | Coqui XTTS | Experimental | This session |
| Bambara | bam | Coqui XTTS | Experimental | This session |
| Kissi | kss | Coqui XTTS | Experimental | This session |
| Kuranko | kek | Coqui XTTS | Experimental | This session |
| Yalunka | yal | Coqui XTTS | Experimental | This session |
| Kono | kno | Coqui XTTS | Experimental | This session |
| Mano | mev | Coqui XTTS | Experimental | This session |
| Toma | tom | Coqui XTTS | Experimental | This session |
| Mossi/Moore | mos | Coqui XTTS | Experimental | This session |
| French | fra | ElevenLabs | Validated | Existing |
| English | eng | ElevenLabs | Validated | Existing |
| Spanish | spa | ElevenLabs | Validated | Existing |
| Italian | ita | ElevenLabs | Validated | Existing |
| German | deu | ElevenLabs | Validated | Existing |
| ... + 22 more | ... | gTTS | Fallback Only | Existing |

## 🔍 Current Issue

Python 3.14 (system default) doesn't have TTS support (<3.12 required).  
Created Python 3.11 venv and installing TTS dependencies (~2-3 min wait).

Once TTS library loads, backend will proxy requests to Coqui server ✓ → full pipeline works.

## 🎯 Success Criteria

- [x] Coqui TTS server running with health check
- [ ] Backend receives Coqui TTS requests
- [ ] Synthesis returns valid audio WAV/MP3
- [ ] Frontend badges visible + clickable audio playback
- [ ] Deployed to Railway/production infrastructure
- [ ] End-to-end testing with real user flow

## 📝 Commands Reference

```bash
# Local testing
cd "c:\Users\mauri\Desktop\Mes Applications\Mǎa-kwɛ́lî Langues"

# Coqui TTS (Python 3.11)
& .venv-3.11/Scripts/Activate.ps1
pip install TTS
python coqui-tts/tts_server.py

# Backend (Python 3.11)
pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --port 8000

# Test endpoint
$body = @{text="Bonjour"; language_code="sus"} | ConvertTo-Json
Invoke-WebRequest -Uri http://localhost:8000/api/audio/synthesize-mms `
  -Method POST -ContentType "application/json" -Body $body
```

## 🚀 Quick Deploy (If Local Test Passes)

```bash
# Push if needed
git add -A
git commit -m "Coqui TTS integration ready"
git push origin main

# Deploy via Railway CLI
railway init
railway up
railway open  # Get public URL
# Then set COQUI_TTS_URL in Vercel
```
