#!/usr/bin/env python3
import json

# New translations to add
new_translations = {
    # Learning objectives - Core verbs (80-120+ occurrences each)
    "Maîtriser": "Master",
    "Exprimer": "Express",
    "Formuler": "Formulate",
    "Comprendre": "Understand",
    "Utiliser les": "Use the",
    "Identifier": "Identify",
    "Reconnaître": "Recognize",
    "Situer": "Situate",
    "Parler de": "Speak about",
    "Pour exprimer": "To express",
    "La grammaire": "Grammar",
    "Explication": "Explanation",
    "Contexte": "Context",
    # Level-specific names
    "Débutant (A1 - A2)": "Beginner (A1 - A2)",
    "Intermédiaire (B1 - B2)": "Intermediate (B1 - B2)",
    "Avancé (C1 - C2)": "Advanced (C1 - C2)",
    # Common lesson titles
    "La nourriture et les boissons": "Food and beverages",
    "La famille et les relations proches": "Family and close relationships",
    "Les couleurs et les vêtements": "Colors and clothing",
    "Les jours de la semaine, les mois et dire l'heure": "Days of the week, months, and telling time",
    "Demander son chemin et se repérer": "Asking for directions and orientation",
    "Les nombres et le comptage": "Numbers and counting",
    "La maison et le logement": "House and housing",
    "Les loisirs et les activités sportives": "Leisure and sports activities",
    "Les achats et le commerce": "Shopping and commerce",
    "Le travail et la profession": "Work and profession",
    "L'éducation et les études": "Education and studies",
    "La santé et le bien-être": "Health and well-being",
    "Les transports et les voyages": "Transportation and travel",
    "Les textes littéraires et historiques": "Literary and historical texts",
    "Le lexique technique et professionnel": "Technical and professional vocabulary",
    "La phonétique et la prononciation": "Phonetics and pronunciation",
    "La grammaire générale": "General grammar",
    "Les verbes et les conjugaisons": "Verbs and conjugations",
    "Les noms et les genres": "Nouns and genders",
    "Les adjectifs et les adverbes": "Adjectives and adverbs",
    "Le conditionnel et l'hypothèse": "Conditional and hypothesis",
    "Le subjonctif et les doutes": "Subjunctive and doubts",
    "L'impératif et les ordres": "Imperative and commands",
    "Le passé et les temps du récit": "Past tense and narrative",
    "Le présent et les actions actuelles": "Present tense and current actions",
    "Le futur et les projets": "Future tense and projects",
    "Les sons clés": "Key sounds",
    "À retenir": "Remember",
    "Point de vigilance": "Watch out",
    "Les erreurs à éviter": "Mistakes to avoid",
    "Dialogue de la leçon": "Lesson dialogue",
    "Voir la traduction": "See translation",
    "Masquer la traduction": "Hide translation",
    "Consigne": "Instruction",
    "Exercice": "Exercise",
    "Question": "Question",
    "Règle": "Rule",
    "Repère": "Highlight",
    "Réduire l'explication": "Collapse explanation",
    "Ouvrir l'explication →": "Open explanation →",
    "Je suis": "I am",
    "Évaluation": "Assessment",
    "Examen de la leçon": "Lesson exam",
    "Lancer le défi": "Start challenge",
    "Provenance": "Source",
    "Sources de la leçon": "Lesson sources",
    "Fiabilité": "Reliability",
    "Fichier de données": "Data file",
    "Note méthodologique": "Methodology note",
    "Conversation": "Conversation",
    "Objectifs à débloquer": "Goals to unlock",
    "Focus phonétique": "Phonetics focus",
    "Apprentissage": "Learning",
    "Phrase": "Phrase",
    "Raconter des faits passés": "Tell about past events",
    "Parler de sa maison": "Talk about your home",
    "Parler de son logement": "Talk about your housing",
    "Parler de sa ville": "Talk about your city",
    "Parler de ses projets futurs": "Talk about your future plans",
    "Parler de son travail": "Talk about your work",
    "Parler de ses études": "Talk about your studies",
    "Faire des achats": "Do shopping",
    "Négocier les prix": "Negotiate prices",
    "Demander des conseils": "Ask for advice",
    "Donner des instructions": "Give instructions",
    "Débattre": "Debate",
    "Argumenter": "Argue",
    "Défendre un point de vue": "Defend a point of view",
    "Comprendre et analyser": "Understand and analyze",
    "Les temps du récit": "Narrative tenses",
    "Interactions sociales": "Social interactions",
    "Interactions professionnelles": "Professional interactions",
    "Besoins immédiats": "Immediate needs",
    "Nuances et complexité": "Nuances and complexity",
    "Culture, traditions et rhétorique": "Culture, traditions, and rhetoric",
    "Maîtrise totale": "Complete mastery",
    "Module": "Module",
    "Leçon": "Lesson",
    "Section": "Section",
    "Contenu": "Content",
    "Description": "Description",
    "Objectif": "Objective",
    "Objectifs": "Objectives",
    "Compétences": "Skills",
    "Vocabulaire": "Vocabulary",
    "Expressions courantes": "Common expressions",
    "Phrases courantes": "Common phrases",
    "Explications": "Explanations",
    "Exemples": "Examples",
    "Exercices": "Exercises",
    "Dialogue": "Dialogue",
    "Culture": "Culture",
    "Sources": "Sources",
}

# Read the file
with open("src/lib/localLanguageData.js", "r", encoding="utf-8") as f:
    content = f.read()

# Find the position of the closing }; of CURRICULUM_TEXT_EN
# It's the first }; after "const CURRICULUM_TEXT_EN"
start_pos = content.find("const CURRICULUM_TEXT_EN")
brace_pos = content.find("};", start_pos)

# Insert new translations before the closing brace
insertion_point = brace_pos

# Build the new content to insert
new_content_lines = []
new_content_lines.append(",")
new_content_lines.append("  // Comprehensive curriculum translations (1000+ lessons)")
for key, value in sorted(new_translations.items(), key=lambda x: -len(x[0])):
    new_content_lines.append(f'  "{key}": "{value}",')

new_content_str = "\n".join(new_content_lines)

# Remove the trailing comma from the last line
new_content_str = new_content_str.rstrip(",")

# Replace the last entry with comma + new entries (remove the comma from the previous last entry, add it back)
# Actually, let's be smarter and replace from the last entry
last_entry_start = content.rfind('"', 0, brace_pos)
last_entry_start = content.rfind('"', 0, last_entry_start)
last_line_start = content.rfind("\n", 0, last_entry_start) + 1

# Get the full last line
last_line_end = content.find("\n", brace_pos - 100)
if last_line_end == -1:
    last_line_end = brace_pos

# Create the new content
new_js_content = (
    content[:brace_pos] + 
    ",\n" +
    "  // Comprehensive curriculum translations (1000+ lessons)\n" +
    "\n".join([f'  "{key}": "{value}",' for key, value in sorted(new_translations.items(), key=lambda x: -len(x[0]))]) +
    "\n" +
    content[brace_pos:]
)

# Write back
with open("src/lib/localLanguageData.js", "w", encoding="utf-8") as f:
    f.write(new_js_content)

print(f"✅ Added {len(new_translations)} new translations to CURRICULUM_TEXT_EN")
print("File updated successfully!")
