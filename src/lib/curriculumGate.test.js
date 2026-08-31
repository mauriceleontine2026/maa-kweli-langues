import { describe, expect, it } from 'vitest';
import { getLockMessageForModule } from './curriculumGate';
import { getLocalizedCurriculumText } from './localLanguageData';

describe('curriculum gate lock messages', () => {
  it('keeps the raw restriction text in French for the source curriculum logic', () => {
    expect(getLockMessageForModule(0, 1, { id: 'niveau-debutant' }, false)).toBe(
      'Termine le module précédent et valide sa série d’exercices avec au moins 70%.'
    );
    expect(getLockMessageForModule(1, 1, { id: 'niveau-intermediaire' }, false)).toBe(
      'Débloque ce niveau en terminant d’abord toutes les leçons et les séries d’exercices du Niveau Débutant avec une moyenne d’au moins 70%.'
    );
  });

  it('translates the restriction message in English interface mode', () => {
    const message = 'Termine le module précédent et valide sa série d’exercices avec au moins 70%.';
    expect(getLocalizedCurriculumText(message, 'en')).toBe(
      'Finish the previous module and pass its exercise set with at least 70%.'
    );
    expect(getLocalizedCurriculumText('Débloque ce niveau en terminant d’abord toutes les leçons et les séries d’exercices du Niveau Débutant avec une moyenne d’au moins 70%.', 'en')).toBe(
      'Unlock this level by first completing all lessons and exercise sets in Beginner Level with an average of at least 70%.'
    );
  });

  it('translates lesson description copy that still appeared in French in the shared screen', () => {
    expect(getLocalizedCurriculumText('Savoir saluer selon le moment de la journée en espagnol', 'en')).toBe(
      'Know how to greet according to the time of day in Spanish'
    );
    expect(getLocalizedCurriculumText('Exprimer la politesse, le remerciement et prendre congé de manière simple', 'en')).toBe(
      'Express politeness, gratitude, and say goodbye simply'
    );
  });
});
