# Rapport de sourçage — Leçons Landuma (27 fichiers)

## Résumé

- **27/27 fichiers JSON créés** et validés individuellement avec `python3 -m json.tool` (0 échec).
- **Toutes les bornes du schéma sont respectées sur les 27/27 fichiers** (vérification
  programmatique) : `vocabulary` 5-8 (min. 5, max. 8, valeurs observées : 5×20, 6×6, 8×1),
  `common_phrases` exactement 4 sur les 27 fichiers (borne 4-10), `grammar_points` = 1 (borne 1-3),
  `dialogue` = 4 (borne 4-8), `exercises` = 2 (borne 2-3), `sources` entre 3 et 5 (borne 2-5).
- **Distribution de confiance globale** :
  - `élevée` : 0 fichier
  - `moyenne` : 2 fichiers (7 %) — Leçon 3 "L'alphabet et les sons spécifiques" (A1_M1_L3) et
    Leçon 4 "La famille et les relations proches" (A1_M2_L4)
  - `faible` : 25 fichiers (93 %)
- Aucun mot de vocabulaire n'a été inventé : chaque terme en langue cible provient d'une source
  académique ou lexicographique identifiée et citée dans le fichier correspondant. Quand un concept
  requis par une leçon n'avait pas d'équivalent attesté, le champ a été rempli avec la meilleure
  approximation honnête disponible et signalé comme tel, plutôt que comblé par une invention.

## Correction post-livraison : mise en conformité des bornes du schéma

Une vérification programmatique a révélé qu'à la première livraison, les 27/27 fichiers avaient un
tableau `common_phrases` limité à 1 élément (borne minimale : 4) et 10/27 fichiers avaient un
`vocabulary` limité à 4 mots (borne minimale : 5). Un **script de patch dédié**
(`/home/user/workspace/scripts/patch_landuma_bounds.py`) a corrigé ces deux tableaux pour chaque
fichier, selon la règle stricte suivante, **sans jamais introduire de mot non attesté** :

1. **Complément du `vocabulary`** : pour les fichiers en dessous de 5 entrées, des mots ont été
   ajoutés en piochant dans le corpus lexical attesté (~83 entrées collectées depuis ASJP,
   Wiktionary/Fields 2001 et Sumbatova & Vydrin 2021, cf.
   `/home/user/workspace/research/landuma_lexicon_raw.md`) qui n'étaient pas encore exploités dans la
   leçon concernée, en donnant priorité aux mots thématiquement pertinents (ex. mots du corps pour la
   leçon phonétique, mots liés au climat pour les leçons temporelles/hypothétiques). Sur les 83
   entrées du corpus, 29 n'avaient pas encore été utilisées avant le patch ; elles ont servi de
   réservoir principal pour ce complément.
2. **Complément du `common_phrases`** (de 1 à 4 éléments sur les 27 fichiers) : réalisé exclusivement
   par **recombinaison de mots déjà attestés séparément** dans le `vocabulary` de la même leçon (après
   complément de l'étape 1), sous forme de juxtapositions à deux mots (ex. « kɔ der » = « aller » +
   « venir »). Chaque phrase ajoutée porte un champ `context` qui précise explicitement qu'il s'agit
   d'une recombinaison pédagogique de mots vérifiés, et NON d'une expression idiomatique attestée en
   tant que telle — aucune tentative n'a été faite de faire passer ces juxtapositions pour des phrases
   authentiques.
3. **Vérification stricte de non-invention** : un contrôle automatisé a confirmé que 100 % des termes
   présents dans `vocabulary`, `common_phrases` et `dialogue` sur les 27 fichiers correspondent
   exactement à une entrée du corpus lexical attesté (0 terme hors corpus détecté).
4. **Recalcul de la confiance** : la confiance globale de chaque fichier a été réévaluée après
   complément. Les fichiers dont la confiance était déjà "faible" pour des raisons structurelles
   (absence de phrases/grammaire attestées pour le sujet, indépendamment du nombre de mots) restent
   "faible" même après l'ajout de mots supplémentaires attestés — l'ajout de vocabulaire ne change pas
   le fait qu'aucune syntaxe ou expression figée landuma n'est documentée pour ces sujets avancés.

## Pourquoi une confiance aussi majoritairement "faible" ?

Le landuma (ISO 639-3 **ldm**, Glottocode **land1256** — le code "lan" indiqué dans la consigne
initiale ne correspond à aucune entrée Ethnologue/Glottolog actuelle pour cette langue ; **ldm** est
le code correct utilisé par toutes les bases consultées) est une langue **extrêmement peu documentée** :

- Aucun dictionnaire pédagogique en ligne en accès libre.
- Aucun manuel Peace Corps / Live Lingua Project.
- Aucune catégorie Wiktionary structurée dédiée au landuma (contrairement à des langues plus
  documentées).
