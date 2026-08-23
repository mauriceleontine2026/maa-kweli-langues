# RAPPORT_SOURCES — Konyanka (Koyaka / Konianké)

## 1. Résumé

27 fichiers JSON ont été produits pour le Konyanka, variété dialectale du Maninka/Malinké
(famille Mandé) parlée dans la région historique du Konyan, en Guinée forestière et Haute-Guinée
(zone Kissidougou / Guéckédou / Beyla / Kérouane), et rattachée par la littérature de
classification au continuum manding oriental. Les 27 fichiers respectent le schéma défini dans
`lesson_schema_brief.md` (validés individuellement par `python3 -m json.tool`, tous conformes :
27/27 valides, 0 échec) et couvrent les 3 niveaux × 3 modules × 3 leçons requis.

**Constat central, à annoncer honnêtement avant toute chose : il n'existe pas de lexique ou de
grammaire publiée et dédiée spécifiquement au "Konyanka"/"Koyaka" en tant que tel.** Les sources
académiques et institutionnelles (Ethnologue, Glottolog, SIL, Wikipédia) confirment son existence,
sa classification et sa localisation géographique, mais ne fournissent pas de corpus lexical
propre à cette variété. Le seul corpus linguistique directement étiqueté « konianké » que nous
avons pu localiser est un ensemble de proverbes et un conte publiés par l'association Donkosira
(région de Damaro, Guinée). Pour toutes les leçons où aucune donnée directement konianké
n'était disponible, le vocabulaire a été puisé dans le continuum maninka/malinké documenté
(intelligibilité mutuelle attestée par la littérature de classification), en le signalant
explicitement dans `confidence` et `confidence_note` de chaque fichier — conformément à la
consigne stricte : **ne jamais inventer de vocabulaire**.

## 2. Méthodologie

1. **Recherche de classification** : confirmation du statut du Konyanka comme variété
   dialectale du maninka de l'Est / continuum manding, de sa localisation (Konyan : Kissidougou,
   Guéckédou, Beyla, Kérouane, Nzérékoré) et des groupes ethniques associés (Koniankés) via
   Wikipédia, Glottolog et un rapport SIL sur les langues manding d'Afrique de l'Ouest.
2. **Recherche de corpus lexical dédié** : requêtes ciblées sur « Konyanka », « Kono-Konyanka »,
   « Kouranko-Konyan », les publications de Valentin Vydrin et l'équipe Mandenkan/LLACAN sur les
   dialectes du maninka guinéen, ainsi que le Peace Corps Guinée / Live Lingua Project. **Aucun
   manuel ou lexique n'a été trouvé qui traite spécifiquement et exclusivement du Konyanka** ;
   les manuels Peace Corps Guinée disponibles publiquement couvrent le maninka/malinké général,
   pas une variété konyanka isolée.
3. **Seule source directement « konianké »** trouvée et exploitée : Donkosira.org, qui documente
   des traditions orales de la région de Damaro (Guinée forestière) et cite des proverbes et un
   conte en konianké avec traduction française. Ces textes ont été utilisés **verbatim** (mots et
   phrases copiés tels quels depuis la source, non reformulés) dans les leçons C1_M2_L4
   (proverbes) et C1_M2_L6 (registre soutenu / conte), qui portent donc la confiance la plus
   élevée du corpus (« élevée »).
4. **Pour toutes les autres leçons** : vocabulaire et phrases dérivés du continuum maninka/malinké
   documenté (Malinkuia, An ka taa, Vydrin/Mandenkan, Omniglot, LLACAN), en indiquant
   explicitement dans `confidence_note` qu'il s'agit du continuum et non d'un lexique konyanka
   dédié. Les faits *spécifiquement* konyanka trouvés (localisation, groupes, ethnonymes,
   quelques traits phonétiques mentionnés par le rapport SIL) ont été placés dans les
   `cultural_notes` plutôt que fabriqués dans le vocabulaire.
5. **Cas de lexique technique/spécialisé (C1_M3_L8)** : même le continuum maninka/malinké large
   ne documente pas de lexique professionnel/technique moderne standardisé ; cette leçon porte
   donc la confiance « faible », avec un vocabulaire réduit à des équivalents attestés les plus
   proches (agriculture, santé traditionnelle) plutôt que des inventions.
6. **Cas de l'alphabet/sons spécifiques (A1_M1_L3)** : la description phonétique fine du Konyanka
   (distincte du maninka standard) n'est documentée que partiellement (rapport SIL, fr-academic) ;
   confiance « faible » également, la transcription API étant dérivée par analogie avec le
   maninka général plutôt que directement attestée pour le Konyanka.

## 3. Sources utilisées (liste consolidée, toutes citées avec URL dans les fichiers JSON)

