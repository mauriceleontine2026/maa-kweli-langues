import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { normalizeTtsLanguageCode, getBestVoice } from './languagePhonology';
import { resolveAudioSource, speakText, startVoiceRecognition, stopVoiceRecognition, playAudioSource } from './audioService';

describe('audioService', () => {
  beforeEach(() => {
    globalThis.window = globalThis.window || {};
    globalThis.window.speechSynthesis = {
      cancel: vi.fn(),
      speak: vi.fn(),
      getVoices: vi.fn(() => []),
    };

    globalThis.window.SpeechRecognition = function SpeechRecognitionMock() {
      this.lang = '';
      this.continuous = false;
      this.interimResults = false;
      this.onresult = null;
      this.onerror = null;
      this.onend = null;
      this.start = vi.fn();
      this.stop = vi.fn();
    };

    globalThis.SpeechSynthesisUtterance = function SpeechSynthesisUtteranceMock(text) {
      this.text = text;
      this.lang = '';
      this.rate = 1;
      this.volume = 1;
      this.voice = null;
      this.onend = null;
      this.onerror = null;
    };
  });

  afterEach(() => {
    delete globalThis.window.speechSynthesis;
    delete globalThis.window.SpeechRecognition;
    delete globalThis.SpeechSynthesisUtterance;
    stopVoiceRecognition();
  });

  it('resolves the first valid audio source from lesson data without crashing', () => {
    expect(resolveAudioSource({ audio_url: '/audio/word.mp3', url: 'https://example.com/fallback.mp3' }, 'fr')).toBe('/audio/word.mp3');
    expect(resolveAudioSource({ url: 'https://example.com/fallback.mp3' }, 'fr')).toBe('https://example.com/fallback.mp3');
    expect(resolveAudioSource({ native_audio: { url: '/native.mp3' } }, 'fr')).toBe('/native.mp3');
    expect(resolveAudioSource({ audio_url: '' }, 'fr')).toBeNull();
  });

  it('uses the language locale and speaks without the browser API failing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'not available' }),
    });

    const result = speakText('Bonjour', 'fr', { onEnd: vi.fn() });
    expect(result).toBe(true);

    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/audio/synthesize-mms',
      expect.objectContaining({ method: 'POST' })
    );
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
  });

  it('requests backend TTS before falling back to browser speech when no audio file is available', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ audio_url: '/static/audio/tts_test.mp3' }),
    });

    globalThis.Audio = class {
      constructor(url) {
        this.src = url;
        this.play = vi.fn().mockResolvedValue();
      }
    };

    const onEnd = vi.fn();
    const result = playAudioSource({}, 'fr', { fallbackText: 'Bonjour', onEnd });

    expect(result).toBe(true);
    await Promise.resolve();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/audio/synthesize-mms',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('normalizes all supported learning language names before sending them to speech synthesis', async () => {
    const expectedMap = {
      lingala: 'fr',
      swahili: 'sw',
      bissa: 'fr',
      moore: 'fr',
      dioula: 'fr',
      soussou: 'fr',
      pular: 'fr',
      malinke: 'fr',
      kissi: 'fr',
      guerze: 'fr',
      konyanka: 'fr',
      kuranko: 'fr',
      landuma: 'fr',
      lele: 'fr',
      mani: 'fr',
      nalu: 'fr',
      sankaran: 'fr',
      yalunka: 'fr',
      kono: 'fr',
      mano: 'fr',
      toma: 'fr',
      badiaranke: 'fr',
      baga: 'fr',
      bassari: 'fr',
      bedik: 'fr',
      koniagui: 'fr',
      igbo: 'ig',
      yoruba: 'yo',
      français: 'fr',
      anglais: 'en',
      arabe: 'ar',
      espagnol: 'es',
      allemand: 'de',
      italien: 'it',
      japonais: 'ja',
      portugais: 'pt',
      russe: 'ru',
      hindi: 'hi',
      'chinois-mandarin': 'zh',
      'fr-FR': 'fr',
    };

    Object.entries(expectedMap).forEach(([language, expected]) => {
      expect(normalizeTtsLanguageCode(language)).toBe(expected);
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'not available' }),
    });

    const onError = vi.fn();
    const onEnd = vi.fn();
    const result = speakText('Mbote', 'lingala', { onError, onEnd });

    expect(result).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('prefers a higher-quality language-matched voice over the first generic browser voice', () => {
    const genericFrVoice = { lang: 'fr-FR', name: 'Microsoft Hortense - Français' };
    const betterFrVoice = { lang: 'fr-FR', name: 'Google Français' };

    globalThis.window.speechSynthesis.getVoices = vi.fn(() => [genericFrVoice, betterFrVoice]);

    expect(getBestVoice('fr')).toBe(betterFrVoice);
  });

  it('does not force a French fallback voice for unsupported Guinean languages when no browser voice matches', () => {
    globalThis.window.speechSynthesis.getVoices = vi.fn(() => [
      { lang: 'fr-FR', name: 'Microsoft Hortense' },
      { lang: 'en-US', name: 'Microsoft Aria' },
    ]);

    expect(getBestVoice('pular')).toBeNull();
    expect(getBestVoice('fulfulde')).toBeNull();
    expect(getBestVoice('soussou')).toBeNull();
  });

  it('refuses French fallback voices for provisional African languages even when a French voice is available', () => {
    globalThis.window.speechSynthesis.getVoices = vi.fn(() => [
      { lang: 'fr-FR', name: 'Microsoft Hortense' },
      { lang: 'en-US', name: 'Microsoft Aria' },
    ]);

    expect(getBestVoice('lingala')).toBeNull();
    expect(getBestVoice('bissa')).toBeNull();
    expect(getBestVoice('dioula')).toBeNull();
  });

  it('does not attempt backend or browser synthesis for provisional languages that do not have a reliable pronunciation profile', () => {
    globalThis.fetch = vi.fn();
    const onError = vi.fn();
    const onEnd = vi.fn();

    const result = speakText('Mbote', 'lingala', { onError, onEnd });

    expect(result).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('resolves the central audio priority order for native/local/remote sources', () => {
    const nativeOnly = {
      nativeUrl: '/audio/native.mp3',
      localUrl: '/audio/local.mp3',
      remoteUrl: 'https://example.com/remote.mp3',
    };

    expect(resolveAudioSource(nativeOnly, 'fr')).toBe('/audio/native.mp3');
    expect(resolveAudioSource({ localUrl: '/audio/local.mp3', remoteUrl: 'https://example.com/remote.mp3' }, 'fr')).toBe('/audio/local.mp3');
    expect(resolveAudioSource({ remoteUrl: 'https://example.com/remote.mp3' }, 'fr')).toBe('https://example.com/remote.mp3');
  });

  it('starts browser speech recognition when available', () => {
    const onResult = vi.fn();
    const rec = startVoiceRecognition('fr', { onResult });

    expect(rec).not.toBeNull();
    expect(rec.start).toHaveBeenCalledTimes(1);
    expect(rec.lang).toBe('fr-FR');
  });
});