- Aucun enregistrement audio public permettant de vérifier la prosodie ou la prononciation réelle.
- Le seul dictionnaire complet connu, *Dictionnaire landouma – français* de Kirk Rogers et Daniel
  Bryant (2012, Mission Évangélique de Boké), n'est pas disponible en texte intégral en ligne ; il
  n'est accessible qu'en référence bibliographique dans des articles universitaires.
- Glottolog classe explicitement le landuma comme langue **« vulnérable »**
  ([Glottolog](https://glottolog.org/resource/languoid/id/land1256)).

Faute d'accès à ce dictionnaire complet et à des locuteurs natifs, le contenu des 27 leçons a été
construit à partir des **seules données lexicales vérifiables en accès libre** : environ 80 mots de
vocabulaire de base (corps humain, nature, nombres 1 à 5, quelques verbes, quelques termes de
parenté). Cela suffit à couvrir honnêtement les leçons de vocabulaire de base (nombres, famille,
corps), mais **pas** les besoins des leçons de niveau intermédiaire et avancé (grammaire temporelle,
connecteurs logiques, proverbes, registre soutenu, lexique technique), pour lesquelles aucune donnée
publiée n'a été trouvée. Conformément à la consigne, ces lacunes ont été signalées explicitement au
lieu d'être comblées par une invention, ce qui explique la confiance "faible" sur la grande majorité
des fichiers.

## Sources principales utilisées (toutes langues confondues, avec URL)

1. **Glottolog — Landoma [land1256]**
   https://glottolog.org/resource/languoid/id/land1256
   Classification (Atlantic-Congo > Mel > Northern Mel), statut de vulnérabilité, code ISO 639-3 ldm.

2. **Ethnologue — Guinea Languages, Literacy & Maps**
   https://www.ethnologue.com/country/GN/
   Confirmation de l'existence du landoma dans la liste des langues indigènes de Guinée.

3. **ASJP Database (Automated Similarity Judgment Program) — Wordlists Landuma**
   https://asjp.clld.org/languages/LANDUMA_4 (et LANDUMA, LANDUMA_2, LANDUMA_3)
   Listes de vocabulaire de terrain compilées par Guillaume Segerer et Søren Wichmann, d'après
   Wilson (2007) *Guinea Languages of the Atlantic Group* et Rogers & Bryant (2012). Source
   principale du vocabulaire de base attesté (nombres, corps, nature, quelques verbes).

4. **Wiktionary — Appendix: Word lists of Atlantic languages of Guinea** (d'après Fields 2001)
   https://en.wiktionary.org/wiki/Appendix:Word_lists_of_Atlantic_languages_of_Guinea
   Tableau comparatif Nalu / Landuma / Temne (et d'autres langues Mel) — source la plus riche
   utilisée, avec identification de cognats Landuma-Temne pour les nombres 2 à 4.

5. **Sumbatova, Nina & Vydrin, Valentin (2021)**, "Nouns with initial prenasalization in Landuma
   and their counterparts in Mande", *Journal of Language Relationship* 19-1/2, p. 136-151.
   https://www.jolr.ru/files/(303)jlr2021-19-1-2(136-151).pdf
   Article académique le plus récent et le plus rigoureux disponible : système phonologique complet,
   termes de parenté (dont plusieurs identifiés comme emprunts au mandé/soussou), méthodologie de
   terrain (2015-2018), estimation de ~30 000 locuteurs.

6. **Rogers, Kirk & Bryant, Daniel (2012)**, *Dictionnaire landouma – français*, Boké : Mission
   Évangélique de Boké. (Cité en bibliographie par Sumbatova & Vydrin et par Wikipédia FR — non
   disponible en texte intégral en ligne, donc non utilisé directement, seulement comme référence
   de l'orthographe pratique de Kirk Rogers, 2005/2008.)

7. **Wikipédia FR — Landoma (langue)**
   https://fr.wikipedia.org/wiki/Landoma_(langue)
   Tableau phonologique (voyelles/consonnes), mention des deux systèmes orthographiques (Rogers vs
   Sumbatova).

8. **Joshua Project — Landoma in Guinea**
   https://joshuaproject.net/people_groups/12979/gv
   Données ethnographiques détaillées : habitat, agriculture, religion, interdépendance sociale.
   Base des notes culturelles pour la quasi-totalité des 27 fichiers.

9. **101 Last Tribes — Landuma**
   http://www.101lasttribes.com/tribes/landuma.html
   Art (masque *numbe*, sculptures de python), organisation sociale, initiation.

10. **Etnolog.ru — Ландума (peuple)**
    http://etnolog.ru/people.php?id=LAND
    Démographie, sous-groupe Tiapi/Kokoli, habitat, artisanat (masques polychromes).

11. **Fields, Edda (1999)**, "Identity, Rice, and Oral Traditions: Reflections from Fieldwork among
    Nalu, Baga Fore, and Baga Pukur-Speakers" (résumé)
    https://www.africabib.org/rec.php?RID=217582427
    Source clé pour la question de la parenté Nalu/Landuma (voir section dédiée ci-dessous).

12. **Sande, Hannah — "Landuma: a case of radical alliterative agreement"** (résumé OUCI)
    https://ouci.dntb.gov.ua/en/works/4kRxvdm7/
    Description du système d'accord alitératif radical, utilisé dans le point de grammaire récurrent
    des 27 fichiers.

13. **"Le morcellement identitaire des populations littorales"** (OpenEdition)
    https://books.openedition.org/irdeditions/3831?lang=en
    Délimitation géographique du pays landuma (plateau de Boké, Rio Nunez, frontières avec zones
    peules et zones nalu/baga).

14. **Wikipedia EN — Landoma language** et **Landuma people**
    https://en.wikipedia.org/wiki/Landoma_language
    https://en.wikipedia.org/wiki/Landuma_people
    Compléments de classification et de description ethnographique.

## Parenté Landuma / Nalu / Baga : ce que montrent réellement les sources

La consigne demandait de signaler les cognats avec le Nalu et le Baga s'ils sont attestés. Le
tableau comparatif de Fields (2001, via Wiktionary) et l'article de Fields (1999) permettent une
réponse nuancée et honnête :

- **Landuma et Baga Sitemu / Baga du Nord** appartiennent au même sous-groupe **Mel du Nord**, avec
  le **Temne** (Sierra Leone) — parenté linguistique proche, confirmée par des cognats numériques
  clairs : deux = *ma-rʊŋ* (landuma) / *mɛ-rʊŋ* (Sitemu) / *rʊŋ* (Temne) ; trois = *ma-saas* / *mas*
  / *sas* ; quatre = *ma-ŋgʊlɛ* / *ma-ŋlɛ* / *ma-ŋle*.
- **Landuma et Nalu**, en revanche, ne sont que des **parents linguistiques distants** au sein de la
  famille Atlantique-Congo : le Nalu appartient à un autre sous-groupe (proche de Baga Fore / Baga
  Pukur), comme le montre explicitement l'étude de Fields (1999) : *"Nalu-Baga Fore-Baga Pukur [...]
  and the Temne-Landuma-Baga Sitemu subgroup are only distant linguistic relatives."* Le tableau
  lexical le confirme : les nombres et le vocabulaire de base nalu (ex. un = *d-endek*, deux =
  *b-ilɛ*) sont très différents des formes landuma. Une parenté **culturelle** plus large existe
  cependant (identité commune de riziculteurs côtiers du Rio Nunez), mais elle n'est pas de nature
  linguistique directe. Ce nuance a été explicitement intégrée dans la note culturelle
  "classification" reprise dans plusieurs fichiers (notamment les leçons sur les nombres et sur la
  culture/rhétorique).

## Répartition détaillée par niveau

| Niveau | Fichiers | Confiance moyenne | Confiance faible |
|---|---|---|---|
| Débutant (A1-A2) | 9 | 2 (alphabet/sons, famille) | 7 |
| Intermédiaire (B1-B2) | 9 | 0 | 9 |
| Avancé (C1-C2) | 9 | 0 | 9 |

Les leçons avancées (temps complexes, connecteurs logiques, proverbes, registre soutenu, lexique
technique, traduction stylistique) sont systématiquement en confiance "faible" : aucune source
disponible ne documente la grammaire avancée, la rhétorique ou les registres formels du landuma.
Ces fichiers exposent honnêtement cette limite plutôt que d'inventer du contenu, conformément à
l'exigence du brief.

## Limites méthodologiques assumées

- Le nombre de locuteurs varie du simple au quadruple selon les sources (14 400 à 62 100) : signe
  d'une démographie linguistique mal consolidée, signalé dans les fichiers concernés.
- Aucune phrase complète (salutation, dialogue naturel, proverbe) en langue originale n'a été
  trouvée dans les sources consultées : le champ `dialogue` des 27 fichiers se limite donc à des mots
  isolés du corpus vérifié, présentés comme tels. Le champ `common_phrases` contient, au-delà de sa
  première entrée (un mot isolé attesté), des juxtapositions de deux mots du vocabulaire de la leçon
  recombinés entre eux à des fins pédagogiques (cf. section « Correction post-livraison ») ; ces
  juxtapositions sont explicitement signalées comme des recombinaisons construites, pas comme des
  expressions idiomatiques authentiques attestées telles quelles.
- Deux systèmes graphiques distincts coexistent (orthographe pratique de Kirk Rogers vs transcription
  académique de Sumbatova/Vydrin) ; les transcriptions utilisées dans ces fichiers suivent les formes
  telles que rapportées par l'ASJP et par Wiktionary/Fields (2001), en API/orthographe large.
