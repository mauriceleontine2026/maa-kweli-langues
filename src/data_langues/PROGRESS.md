# Suivi de la révision des leçons (contenu vérifié)

Ce document suit l'avancement de la correction/enrichissement des 39 langues du dossier
`src/data_langues` (27 leçons JSON par langue, 1053 fichiers au total). Chaque leçon révisée
contient désormais des champs `sources` (URLs consultées) et `confidence` (élevée / moyenne /
faible) permettant de savoir sur quelles bases le contenu a été établi.

Légende : ⬜ non commencé · 🟨 en cours · ✅ révisé avec sources

## Guinée — Langues nationales
- ✅ Soussou
- ✅ Malinké
- ✅ Pular

## Guinée — Langues forestières
- ✅ Guerzé
- ✅ Kissi
- ✅ Kono
- ✅ Mano
- ✅ Toma

## Guinée — Langues régionales (données très rares, priorité basse, confiance attendue faible/moyenne)
- ⬜ Badiaranké
- ⬜ Baga
- ⬜ Bassari (Oniyah)
- ⬜ Bedik
- ⬜ Konyagi (Wamey)
- ⬜ Konyanka (Koyaka)
- ⬜ Kuranko
- ⬜ Landuma
- ⬜ Lélé
- ⬜ Mani
- ⬜ Nalu
- ⬜ Sankaran
- ⬜ Yalunka (Jalonké)

## Afrique de l'Ouest / Centrale-Est
- ⬜ Igbo
- ⬜ Dioula
- ⬜ Mooré
- ⬜ Yoruba
- ⬜ Bissa
- ⬜ Swahili
- ⬜ Lingala

## Langues internationales (déjà globalement enrichies, passe de vérification/sourçage à faire)
- ⬜ Anglais
- ⬜ Français
- ⬜ Espagnol
- ⬜ Allemand
- ⬜ Italien
- ⬜ Portugais
- ⬜ Russe
- ⬜ Arabe
- ⬜ Chinois (mandarin)
- ⬜ Japonais
- ⬜ Hindi

## Méthode
1. Recherche de sources fiables (dictionnaires académiques, manuels Peace Corps/Live Lingua
   Project, Wiktionary, Glosbe, SIL/Ethnologue, thèses universitaires) pour les 27 sujets de
   leçon standard.
2. Réécriture des 27 fichiers JSON avec vocabulaire, phrases, grammaire, dialogues et exercices
   réels, en ajoutant les champs `sources` et `confidence` à chaque fichier.
3. Validation JSON + relecture, puis commit direct sur `main`.

Pour les langues très peu documentées (langues régionales de Guinée), le contenu sera signalé en
confiance "faible" ou "moyenne" lorsque les sources disponibles sont insuffisantes — mieux vaut un
contenu honnêtement incertain que des données inventées présentées comme fiables.
