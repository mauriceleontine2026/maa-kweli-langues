Configuration audio locale (STT/TTS)

Objectif: exécuter la reconnaissance vocale locale (faster-whisper) et la synthèse vocale hors-ligne (`gTTS` ou `expo-speech`).

Pré-requis système
- Python 3.10+ recommandé
- ffmpeg installé et présent dans le `PATH` (utilisé par faster-whisper et pydub)
- Pour Windows: installez `ffmpeg` via `winget install --id=Gyan.FFmpeg -e --source winget` ou téléchargez depuis https://www.gyan.dev/ffmpeg/builds/ et ajoutez au PATH

1) Créer un environnement Python

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
```

2) Installer dépendances Python (sans PyTorch encore)

```powershell
pip install -r requirements.txt
```

3) Installer PyTorch (CPU) – nécessaire pour `faster-whisper`

- Linux / macOS (CPU):

```bash
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

- Windows (CPU):

```powershell
pip install --index-url https://download.pytorch.org/whl/cpu torch
```

Remarque: si vous préférez Conda, créez un env conda et installez `pytorch` via conda-forge or pytorch channels.

4) Télécharger un modèle `faster-whisper`

`faster-whisper` peut charger des modèles OpenAI Whisper (ex: `small`, `medium`). Les modèles sont téléchargés automatiquement la première fois si votre machine a accès à Internet. Pour usage offline répété, téléchargez le modèle en avance et configurez le chemin via la variable d'environnement ou le code.

5) Tester la transcription locale

Démarrer l'API FastAPI (assurez-vous que l'environnement est activé):

```powershell
# depuis le dossier backend
.\.venv\Scripts\Activate.ps1
uvicorn backend.app.main:app --reload
```

Puis testez `/api/audio/transcribe` avec `curl` ou Postman en envoyant un fichier audio.

6) TTS

- `gTTS` génère des MP3 via la librairie Google TTS (gratuit), mais nécessite une connexion réseau pour la génération (contrairement à `expo-speech` qui est local sur mobile).
- Si vous voulez un moteur TTS 100% local côté serveur, vous devrez installer un moteur open-source (ex: Coqui TTS), mais il est plus lourd; `gTTS` est un bon compromis gratuit.

Dépannage
- Erreurs `ImportError` -> vérifiez installation dans le même environnement `.venv`.
- `ffmpeg` manquant -> installez et vérifiez `ffmpeg -version`.
- Performances Whisper sur CPU -> utilisez un modèle `small` ou `tiny` pour rapidité.

Notes sur la confidentialité/localité
- Tous les traitements peuvent être exécutés localement: Whisper + gTTS (gTTS requiert connexion pour synthèse vocale via Google, mais pas de clé). Pour TTS entièrement offline, installez un moteur local tiers (plus complexe).

## Priorité TTS par langue

### P0 — Modèles réels et ciblés (prise en charge directe)

| Langue | Code | Modèle / source | Statut |
|---|---|---|---|
| Soussou | sus | `facebook/mms-tts-sus` | Priorité 0 |
| Malinké / Mandinka | mnk | `facebook/mms-tts-mnk` | Priorité 0 |
| Bambara | bam | `facebook/mms-tts-bam` | Priorité 0 |
| Kissi | kss | `facebook/mms-tts-kss` | Priorité 0 |
| Kuranko | kek | `facebook/mms-tts-kek` | Priorité 0 |
| Yalunka | yal | `facebook/mms-tts-yal` | Priorité 0 |
| Kono | kno | `facebook/mms-tts-kno` | Priorité 0 |
| Mano | mev | `facebook/mms-tts-mev` | Priorité 0 |
| Toma | tom | `facebook/mms-tts-tom` | Priorité 0 |
| Mossi / Moore | mos | `facebook/mms-tts-mos` | Priorité 0 |
| Français | fra | `facebook/mms-tts-fra` | Priorité 0 |
| Anglais | eng | `facebook/mms-tts-eng` | Priorité 0 |
| Espagnol | spa | `facebook/mms-tts-spa` | Priorité 0 |
| Arabe | ara | `facebook/mms-tts-ara` | Priorité 0 |
| Portugais | por | `facebook/mms-tts-por` | Priorité 0 |

### P1 — Multilingue acceptable / fallback de bonne qualité

| Langue | Code | Source | Statut |
|---|---|---|---|
| Swahili | swa / sw | XTTS / gTTS | Acceptable |
| Hausa | hau / ha | XTTS / gTTS | Acceptable |
| Yoruba | yor / yo | XTTS / gTTS | Acceptable |
| Igbo | igb / ig | XTTS / gTTS | Acceptable |
| Allemand | deu / de | XTTS / gTTS | Acceptable |
| Italien | ita / it | XTTS / gTTS | Acceptable |
| Hindi | hin / hi | XTTS / gTTS | Acceptable |
| Japonais | jpn / ja | XTTS / gTTS | Acceptable |
| Russe | rus / ru | XTTS / gTTS | Acceptable |
| Chinois | zho / zh | XTTS / gTTS | Acceptable |

### P2 — Données à valider ou à bloquer

Ces langues ne doivent pas être synthétisées via un faux français de secours :
- lingala
- dioula
- bissa
- moore
- mossi
- soussou
- pular
- peul
- fulfulde
- malinké / mandinka
- wolof
- kissi
- guerze
- koniagui
- konyanka
- kuranko
- landuma
- lele
- mani
- nalu
- sankaran
- yalunka
- kono
- mano
- toma
- badiaranke
- baga
- bassari
- bedik

Leur comportement attendu est : blocage explicite, message “audio non disponible” ou enregistrement humain validé, sans forcer un accent français.

---

Contactez-moi si vous voulez que j'automatise l'installation (script) en fonction de votre OS (Windows).