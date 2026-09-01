#!/usr/bin/env python3
"""
Optional preload script. Skipped on Railway CPU-only.
Model will load on first /tts request via lazy loading if needed.
"""

import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logger.info("✅ init_model.py: Preload disabled (model will lazy-load on demand)")
logger.info("   Coqui XTTS v2 requires significant RAM. On Railway, using gTTS fallback.")

