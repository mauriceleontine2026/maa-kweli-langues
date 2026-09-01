# 🚀 Railway.app Deployment Guide (Quick Start)

## ⚡ Option 1: Railway CLI (Recommended - 5 min)

No browser issues, no Docker Desktop needed.

### Step 1: Install Railway CLI
```powershell
npm install -g @railway/cli
```

### Step 2: Login & Connect Repo
```powershell
railway login
# Browser opens for auth
```

### Step 3: Deploy Coqui TTS
```powershell
cd "c:\Users\mauri\Desktop\Mes Applications\Mǎa-kwɛ́lî Langues"
railway init
# Select: "Create a new project"
# Project name: "mbaara-coqui-tts" (or any name)
```

### Step 4: Deploy
```powershell
railway up
# Railway auto-detects Dockerfile at ./coqui-tts/Dockerfile
# Builds image, deploys to container
```

### Step 5: Get Public URL
```powershell
railway open
# Opens dashboard - copy public URL
# Format: https://[projectname]-[random].railway.app
```

### Step 6: Set Backend Environment
```
Vercel Dashboard → Backend Project Settings → Environment Variables
Add: COQUI_TTS_URL=https://[your-railway-url]
Redeploy backend
```

### Step 7: Test
```powershell
$body = @{text="Test"; language_code="sus"} | ConvertTo-Json
Invoke-WebRequest -Uri "https://[your-railway-url]/tts" `
  -Method POST -ContentType "application/json" -Body $body
```

---

## ⏸️ Option 2: Railway Dashboard (If CLI fails)

1. Go to https://railway.app/dashboard
2. Click "New Project" 
3. "Deploy from GitHub" 
4. Select repo: `mauriceleontine2026/maa-kweli-langues`
5. Branch: `main`
6. Root directory: `coqui-tts`
7. Click Deploy
8. Copy public URL from dashboard

---

## 🐳 Option 3: Local Docker (No Railway Account)

Requires: Docker Desktop running

```powershell
cd "c:\Users\mauri\Desktop\Mes Applications\Mǎa-kwɛ́lî Langues"
docker build -t coqui-tts ./coqui-tts
docker run -p 5000:5000 coqui-tts
# Server at http://localhost:5000
```

Then test:
```powershell
Invoke-WebRequest http://localhost:5000/health | Select-Object -ExpandProperty Content
# Expected: {"status":"ok","model":"xtts_v2","device":"cpu"}
```

---

## ✅ Success Indicators

### Health Check
```powershell
Invoke-WebRequest https://[your-url]/health -ErrorAction Continue
# Should return: {"status":"ok","model":"xtts_v2","device":"cpu"}
```

### TTS Test (Soussou)
```powershell
$body = @{
    text="Bonjour le monde"
    language="sus"
    speaker_idx="random"
} | ConvertTo-Json

$response = Invoke-WebRequest https://[your-url]/tts `
    -Method POST -ContentType "application/json" -Body $body
    
$response.StatusCode  # Should be 200
$response.Content.Length  # Should be >5000 (audio bytes)
```

### Backend Integration
```
Frontend: https://maa-kweli-langues.vercel.app
Backend: https://mbaara-backend.vercel.app
TTS: https://[your-railway-url]

All three connected = ✅ Full system working
```

---

## 🎯 Expected Timeline

- **CLI Deploy**: 5-10 minutes (build + startup)
- **Dashboard Deploy**: 10-15 minutes (UI + build + startup)
- **Docker Local**: 3-5 minutes (local build + startup)

All options result in identical functionality.

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| CLI login fails | Try browser login at https://railway.app/login |
| Dockerfile not found | Ensure you're in workspace root, not in `coqui-tts/` |
| Deploy hangs | Wait 5-10 min (model download on first startup) |
| 500 error on `/tts` | Check Railway logs: `railway logs` |
| Connection refused | Copy exact URL from Railway dashboard |

---

## 📊 What Gets Deployed

```
Repository: mauriceleontine2026/maa-kweli-langues
├── coqui-tts/
│   ├── Dockerfile          ✓ Railway uses this
│   ├── tts_server.py       ✓ FastAPI app
│   ├── requirements.txt    ✓ Dependencies
│   └── README.md          
├── docker-compose.yml
├── backend/               (Separate - deployed to Vercel)
└── src/                   (Separate - deployed to Vercel)

Railway deploys ONLY coqui-tts/ directory → port 5000
```

---

## 🔗 Useful Links

- Railway Dashboard: https://railway.app/dashboard
- CLI Docs: https://docs.railway.app/
- Docker Hub: https://hub.docker.com/r/python (base image)
- TTS Docs: https://github.com/coqui-ai/TTS

