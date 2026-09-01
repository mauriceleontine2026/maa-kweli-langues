#!/usr/bin/env python3
"""
Pre-download and initialize TTS model before starting server.
Runs during Docker container startup.
Handles long model loading gracefully.
"""

import os
import sys
import logging
import io
import builtins

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pre-accept CPML terms
os.environ['TTS_HOME'] = '/tmp/tts_models'
os.environ['PYTHONUNBUFFERED'] = '1'
os.environ['TTS_AGREE_CPML'] = '1'

# Patch input to auto-accept
def patched_input(prompt=""):
    if "y/n" in str(prompt).lower():
        logger.info("[AUTO-ACCEPT] Accepting TTS terms...")
        return "y"
    return ""

builtins.input = patched_input
sys.stdin = io.StringIO("y\n")

try:
    from TTS.api import TTS
    
    logger.info("🔄 Pre-downloading TTS model (XTTS v2)...")
    logger.info("   This may take 5-15 minutes on first run. Grab a coffee!")
    logger.info("   Model size: 1.87GB")
    
    tts = TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2", 
              gpu=False, 
              progress_bar=True, 
              in_memory=False)
    
    logger.info("✅ Model pre-loaded successfully!")
    logger.info("   Model is ready to use. Starting server...")
    
except Exception as e:
    logger.error(f"⚠️ Failed to pre-load model: {type(e).__name__}: {e}")
    logger.info("   Server will attempt lazy-loading on first request.")
    sys.exit(1)
