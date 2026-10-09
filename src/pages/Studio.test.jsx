import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import Studio from './Studio';
import AccentWorkshop from './studio/AccentWorkshop';
import { LanguageProvider } from '@/contexts/LanguageContext';

describe('Studio page', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key) => (key === 'maa-kweli-language' ? 'en' : null),
        setItem: () => {},
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders English copy when the interface language is English', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <LanguageProvider>
          <Studio />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(html).toContain('AI Studio &amp; Data Science');
    expect(html).toContain('Mǎa-kwɛ́lî advanced modules');
    expect(html).not.toContain('Les modules avancés de Mǎa-kwɛ́lî');
  });

  it('renders the accent workshop in English when the language is English', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <LanguageProvider>
          <AccentWorkshop />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(html).toContain('Accent Workshop');
    expect(html).toContain('Listen, record, and compare your pronunciation.');
    expect(html).not.toContain('Atelier d\'Accent');
    expect(html).not.toContain('Choisir un mot');
  });
});
