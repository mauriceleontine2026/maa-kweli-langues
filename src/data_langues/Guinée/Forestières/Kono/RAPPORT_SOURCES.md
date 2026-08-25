# Rapport de sourçage — Cours de Kono (Guinée forestière)

## ⚠️ Découverte critique : erreur de code ISO dans la prémisse de la commande

La commande initiale demandait de traiter le « Kono de Guinée » avec le **code ISO 639-3 « kno »**, en précisant explicitement de ne pas le confondre avec le Kono de Sierra Leone (code « knu »). **Cette prémisse est factuellement inversée.** La vérification croisée de plusieurs sources faisant autorité montre que :

| | Kono de **Guinée** | Kono de **Sierra Leone** |
|---|---|---|
| Code ISO 639-3 correct | **knu** | **kno** |
| Classification | Mandé du Sud-Ouest, proche du Kpelle/Guerzé et du Manya/Maninka | Groupe Vaï-Kono, Mandé central — langue distincte |
| Région | **Préfecture de Lola**, région de N'Zérékoré (Guinée forestière) | Sierra Leone (district de Kono) |
| Locuteurs (ordre de grandeur) | ≈ 90 000 | ≈ 341 000 |
| Proximité lexicale | ≈ 90 % de cognats avec le Kpelle/Guerzé (Konoshenko 2017) | Langue distincte, pas de cognats significatifs avec le Kpelle |

Sources ayant permis cette clarification :
- Konoshenko, M. (2017), *Field Notes on Kono, a Southwestern Mande Lect of Forest Guinea*, Mandenkan 57, pp. 77-107 — https://llacan.cnrs.fr/PDF/Mandenkan57/konoshenko57.pdf (l'article lui-même précise explicitement la distinction dans son résumé)
- Glottolog, fiche « Kono (Guinea) », knu — https://glottolog.org/resource/languoid/id/kono1267
- Glottolog, fiche « Kono (Sierra Leone) », kno — https://glottolog.org/resource/languoid/id/kono1268
- Ethnologue, page pays Guinée — https://www.ethnologue.com/country/GN/
- Wikipédia (FR), « Kono (langue de Guinée) » — https://fr.wikipedia.org/wiki/Kono_(langue_de_Guin%C3%A9e)
- Wikipédia (FR), « Kono (langue de Sierra Leone) » — https://fr.wikipedia.org/wiki/Kono_(langue_de_Sierra_Leone)

**Autre précision géographique** : la préfecture de **Beyla**, mentionnée dans la commande initiale, correspond en réalité à la zone du **Konianké/Maninka** (une autre langue mandée), et non au Kono. La région historique du Kono de Guinée est la préfecture de **Lola**.

**Décision méthodologique** : conformément à l'intention réelle de la commande (« Guinée forestière », volonté explicite de traiter la langue du groupe ethnique Kono de Guinée et non celui de Sierra Leone), le contenu des 27 leçons **cible la langue Kono de Guinée (code ISO correct : knu)**. Le champ `"lesson_id"` ne contient pas le code ISO, donc aucune correction de fichier n'était nécessaire à ce niveau ; cette clarification bibliographique est documentée ici et dans les métadonnées `sources`/`confidence_note` de chaque leçon.

---

## Sources utilisées

1. **Konoshenko, M. (2017)**, *Field Notes on Kono, a Southwestern Mande Lect of Forest Guinea*, Mandenkan 57, pp. 77-107. https://llacan.cnrs.fr/PDF/Mandenkan57/konoshenko57.pdf
   Source académique principale : liste Swadesh de 100 mots, paradigmes pronominaux, système TAM (temps-aspect-mode), tons, exemples de salutations et de phrases attestées sur le terrain pour le Kono de Guinée.
2. **Konoshenko, M. (2019/2020)**, *Dictionnaire kpele de la Guinée (guerzé) – français*, Mandenkan 62. https://journals.openedition.org/mandenkan/2091
   Dictionnaire académique de référence (≈3000 entrées) pour le Kpelle/Guerzé de Guinée, langue mandée du sud-ouest la plus proche du Kono (≈90 % de cognats lexicaux), utilisé avec prudence comme source supplétive.
