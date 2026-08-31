import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, 'src/lib/localLanguageData.js');

// Comprehensive list of new translations (111 entries)
const newTranslations = {
  'Maîtriser': 'Master',
  'Exprimer': 'Express',
  'Formuler': 'Formulate',
  'Comprendre': 'Understand',
  'Utiliser les': 'Use the',
  'Identifier': 'Identify',
  'Reconnaître': 'Recognize',
  'Situer': 'Situate',
  'Parler de': 'Speak about',
  'Pour exprimer': 'To express',
  'La grammaire': 'Grammar',
  'Explication': 'Explanation',
  'Contexte': 'Context',
  'Débutant (A1 - A2)': 'Beginner (A1 - A2)',
  'Intermédiaire (B1 - B2)': 'Intermediate (B1 - B2)',
  'Avancé (C1 - C2)': 'Advanced (C1 - C2)',
  'La nourriture et les boissons': 'Food and beverages',
  'La famille et les relations proches': 'Family and close relationships',
  'Les couleurs et les vêtements': 'Colors and clothing',
  'Les jours de la semaine, les mois et dire l\'heure': 'Days of the week, months, and telling time',
  'Demander son chemin et se repérer': 'Asking for directions and orientation',
  'Les nombres et le comptage': 'Numbers and counting',
  'La maison et le logement': 'House and housing',
  'Les loisirs et les activités sportives': 'Leisure and sports activities',
  'Les achats et le commerce': 'Shopping and commerce',
  'Le travail et la profession': 'Work and profession',
  'L\'éducation et les études': 'Education and studies',
  'La santé et le bien-être': 'Health and well-being',
  'Les transports et les voyages': 'Transportation and travel',
  'Les textes littéraires et historiques': 'Literary and historical texts',
  'Le lexique technique et professionnel': 'Technical and professional vocabulary',
  'La phonétique et la prononciation': 'Phonetics and pronunciation',
  'La grammaire générale': 'General grammar',
  'Les verbes et les conjugaisons': 'Verbs and conjugations',
  'Les noms et les genres': 'Nouns and genders',
  'Les adjectifs et les adverbes': 'Adjectives and adverbs',
  'Le conditionnel et l\'hypothèse': 'Conditional and hypothesis',
  'Le subjonctif et les doutes': 'Subjunctive and doubts',
  'L\'impératif et les ordres': 'Imperative and commands',
  'Le passé et les temps du récit': 'Past tense and narrative',
  'Le présent et les actions actuelles': 'Present tense and current actions',
  'Le futur et les projets': 'Future tense and projects',
  'Les sons clés': 'Key sounds',
  'À retenir': 'Remember',
  'Point de vigilance': 'Watch out',
  'Les erreurs à éviter': 'Mistakes to avoid',
  'Dialogue de la leçon': 'Lesson dialogue',
  'Voir la traduction': 'See translation',
  'Masquer la traduction': 'Hide translation',
  'Commencer l\'examen': 'Start exam',
  'Consigne': 'Instruction',
  'Exercice': 'Exercise',
  'Question': 'Question',
  'Règle': 'Rule',
  'Repère': 'Highlight',
  'Réduire l\'explication': 'Collapse explanation',
  'Ouvrir l\'explication →': 'Open explanation →',
  'Je suis': 'I am',
  'Évaluation': 'Assessment',
  'Examen de la leçon': 'Lesson exam',
  'Lancer le défi': 'Start challenge',
  'Provenance': 'Source',
  'Sources de la leçon': 'Lesson sources',
  'Fiabilité': 'Reliability',
  'Fichier de données': 'Data file',
  'Note méthodologique': 'Methodology note',
  'Conversation': 'Conversation',
  'Objectifs à débloquer': 'Goals to unlock',
  'Focus phonétique': 'Phonetics focus',
  'Apprentissage': 'Learning',
  'Phrase': 'Phrase',
  'Raconter des faits passés': 'Tell about past events',
  'Parler de sa maison': 'Talk about your home',
  'Parler de son logement': 'Talk about your housing',
  'Parler de sa ville': 'Talk about your city',
  'Parler de ses projets futurs': 'Talk about your future plans',
  'Parler de son travail': 'Talk about your work',
  'Parler de ses études': 'Talk about your studies',
  'Faire des achats': 'Do shopping',
  'Négocier les prix': 'Negotiate prices',
  'Gérer l\'argent': 'Manage money',
  'Demander des conseils': 'Ask for advice',
  'Donner des instructions': 'Give instructions',
  'Débattre': 'Debate',
  'Argumenter': 'Argue',
  'Défendre un point de vue': 'Defend a point of view',
  'Comprendre et analyser': 'Understand and analyze',
  'Les temps du récit': 'Narrative tenses',
  'Interactions sociales': 'Social interactions',
  'Interactions professionnelles': 'Professional interactions',
  'Besoins immédiats': 'Immediate needs',
  'Nuances et complexité': 'Nuances and complexity',
  'Culture, traditions et rhétorique': 'Culture, traditions, and rhetoric',
  'Maîtrise totale': 'Complete mastery',
  'Module': 'Module',
  'Leçon': 'Lesson',
  'Section': 'Section',
  'Contenu': 'Content',
  'Description': 'Description',
  'Objectif': 'Objective',
  'Objectifs': 'Objectives',
  'Compétences': 'Skills',
  'Vocabulaire': 'Vocabulary',
  'Expressions courantes': 'Common expressions',
  'Phrases courantes': 'Common phrases',
  'Explications': 'Explanations',
  'Exemples': 'Examples',
  'Exercices': 'Exercises',
  'Dialogue': 'Dialogue',
  'Culture': 'Culture',
  'Sources': 'Sources',
};

// Read file
const content = fs.readFileSync(filePath, 'utf-8');

// Find the closing }; of CURRICULUM_TEXT_EN
const startMarker = 'const CURRICULUM_TEXT_EN = {';
const startIdx = content.indexOf(startMarker);
if (startIdx === -1) {
  console.error('Could not find CURRICULUM_TEXT_EN');
  process.exit(1);
}

// Find the closing }; - look for the first }; after the start
let braceCount = 0;
let foundOpen = false;
let endIdx = -1;

for (let i = startIdx; i < content.length; i++) {
  if (content[i] === '{') {
    foundOpen = true;
    braceCount++;
  } else if (content[i] === '}' && foundOpen) {
    braceCount--;
    if (braceCount === 0) {
      // Found closing brace, now find the ;
      if (content[i + 1] === ';') {
        endIdx = i;
        break;
      }
    }
  }
}

if (endIdx === -1) {
  console.error('Could not find end of CURRICULUM_TEXT_EN');
  process.exit(1);
}

// Sort translations by key length (longest first) to ensure proper replacement
const sortedEntries = Object.entries(newTranslations).sort((a, b) => b[0].length - a[0].length);

// Build new entries (properly formatted)
const newEntries = sortedEntries.map(([key, value]) => {
  // Properly escape the strings for JavaScript
  const escapedKey = key.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const escapedValue = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `  "${escapedKey}": "${escapedValue}",`;
});

// Insert before the closing brace
const before = content.slice(0, endIdx);
const after = content.slice(endIdx);

// Add entries with proper formatting
const insertion = '\n  // Comprehensive curriculum translations (1000+ lessons)\n' + newEntries.join('\n') + '\n';
const newContent = before + insertion + after;

// Write back
fs.writeFileSync(filePath, newContent, 'utf-8');

console.log(`✅ Successfully added ${sortedEntries.length} translations to CURRICULUM_TEXT_EN`);
console.log(`📁 Updated: ${filePath}`);
