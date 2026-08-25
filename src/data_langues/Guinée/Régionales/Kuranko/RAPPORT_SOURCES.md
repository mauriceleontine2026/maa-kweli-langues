# Rapport des sources — Cursus de leçons Kuranko (knk)

## 1. Résumé

Ce cursus comprend **27 leçons** de kuranko (code ISO 639-3 `knk`, langue mandé du Nord, sous-groupe Mokole, apparentée au Maninka), réparties en trois niveaux (Débutant A1-A2, Intermédiaire B1-B2, Avancé C1-C2), chacun composé de 3 modules de 3 leçons. Tous les fichiers sont au format JSON strict, validés individuellement avec `python3 -m json.tool`, et respectent le schéma requis (champs `sources`, `confidence`, `confidence_note` inclus dans chacun).

Le kuranko est parlé par environ 350 000 personnes principalement dans le district de Koinadugu (ville de Kabala), en Sierra Leone, et en Guinée forestière frontalière ([Wikipedia, *Kuranko language*](https://en.wikipedia.org/wiki/Kuranko_language)). C'est l'une des langues mandé les mieux documentées sur le plan **ethnographique** grâce aux travaux de l'anthropologue Michael Jackson (près de 50 ans de terrain depuis 1969), mais elle reste très peu dotée en ressources **linguistiques numériques directement accessibles en ligne** (pas de dictionnaire ou de grammaire complète librement consultable sur le web pour la thèse de référence de Kastenholz).

## 2. Méthodologie de recherche

La recherche a mobilisé le SDK `pplx_sdk` (recherche web + extraction de contenu de pages) pour :
1. Identifier les fiches d'identification linguistique officielles (Glottolog, Ethnologue, WALS).
2. Localiser les travaux académiques disponibles en accès ouvert ou partiel sur le kuranko (Michael Jackson, Kastenholz).
3. Extraire tout vocabulaire, toute phrase et tout proverbe kuranko cité avec sa traduction dans ces sources.
4. Compléter, en dernier recours et avec un signalement explicite de confiance réduite, par des cognats attestés en maninka/bambara (langues mandé proches, avec intercompréhension partielle documentée) lorsque strictement aucune attestation directe en kuranko n'a pu être trouvée.

Aucun mot ou expression n'a été inventé de toutes pièces : chaque entrée de vocabulaire ou de phrase provient soit d'une attestation directe en kuranko, soit d'un cognat manding clairement signalé comme tel dans la `confidence_note` du fichier concerné.

## 3. Sources principales utilisées

1. Glottolog 5.3 — Kuranko (kura1250) — https://glottolog.org/resource/languoid/id/kura1250
2. Ethnologue — Kuranko (KNK) — https://www.ethnologue.com/language/knk/
3. WALS Online — Koranko (kko) — https://wals.info/languoid/lect/wals_code_kko
4. Wikipedia — *Kuranko language* — https://en.wikipedia.org/wiki/Kuranko_language
5. Wikipedia — *Kuranko people* — https://en.wikipedia.org/wiki/Kuranko_people
6. Wikipedia — *Mande languages* (tableau comparatif des numéraux, d'après Kastenholz) — https://en.wikipedia.org/wiki/Mande_languages
7. Wikipedia — *Koinadugu District* — https://en.wikipedia.org/wiki/Koinadugu_District
8. Michael Jackson, *How Lifeworlds Work: Emotionality, Sociality, and the Ambiguity of Being* (University of Chicago Press, 2022) — extraits — https://dokumen.pub/how-lifeworlds-work-emotionality-sociality-and-the-ambiguity-of-being-9780226492018.html
9. Michael Jackson, « Intersubjective ambiguities » (*Tijdschrift voor Medische Antropologie*) — https://tma.socsci.uva.nl/19_1/jackson.pdf
10. Michael Jackson, « An Approach to Kuranko Divination » (*Human Relations*, 1978) — https://journals.sagepub.com/doi/abs/10.1177/001872677803100202
11. Michael Jackson, *The Kuranko: Dimensions of Social Reality in a West African Society* (Hurst, 1977) — notice bibliographique — https://researchers.mq.edu.au/en/publications/the-kuranko-dimensions-of-social-reality-in-a-west-african-societ
12. Glosbe Kuranko-English Dictionary — entrées individuellement vérifiées : *water* (https://glosbe.com/en/knk/water), *name* (https://glosbe.com/en/knk/name), *go* (https://glosbe.com/en/knk/go)
13. Kastenholz, Raimund (1987), *Das Koranko: Ein Beitrag zur Erforschung der Nord-Mande-Sprachen* (thèse, Universität zu Köln) — cité via WALS et Glottolog ; texte intégral non accessible en ligne
14. An ka taa — *Maninka/Malinké greetings and phrases* (cognat manding, comparaison prudente) — https://www.ankataa.com/maninka-greetings-and-phrases
15. Omniglot — *Useful phrases in Bambara* (cognat manding, comparaison prudente) — https://www.omniglot.com/language/phrases/bambara.htm
16. Site communautaire Human Values Sierra Leone — « District Focus: Koinadugu District: Kabala » — https://www.hvsl.org/post/district-focus-koinadugu-district-kabala
17. 101 Last Tribes — *Kuranko / Koranko* — https://www.101lasttribes.com/tribes/kuranko.html

Chaque fichier JSON cite dans son propre champ `sources` uniquement le sous-ensemble de ces références effectivement mobilisé pour construire son contenu (2 à 5 sources par leçon, conformément au schéma).

## 4. Méthodologie de confiance

Trois niveaux de confiance sont utilisés, définis strictement dans `confidence_note` de chaque fichier :

- **élevée** : contenu construit presque intégralement à partir de citations directes de Michael Jackson (ou d'un tableau comparatif académique sourcé, comme les numéraux) avec traduction explicite fournie par la source elle-même. *Exemples : la leçon des chiffres (numéraux tirés du tableau comparatif Wikipedia/Kastenholz) et la leçon des proverbes (citations directes de Jackson).*
- **moyenne** : combinaison de mots et de phrases individuellement attestés en kuranko, assemblés en phrases pédagogiques complètes non attestées telles quelles dans les sources, mais construites de façon linguistiquement raisonnable à partir d'éléments vérifiés.
- **faible** : leçons pour lesquelles une partie significative du vocabulaire nécessaire n'a aucune attestation directe en kuranko dans les sources consultées (ex. alphabet détaillé, couleurs/vêtements, futur grammatical, négociation commerciale, obligation/permission, lexique technique moderne, analyse de textes historiques). Dans ces cas, le vocabulaire manquant est soit dérivé prudemment de cognats manding (maninka/bambara) clairement signalés, soit limité aux rares attestations disponibles, avec une divulgation honnête de cette limite dans `confidence_note`.

### Distribution finale de confiance (27 fichiers)

| Confiance | Nombre de leçons |
|---|---|
| Élevée | 2 |
| Moyenne | 15 |
| Faible | 10 |
| **Total** | **27** |

Détail :
- **Élevée (2)** : A1_M2_L5 (chiffres/nombres), C1_M2_L4 (proverbes et expressions imagées).
- **Faible (10)** : A1_M1_L3 (alphabet/sons), A1_M2_L6 (jours/mois/heure), A1_M3_L7 (directions), A1_M3_L9 (couleurs/vêtements), B1_M2_L5 (projets futurs), B1_M2_L6 (achats/négociation), B1_M3_L7 (obligation/interdiction), B1_M3_L8 (travail/études), C1_M3_L7 (analyse de textes littéraires/historiques), C1_M3_L8 (lexique technique/professionnel).
- **Moyenne (15)** : toutes les leçons restantes (salutations, présentation, famille, nourriture, logement, loisirs, goûts, récit passé, conseils, temps complexes, hypothèse/condition, connecteurs logiques, débat/argumentation, registre soutenu, traduction/nuances stylistiques).

## 5. Limites et divulgation honnête

- **Aucune grammaire ou dictionnaire kuranko complet et librement accessible en ligne n'a été trouvé.** La thèse de référence de Kastenholz (1987, *Das Koranko*) est citée par toutes les bases de données linguistiques (Glottolog, WALS) comme la source grammaticale primaire, mais son texte intégral n'a pas pu être récupéré via recherche web ouverte.
- **Glosbe (dictionnaire collaboratif kuranko-anglais)** n'a fourni que 3 entrées individuellement vérifiables et fiables (*eau*, *nom*, *aller*) ; la plupart des autres entrées du site n'ont pas pu être validées avec un niveau de confiance suffisant et n'ont donc pas été utilisées.
- **Les œuvres de Michael Jackson restent, de loin, la source la plus riche et la plus fiable** de vocabulaire, de phrases et surtout de proverbes kuranko authentiques avec traduction, car cet anthropologue cite systématiquement des énoncés en langue originale dans ses travaux ethnographiques.
- Pour les domaines lexicaux totalement absents des sources disponibles en ligne (vocabulaire technique moderne — informatique, ingénierie, médecine —, couleurs, systèmes calendaires, formules de négociation commerciale), le cursus recourt, en dernier ressort et de façon toujours signalée, à des cognats attestés en maninka/bambara (langues mandé proches avec intercompréhension partielle documentée), ou limite volontairement son contenu aux éléments réellement vérifiables plutôt que d'inventer des termes.
- Les phrases de dialogue de chaque leçon réutilisent exclusivement le vocabulaire et les expressions déjà validés dans le même fichier, conformément à l'exigence de ne jamais introduire de vocabulaire non vérifié dans les dialogues.

## 6. Validation technique

Les 27 fichiers ont été validés individuellement avec la commande :
```
python3 -m json.tool <fichier>.json
```
Résultat : **27/27 fichiers valides**, aucune erreur de syntaxe JSON. Chaque fichier a également été vérifié pour la présence de toutes les clés de schéma requises (`lesson_id`, `level`, `module_number`, `module_title`, `lesson_number`, `title`, `learning_objectives`, `phonetic_focus`, `vocabulary`, `common_phrases`, `grammar_points`, `dialogue`, `cultural_notes`, `exercises`, `sources`, `confidence`, `confidence_note`) et pour le respect des bornes numériques imposées (vocabulaire 5-8 entrées, phrases usuelles 4-10, points de grammaire 1-3, dialogue 4-8 répliques, exercices 2-3, sources 2-5).