3. **Glottolog**, fiche « Kono (Guinea) » — https://glottolog.org/resource/languoid/id/kono1267
4. **Glottolog**, fiche « Kono (Sierra Leone) » — https://glottolog.org/resource/languoid/id/kono1268
5. **Ethnologue**, langues indigènes de la République de Guinée — https://www.ethnologue.com/country/GN/
6. **Wikipédia (FR)**, « Kono (langue de Guinée) » — https://fr.wikipedia.org/wiki/Kono_(langue_de_Guin%C3%A9e)
7. **Wikipédia (FR)**, « Kono (langue de Sierra Leone) » — https://fr.wikipedia.org/wiki/Kono_(langue_de_Sierra_Leone)
8. **Wikipédia (FR)**, « Kpèllé (langue) » — https://fr.wikipedia.org/wiki/Kp%C3%A8ll%C3%A9_(langue)

---

## Fichiers produits

**27 fichiers JSON** ont été générés dans `/home/user/workspace/output/Kono/`, respectant exactement l'arborescence et les noms de fichiers demandés (y compris la casse des extensions : 26 fichiers en `.JSON` majuscule, 1 fichier — la Leçon 1 du niveau A1 Module 1 — en `.Json` casse mixte).

Tous les fichiers ont été validés individuellement avec `python3 -m json.tool` : **27/27 valides**, aucune erreur de syntaxe. Chaque fichier respecte également les contraintes de schéma imposées (5-8 entrées de vocabulaire, 4-10 phrases courantes, 1-3 points de grammaire, 4-8 lignes de dialogue, 2-3 exercices, champ `sources` non vide, `confidence` ∈ {élevée, moyenne, faible}).

## Niveau de confiance par leçon

| Leçon | Sujet | Confiance | Justification synthétique |
|---|---|---|---|
| A1_M1_L1 | Salutations et politesse | élevée | Formules directement attestées dans Konoshenko (2017) + 2 formules kpele signalées |
| A1_M1_L2 | Se présenter | élevée | Pronoms, structure de base attestés dans le corpus Kono |
| A1_M1_L3 | Alphabet et sons | élevée | Système phonologique/tonal directement documenté par Konoshenko (2017) |
| A1_M2_L4 | Famille | moyenne | Lexique de parenté peu documenté en Kono, appui sur le Kpelle apparenté |
| A1_M2_L5 | Chiffres | élevée | Système numéral attesté dans la liste Swadesh du Kono |
| A1_M2_L6 | Jours/heure | moyenne | Peu de lexique calendaire Kono publié, appui partiel sur le Kpelle |
| A1_M3_L7 | Directions | moyenne | Verbes de mouvement attestés, lexique spatial complété via le Kpelle |
| A1_M3_L8 | Nourriture/marché | moyenne | Lexique alimentaire partiellement attesté, complété via le Kpelle |
| A1_M3_L9 | Couleurs/vêtements | moyenne | Peu de couleurs attestées en Kono propre, appui sur le Kpelle |
| B1_M1_L1 | Maison/logement/ville | moyenne | Lexique du bâti peu documenté, structures grammaticales extrapolées |
| B1_M1_L2 | Loisirs/sport | moyenne | Lexique des loisirs quasi absent des sources, fortement complété via le Kpelle |
| B1_M1_L3 | Goûts/sentiments | moyenne | Verbes de sentiment partiellement attestés, complétés via le Kpelle |
| B1_M2_L4 | Passé/récit | élevée | Système TAM du passé directement documenté dans Konoshenko (2017) |
| B1_M2_L5 | Futur/ambitions | élevée | Marqueur de futur wɛɛ̀́ directement attesté dans le corpus Kono |
| B1_M2_L6 | Achats/prix | moyenne | Lexique commercial peu attesté, complété via le Kpelle |
| B1_M3_L7 | Obligation/interdiction | moyenne | Modalité attestée partiellement, structures complétées par analogie |
| B1_M3_L8 | Travail/routine | moyenne | Lexique professionnel peu documenté, largement complété via le Kpelle |
| B1_M3_L9 | Conseils/instructions | moyenne | Impératif attesté, lexique des conseils complété via le Kpelle |
| C1_M1_L1 | Temps complexes/modes avancés | faible | Aucune attestation de subordination complexe en Kono ; extrapolation grammaticale prudente |
| C1_M1_L2 | Hypothèse/condition | faible | Constructions conditionnelles non attestées en Kono ; extrapolation à partir de la typologie mandée |
| C1_M1_L3 | Connecteurs logiques | faible | Peu de connecteurs discursifs complexes attestés ; extrapolation |
| C1_M2_L4 | Proverbes | faible | Aucun corpus de proverbes Kono publié disponible ; contenu illustratif prudent |
| C1_M2_L5 | Débattre/argumenter | moyenne | Vocabulaire d'opinion partiellement attesté via le Kpelle |
| C1_M2_L6 | Registre soutenu/cérémonies | moyenne | Marques de politesse/pluriel de respect attestées, contexte cérémoniel extrapolé |
| C1_M3_L7 | Textes littéraires/historiques | élevée | Porte sur des faits bibliographiques et méthodologiques directement vérifiés |
| C1_M3_L8 | Lexique technique/professionnel | faible | Aucun lexique technique Kono documenté ; stratégie de circonlocution construite |
| C1_M3_L9 | Traduction/nuances stylistiques | moyenne | Phénomènes grammaticaux (ton, aspect) attestés, réflexion traductologique construite pour le cours |

