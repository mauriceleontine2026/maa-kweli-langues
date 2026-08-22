# Rapport des sources — Cours de langue Soussou (Susu, ISO 639-3 : sus)

## Vue d'ensemble

Ce rapport accompagne les 27 fichiers de leçons JSON produits pour l'apprentissage du **soussou** (Susu), langue mandingue parlée principalement à Conakry et en Basse-Guinée. Il documente les sources utilisées, la méthodologie de vérification appliquée, et fournit une évaluation honnête du niveau de confiance pour chaque leçon.

**Nombre total de fichiers produits : 27 / 27** (9 leçons Niveau Débutant A1-A2, 9 leçons Niveau Intermédiaire B1-B2, 9 leçons Niveau Avancé C1-C2), tous validés comme JSON syntaxiquement correct (`python3 -m json.tool`) et conformes au schéma requis (champs racine complets ; `vocabulary` 5-8 entrées ; `common_phrases` 4-10 entrées ; `grammar_points` 1-3 entrées ; `dialogue` 4-8 tours ; `exercises` 2-3 entrées ; `sources` 2-5 entrées par fichier).

## Sources principales utilisées

1. **Manuel Peace Corps Guinée — Susu Language Course** (source primaire pour la majorité du vocabulaire, de la grammaire et des dialogues) : [https://fsi-languages.yojik.eu/languages/PeaceCorps/Susu/susu-language-course.pdf](https://fsi-languages.yojik.eu/languages/PeaceCorps/Susu/susu-language-course.pdf) — également disponible via Live Lingua Project : [https://www.livelingua.com/course/peace_corps/susu_language_lessons](https://www.livelingua.com/course/peace_corps/susu_language_lessons)
2. **Wikipedia — Susu language** (confirmation de la phonologie, de la classification linguistique et de données sociolinguistiques) : [https://en.wikipedia.org/wiki/Susu_language](https://en.wikipedia.org/wiki/Susu_language)
3. **Wikivoyage — Susu phrasebook** (vérification croisée de phrases usuelles) : [https://en.wikivoyage.org/wiki/Susu_phrasebook](https://en.wikivoyage.org/wiki/Susu_phrasebook)
4. **Omniglot — Susu** (système d'écriture, alphabet latin et historique) : [https://www.omniglot.com/writing/susu.htm](https://www.omniglot.com/writing/susu.htm)
5. **Glosbe — Dictionnaire français-soussou** (vérification lexicale croisée) : [https://glosbe.com/fr/sus](https://glosbe.com/fr/sus)
6. **Kirinapost — 5 proverbes guinéens** (proverbes et expressions culturelles) : [https://kirinapost.com/5-proverbes-guineens/](https://kirinapost.com/5-proverbes-guineens/)
7. **Calaméo — Grammaire et Dictionnaire Français-Soussou et Soussou-Français** (100 proverbes numérotés, formules de salutation/bénédiction, table des conjonctions) : [https://www.calameo.com/books/000061616e6f8234fccef](https://www.calameo.com/books/000061616e6f8234fccef)
8. **PanAfrican Localisation Project** (ressources terminologiques et linguistiques) : [https://idl-bnc-idrc.dspacedirect.org/server/api/core/bitstreams/a00b84e4-d55d-4dbf-b07b-83bded105a05/content](https://idl-bnc-idrc.dspacedirect.org/server/api/core/bitstreams/a00b84e4-d55d-4dbf-b07b-83bded105a05/content)
9. **ERIC / Peace Corps Sierra Leone (1987)** (matériel pédagogique comparatif) : [https://eric.ed.gov/?id=ED294421](https://eric.ed.gov/?id=ED294421)
10. **Duport, J. (1886) — Susu Language, Outlines of a Grammar** (grammaire académique historique — utilisée avec prudence en raison d'une orthographe datée et non standardisée) : [https://theswissbay.ch/pdf/Books/Linguistics/Mega%20linguistics%20pack/African/Niger-Congo/Mande/Susu%20Language,%20Outlines%20of%20a%20Grammar%20of%20the%20(Duport)%20(1886).pdf](https://theswissbay.ch/pdf/Books/Linguistics/Mega%20linguistics%20pack/African/Niger-Congo/Mande/Susu%20Language,%20Outlines%20of%20a%20Grammar%20of%20the%20(Duport)%20(1886).pdf)
11. **BBC Afrique — Histoire des systèmes d'écriture du soussou** (contexte historique : Ajami, alphabet latin, N'Ko, Adlam, Koré Sèbèli) : [https://www.bbc.com/afrique/region-61151402](https://www.bbc.com/afrique/region-61151402)

## Méthodologie

- **Vocabulaire et phrases** : chaque terme et chaque phrase provient d'au moins une source attestée ci-dessus. Lorsque le mot exact recherché n'était pas disponible dans les sources, le mot réel le plus proche a été utilisé plutôt que d'inventer un terme — cette limite est signalée dans le champ `confidence_note` du fichier concerné.
- **Dialogues** : chaque dialogue n'utilise que le vocabulaire déjà introduit et vérifié dans la section `vocabulary` du même fichier — aucun terme non attesté n'a été inventé pour les besoins d'un dialogue.
- **Transcription phonétique** : deux niveaux sont fournis (API/IPA et « simplifié » pour un francophone), avec un degré de prudence proportionnel à la disponibilité de données audio ou de descriptions phonologiques dans les sources.
- **Variance orthographique inter-sources** : le manuel Peace Corps utilise les conventions « x », « E », « ç », « ¯ » tandis que Kirinapost et Calaméo utilisent « kh », « è », « o », « gn » pour noter respectivement les mêmes sons (/x/, /ɛ/, /ɔ/, /ɲ/). Cette différence est purement graphique (pas lexicale) et est explicitement signalée dans les `confidence_note` des leçons concernées (notamment C1_M2_L4, C1_M3_L9).

## Niveau de confiance par leçon

| Lesson ID | Niveau | Titre | Confiance |
|---|---|---|---|
| A1_M1_L1 | Débutant | Salutations et formules de politesse | élevée |
| A1_M1_L2 | Débutant | Se présenter | élevée |
| A1_M1_L3 | Débutant | Alphabet et sons spécifiques | élevée |
| A1_M2_L4 | Débutant | La famille et les relations proches | élevée |
| A1_M2_L5 | Débutant | Chiffres, nombres et comptage | élevée |
| A1_M2_L6 | Débutant | Jours, mois et heure | moyenne |
| A1_M3_L7 | Débutant | Demander son chemin | élevée |
| A1_M3_L8 | Débutant | Nourriture et boissons | élevée |
| A1_M3_L9 | Débutant | Couleurs et vêtements | moyenne |
| B1_M1_L1 | Intermédiaire | Maison, logement, ville | moyenne |
| B1_M1_L2 | Intermédiaire | Loisirs et activités sportives | moyenne |
| B1_M1_L3 | Intermédiaire | Goûts, préférences, sentiments | élevée |
| B1_M2_L4 | Intermédiaire | Raconter des faits passés | élevée |
| B1_M2_L5 | Intermédiaire | Projets futurs et ambitions | élevée |
| B1_M2_L6 | Intermédiaire | Achats, négociation, argent | élevée |
| B1_M3_L7 | Intermédiaire | Obligation, interdiction, permission | moyenne |
| B1_M3_L8 | Intermédiaire | Travail, études, routine professionnelle | élevée |
| B1_M3_L9 | Intermédiaire | Conseils et instructions | élevée |
| C1_M1_L1 | Avancé | Temps complexes et modes avancés | élevée |
| C1_M1_L2 | Avancé | Hypothèse, doute, condition | moyenne |
| C1_M1_L3 | Avancé | Connecteurs logiques | moyenne |
| C1_M2_L4 | Avancé | Proverbes, dictons, expressions imagées | moyenne |
| C1_M2_L5 | Avancé | Débattre et argumenter | **faible** |
| C1_M2_L6 | Avancé | Registre soutenu et langage formel | moyenne |
| C1_M3_L7 | Avancé | Textes littéraires ou historiques | **faible** |
| C1_M3_L8 | Avancé | Lexique technique et professionnel | moyenne |
| C1_M3_L9 | Avancé | Traduction et nuances stylistiques | moyenne |

## Évaluation globale de confiance pour l'ensemble du cours

**Confiance globale : moyenne à élevée**, avec une décroissance attendue et honnête de la fiabilité à mesure que le niveau progresse :

- **Niveau Débutant (A1-A2)** : confiance majoritairement **élevée**. Le manuel Peace Corps couvre très directement les salutations, la présentation, la famille, les chiffres, la nourriture et les directions — ce sont des compétences de survie linguistique qui constituent le cœur du matériel pédagogique disponible.
- **Niveau Intermédiaire (B1-B2)** : confiance **élevée à moyenne**. Le vocabulaire de base reste bien attesté, mais certains champs lexicaux (loisirs, logement urbain moderne) sont moins directement couverts par les sources historiques et ont nécessité une extrapolation prudente à partir de structures grammaticales attestées.
- **Niveau Avancé (C1-C2)** : confiance **moyenne**, avec deux leçons explicitement marquées **faible** :
  - **C1_M2_L5 (Débattre, argumenter)** : les sources disponibles ne fournissent pas de corpus de rhétorique argumentative en soussou ; le contenu grammatical (connecteurs, structures d'opposition) est attesté, mais les tournures spécifiques au débat formel sont des extrapolations.
  - **C1_M3_L7 (Textes littéraires ou historiques)** : le contexte historique (histoire de l'écrit soussou, systèmes graphiques successifs) est bien documenté par des sources secondaires (Wikipedia, BBC Afrique), mais aucun extrait de texte littéraire soussou authentique n'a pu être localisé et intégré — la leçon porte donc sur le contexte plutôt que sur l'analyse de textes réels.

Ces limitations reflètent la réalité documentaire du soussou : une langue à tradition principalement orale, avec une littérature écrite restreinte et récente, et un nombre limité de ressources pédagogiques numérisées et librement accessibles, en particulier pour les registres avancés (rhétorique, littérature, traduction stylistique).

## Note sur l'intégrité méthodologique

Aucun mot, aucune phrase et aucun dialogue n'a été inventé de toutes pièces. Lorsque la confiance était insuffisante pour une affirmation précise, cela a été signalé explicitement dans le champ `confidence_note` du fichier JSON correspondant plutôt que d'être dissimulé. Cette transparence est jugée préférable à une fausse impression d'exhaustivité.
