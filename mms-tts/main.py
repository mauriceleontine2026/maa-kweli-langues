"""Point d'entrée local du serveur MMS-TTS."""

import uvicorn

from config import TTS_HOST, TTS_PORT


if __name__ == "__main__":
    uvicorn.run("tts_api:app", host=TTS_HOST, port=TTS_PORT)