### Synthèse
- **Confiance élevée** : 7 leçons (26 %) — essentiellement les fondamentaux directement attestés dans Konoshenko (2017) : salutations, pronoms, phonologie, chiffres, système TAM du passé et du futur, et la leçon bibliographique/méthodologique C1_M3_L7.
- **Confiance moyenne** : 14 leçons (52 %) — lexique thématique (famille, nourriture, maison, loisirs, travail, etc.) où le Kono documenté est insuffisant et où le Kpelle de Guinée (langue sœur à ≈90 % de cognats) a été utilisé comme source supplétive, signalée explicitement dans chaque `confidence_note`.
- **Confiance faible** : 6 leçons (22 %) — essentiellement des points de grammaire avancée (subordination, hypothèse, connecteurs), le lexique technique/professionnel et les proverbes, pour lesquels aucune source disponible ne documente le Kono ni le Kpelle de façon suffisante ; le contenu a été construit par extrapolation prudente à partir de la typologie mandée générale, signalée comme telle.

**Confiance globale du corpus : MOYENNE.** Le socle grammatical et lexical de base du Kono de Guinée repose sur une source académique solide et récente (Konoshenko 2017), mais cette source demeure unique et limitée en volume (30 pages), ce qui contraint fortement les niveaux intermédiaire et avancé à s'appuyer sur la langue sœur Kpelle ou sur l'extrapolation typologique. Aucune leçon ne repose sur des données inventées sans base linguistique justifiée ; chaque niveau de confiance et chaque source sont documentés de façon transparente dans le champ `confidence_note` de chaque fichier JSON.

---

## Fichiers générés (27/27)

Tous situés sous `/home/user/workspace/output/Kono/` :

**Niveau Débutant (A1 - A2)**
- Module 1  Les bases de la communication : Leçons 1 (`.Json`), 2, 3
- Module 2  Le quotidien et l'entourage : Leçons 4, 5, 6
- Module 3  Besoins immédiats : Leçons 7, 8, 9

**Niveau Intermédiaire (B1 - B2)**
- Module 1  Exprimer ses idées et son environnement : Leçons 1, 2, 3
- Module 2  Le temps et le récit : Leçons 4, 5, 6
- Module 3  Interactions sociales et professionnelles : Leçons 7, 8, 9

**Niveau Avancé (C1 - C2)**
- Module 1  Nuances et complexité : Leçons 1, 2, 3
- Module 2  Culture, traditions et rhétorique : Leçons 4, 5, 6
- Module 3  Maîtrise totale : Leçons 7, 8, 9

Toutes les extensions respectent exactement la casse demandée (26 × `.JSON`, 1 × `.Json`), et tous les fichiers ont été validés avec succès via `python3 -m json.tool`.