| Source | URL | Usage |
|---|---|---|
| Wikipédia — Konyanka | https://fr.wikipedia.org/wiki/Konyanka | Classification, géographie, codes ISO/Glottolog |
| Wikipédia — Koniankés | https://fr.wikipedia.org/wiki/Koniank%C3%A9s | Peuple, préfectures de Beyla et Nzérékoré |
| Glottolog — Konyanka | (référencé dans les recherches ; classification confirmée via Wikipédia/SIL) | Classification linguistique |
| SIL — A preliminary report on the Manding languages of West Africa (ESR 2004) | https://www.sil.org/system/files/reapdata/14/59/48/145948244257781457010565651466861207020/silesr2004_005.pdf | Section dédiée au Konyanka : localisation, intelligibilité, traits |
| Langues de Guinée (fr-academic) | https://fr-academic.com/dic.nsf/frwiki/971120 | Répartition géographique, alphabet konia |
| Donkosira — Proverbes de Damaro (Guinée) | https://www.donkosira.org/proverbes-de-damaro-guinee/ | Proverbes konianké authentiques (verbatim) |
| Donkosira — Les contes dans la région de Damaro (Guinée) | https://www.donkosira.org/les-contes-dans-la-region-de-damaro-guinee/ | Conte et chant konianké authentiques (verbatim) |
| Malinkuia — Introduction à la langue malinké | https://fr.scribd.com/document/499114939/Malinkuia | Vocabulaire/grammaire de base du continuum (variété du Wulada, Haute-Guinée) |
| An ka taa — Maninka/Malinké greetings and phrases | https://www.ankataa.com/maninka-greetings-and-phrases | Salutations et phrases courantes du continuum |
| An ka taa — Yes/No and other essentials | https://www.ankataa.com/blog/2026/3/16/yes-no-and-other-essentials-in-maninka | Essentiels grammaticaux du continuum |
| Omniglot — Maninka numbers | https://www.omniglot.com/language/numbers/maninka.htm | Numération |
| Diané — Les couleurs en maninka, Mandenkan 48 (LLACAN/CNRS) | https://www.llacan.cnrs.fr/PDF/Mandenkan48/48Diane.pdf | Lexique des couleurs |
| Vydrin — Le TAM en maninka de Guinée, Mandenkan 70 (2023) | https://journals.openedition.org/mandenkan/pdf/3253 | Système temps-aspect-mode |
| Vydrin & Diané — L'interrogation en maninka de Guinée, Mandenkan 56 (2016) | https://journals.openedition.org/mandenkan/906 | Structures interrogatives |
| Vydrin & Diané — Propositions pour l'orthographe du maninka, Mandenkan 52 (2014) | https://shs.hal.science/halshs-01096594v1/document | Orthographe et transcription |

## 4. Distribution de confiance (27/27 fichiers)

| Confiance | Nombre de leçons | Leçons concernées |
|---|---|---|
| **Élevée** | 2 | C1_M2_L4 (proverbes — texte Donkosira verbatim), C1_M2_L6 (registre soutenu/conte — texte Donkosira verbatim) |
| **Moyenne** | 23 | Toutes les leçons Débutant restantes (7), toutes les leçons Intermédiaire (9), et la majorité des leçons Avancé (7 : C1_M1_L1-L3, C1_M2_L5, C1_M3_L7, C1_M3_L9, plus A1_M1_L1-L2) — vocabulaire fondé sur le continuum maninka/malinké documenté, faits spécifiquement konyanka réservés aux notes culturelles |
| **Faible** | 2 | A1_M1_L3 (alphabet/sons spécifiques — description phonétique konyanka fine non documentée), C1_M3_L8 (lexique technique/professionnel — absence de tout corpus, même continuum, sur ce registre) |

**Aucune leçon n'a été classée « élevée » sur la seule base du continuum malinké** : ce niveau de
confiance a été réservé strictement aux deux leçons où le contenu linguistique konianké est
directement attesté par une source de terrain nommément dédiée à cette variété (Donkosira).

## 5. Limites et transparence

- Le Konyanka ne dispose, à notre connaissance après recherche, d'aucun dictionnaire, grammaire
  de référence ou manuel Peace Corps qui le documente comme variété autonome et complète ; les
  27 leçons combinent donc (a) des données directement attestées konianké quand elles existent
  (2 leçons), et (b) des données du continuum maninka/malinké plus large, explicitement signalées
  comme telles dans chaque `confidence_note`, plutôt que du vocabulaire inventé.
- Les transcriptions phonétiques API (`phonetic_api`) sont dérivées par analogie avec le maninka
  standard documenté lorsque le mot lui-même provient du continuum ; elles ne prétendent pas
  refléter des particularités phonétiques konyanka non attestées dans nos sources.
- Toute affirmation culturelle ou géographique spécifique au Konyanka (localisation, groupes
  ethniques, pratiques) provient de sources vérifiées (Wikipédia, SIL, Donkosira) et est placée
  dans les `cultural_notes` des fichiers concernés.
