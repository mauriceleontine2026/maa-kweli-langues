import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { normalizeTtsLanguageCode, getBestVoice } from './languagePhonology';
import { cleanTextForTTS, resolveAudioSource, shouldAttemptBackendTts, speakText, startVoiceRecognition, stopVoiceRecognition, playAudioSource } from './audioService';
import { getLanguageConfig } from './voiceConfig';
import { AudioStatusBadgeInline } from '../components/AudioStatusBadge';

describe('audioService', () => {
  beforeEach(() => {
    globalThis.window = globalThis.window || {};
    globalThis.window.MBAARA_TTS_GENERATION = "true";
    globalThis.window.speechSynthesis = {
      cancel: vi.fn(),
      speak: vi.fn(),
      getVoices: vi.fn(() => [
        { lang: 'fr-FR', name: 'Google Français' },
      ]),
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
    delete globalThis.window.MBAARA_TTS_GENERATION;
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

  it('shows the fallback-only status instead of the unavailable label for languages with a real gTTS route', () => {
    const html = renderToStaticMarkup(AudioStatusBadgeInline({ languageCode: 'francais', size: 'sm' }));
    expect(html).toContain('Voix gTTS');
    expect(html).not.toContain('Indisponible');
  });

  it('renders an explicit unavailable status instead of a blank badge when a language has no configured TTS profile', () => {
    const html = renderToStaticMarkup(AudioStatusBadgeInline({ languageCode: 'langue-inconnue', size: 'sm' }));
    expect(html).toContain('audio non disponible');
    expect(html).toContain('Cours dispo');
  });

  it('removes phonetic guidance and technical markers while preserving meaningful parentheticals', () => {
    expect(cleanTextForTTS('Kedu (prononciation simplifiée : ké-dou, IPA : /kɛ́dʊ̀/) signifie bonjour (salutation). [AUDIO:https://example.com/kedu.mp3]'))
      .toBe('Kedu signifie bonjour (salutation).');
    expect(cleanTextForTTS('Kedu [ph : ké-dou] signifie bonjour.'))
      .toBe('Kedu signifie bonjour.');
    expect(cleanTextForTTS('Bonjour — /bɔ̃ʒuʁ/ (bohn-zhoor) Sources Perplexity : - https://example.com/bonjour'))
      .toBe('Bonjour —');
  });

  it('resolves exactly the catalogue languages with a real configured gTTS locale', () => {
    const supportedCodes = [
      'francais', 'anglais', 'espagnol', 'allemand', 'arabe', 'portugais',
      'italien', 'japonais', 'russe', 'hindi', 'chinois-mandarin', 'swahili', 'hausa',
    ];
    window.MBAARA_TTS_GENERATION = 'false';

    supportedCodes.forEach((code) => {
      expect(getLanguageConfig(code)?.tts).toMatchObject({
        backendIntegration: 'gtts',
        status: 'fallback-only',
      });
      expect(shouldAttemptBackendTts(code)).toBe(true);
    });

    expect(supportedCodes).toHaveLength(13);
  });

  it('does not present unsupported local-language fallbacks as available TTS', () => {
    ['lingala', 'bissa', 'dioula', 'igbo', 'yoruba', 'pular', 'wolof', 'kuranko', 'konyanka', 'toma']
      .forEach((code) => {
        expect(getLanguageConfig(code)?.tts?.status).toBe('unavailable');
        expect(shouldAttemptBackendTts(code)).toBe(false);
      });
  });

  it('uses the language locale and speaks without the browser API failing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'not available' }),
    });

    const result = speakText('Bonjour — /bɔ̃ʒuʁ/ (bohn-zhoor) Sources Perplexity : - https://example.com/bonjour', 'francais', { onEnd: vi.fn() });
    expect(result).toBe(true);

    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/audio/synthesize',
      expect.objectContaining({ method: 'POST' })
    );
    expect(JSON.parse(globalThis.fetch.mock.calls[0][1].body).text)
      .toBe('Bonjour —');
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    expect(window.speechSynthesis.speak).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Bonjour —' })
    );
  });

  it('requests backend TTS before falling back to browser speech when no audio file is available', async () => {
    const playedUrls = [];
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      url: 'http://127.0.0.1:8000/api/audio/synthesize',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({ audio_url: '/static/audio/tts_test.mp3' }),
    });

    globalThis.Audio = class {
      constructor(url) {
        this.src = url;
        playedUrls.push(url);
        this.play = vi.fn().mockResolvedValue();
      }
    };

    const onEnd = vi.fn();
    const result = playAudioSource({}, 'francais', { fallbackText: 'Bonjour unique gTTS', onEnd });

    expect(result).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/audio/synthesize',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json',
        }),
      })
    );
    expect(playedUrls).toHaveLength(1);
    expect(new URL(playedUrls[0]).pathname).toBe('/static/audio/tts_test.mp3');
  });

  it('does not attempt TTS for production languages without an actual provider', () => {
    ['lingala', 'bissa', 'dioula', 'igbo', 'yoruba', 'pular', 'wolof', 'kuranko', 'konyanka', 'toma']
      .forEach((code) => expect(shouldAttemptBackendTts(code)).toBe(false));
  });

  it('normalizes learning language names without forcing unsupported synthesis', async () => {
    const expectedMap = {
      lingala: 'lin',
      swahili: 'swa',
      bissa: 'bib',
      moore: 'mos',
      dioula: 'dyu',
      soussou: 'sus',
      pular: 'ff',
      malinke: 'mnk',
      kissi: 'kss',
      guerze: 'gxx',
      konyanka: 'kno',
      kuranko: 'kek',
      landuma: 'ldu',
      lele: 'lle',
      mani: 'mni',
      nalu: 'nlu',
      sankaran: 'snk',
      yalunka: 'yal',
      kono: 'kno',
      mano: 'mev',
      toma: 'tom',
      badiaranke: 'bsc',
      baga: 'bgo',
      bassari: 'bsq',
      bedik: 'bdf',
      koniagui: 'kno',
      igbo: 'ibo',
      yoruba: 'yor',
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
    expect(onError).toHaveBeenCalledTimes(1);
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

  it('does not attempt backend synthesis for unsupported languages', async () => {
    globalThis.fetch = vi.fn();
    const onError = vi.fn();
    const result = speakText('Mbote', 'lingala', { onError });

    expect(result).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
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
