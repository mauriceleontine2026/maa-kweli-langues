import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';import { getLocalLanguages, initializeLocalLanguageData } from '@/lib/localLanguageData';import { getAdminLanguages, getLanguages, getLanguageByCode, getLanguageCodeAdapter, saveLanguageCodeAdapter, getVocabularyForLanguage, getVocabularyForLesson, getLessonsForLanguage, getAllVocabulary, getAllLessons } from './languageService';

const mockRequest = vi.fn();

vi.mock('./backendClient', () => ({
  request: (...args) => mockRequest(...args),
}));

describe('languageService local language data', () => {
  beforeEach(() => {
    mockRequest.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns all local languages without a backend request', async () => {
    const result = await getLanguages();

    expect(mockRequest).not.toHaveBeenCalled();
    expect(result).toHaveLength(39);
  });

  it('merges backend languages into the admin language list', async () => {
    mockRequest.mockResolvedValueOnce([
      { code: 'bm', name: 'Bambara', name_fr: 'Bambara' },
      { code: 'tw', name: 'Akuapem Twi', name_fr: 'Twi akua' },
    ]);

    const result = await getAdminLanguages();

    expect(mockRequest).toHaveBeenCalledWith('GET', '/api/languages');
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'bm', name: 'Bambara', name_fr: 'Bambara' }),
      expect.objectContaining({ code: 'tw', name: 'Akuapem Twi', name_fr: 'Twi akua' }),
    ]));
  });

  it('loads lessons and vocabulary from the local language data', async () => {
    const lessons = await getLessonsForLanguage('malinke');
    const vocabulary = await getVocabularyForLanguage('malinke');

    expect(lessons.length).toBeGreaterThan(0);
    expect(vocabulary.length).toBeGreaterThan(0);
    expect(lessons[0].title_fr).toBeTruthy();
    expect(Array.isArray(lessons[0].learning_objectives)).toBe(true);
    expect(Array.isArray(lessons[0].common_phrases)).toBe(true);

    const languages = await getLanguages();
    const lessonCounts = await Promise.all(
      languages.map(async (language) => (await getLessonsForLanguage(language.code)).length)
    );
    expect(lessonCounts).toHaveLength(39);
    expect(lessonCounts.every((count) => count > 0)).toBe(true);
    expect((await getLessonsForLanguage('igbo')).some((lesson) => lesson.lesson_number === 1)).toBe(true);
    expect((await getLessonsForLanguage('moore')).some((lesson) => lesson.lesson_number === 1)).toBe(true);
  }, 15000);

  it('includes Guinean languages from the local data folders', async () => {
    await initializeLocalLanguageData();
    const languages = getLocalLanguages();

    expect(languages.some((lang) => lang.code === 'malinke')).toBe(true);
    expect(languages.some((lang) => lang.code === 'pular')).toBe(true);
    expect(languages.some((lang) => lang.code === 'guerze')).toBe(true);
    expect(languages.length).toBeGreaterThan(18);
  });

  it('initializes the local language dataset lazily', async () => {
    const initialized = await initializeLocalLanguageData();
    expect(initialized).toBeTruthy();
    expect(getLocalLanguages().length).toBeGreaterThan(0);
  });

  it('fetches vocabulary by lesson from the backend', async () => {
    mockRequest.mockResolvedValue([{ word: 'bonjour', lesson_number: 1 }]);

    const result = await getVocabularyForLesson('fr', 1);

    expect(mockRequest).toHaveBeenCalledWith('GET', '/api/vocabulary', undefined, { language_code: 'fr', lesson_number: 1 });
    expect(result).toEqual([{ word: 'bonjour', lesson_number: 1 }]);
  });

  it('gets and saves the verified ISO/TTS adapter separately from the app language code', async () => {
    mockRequest.mockResolvedValueOnce({ language_code: 'bam', iso639_3: 'bam', tts_model_id: 'facebook/mms-tts-bam' });
    mockRequest.mockResolvedValueOnce({ language_code: 'bam', iso639_3: 'bam', tts_model_id: 'facebook/mms-tts-bam' });

    await getLanguageCodeAdapter('bam');
    await saveLanguageCodeAdapter('bam', { iso639_3: 'bam', tts_model_id: 'facebook/mms-tts-bam' });

    expect(mockRequest).toHaveBeenNthCalledWith(1, 'GET', '/api/languages/bam/adapter');
    expect(mockRequest).toHaveBeenNthCalledWith(2, 'PUT', '/api/languages/bam/adapter', {
      iso639_3: 'bam',
      tts_model_id: 'facebook/mms-tts-bam',
    });
  });
});
