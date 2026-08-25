# Rapport des sources — Leçons de Guerzé (Kpèlè de Guinée forestière)

## Langue documentée

**Nom local :** Kpèlè / Kpelle (autonyme) — appelé **Guerzé** en français de Guinée.
**Code ISO 639-3 :** `gkp` (Guinea Kpelle), distinct de `xpe` (Liberia Kpelle / Kpelle du Libéria).
**Famille :** Mandé du Sud (branche Mande, groupe Mandé-Sud, sous-groupe Manding-Kpelle).
**Zone :** Région forestière de Guinée, autour de N'Zérékoré (préfectures de N'Zérékoré, Yomou, Lola, Macenta).

Ce projet documente 27 leçons progressives (niveaux A1-A2, B1-B2, C1-C2) entièrement fondées sur des données linguistiques attestées, sans invention de vocabulaire ni de phrases.

## Sources principales

1. **Konoshenko, Maria (2019). « Dictionnaire kpele de la Guinée (guerzé) – français avec un index français-kpele ». *Mandenkan*, n° 62, p. 3-164.**
   URL : https://llacan.cnrs.fr/PDF/Mandenkan62/62konoshenko.pdf
   — **SOURCE PRIMAIRE ET PRINCIPALE** de tout le vocabulaire, des phrases d'exemple, des tableaux grammaticaux (marqueurs prédicatifs, constructions prédicatives), des proverbes et des notes culturelles utilisés dans les 27 leçons. Ce dictionnaire scientifique, publié dans la revue *Mandenkan* (revue de linguistique mandingue du LLACAN-CNRS), est la description lexicographique la plus récente et la plus rigoureuse du guerzé de Guinée, fondée sur un travail de terrain de l'auteure.
   Also indexé sur : https://journals.openedition.org/mandenkan/2091

2. **Wikipédia (français) — « Guerzé (langue) »**
   URL : https://fr.wikipedia.org/wiki/Guerze
   — Utilisé pour la classification générale, la localisation géographique et des informations de contexte sociolinguistique.

3. **Wikipedia (anglais) — « Kpelle language »**
   URL : https://en.wikipedia.org/wiki/Kpelle_language
   — Utilisé en complément pour la classification et les informations générales sur la famille Mandé-Sud.

4. **Glottolog — « Guinea Kpelle » [guin1254]**
   URL : https://glottolog.org/resource/languoid/id/guin1254
   — Référence de classification linguistique académique (identifiant de languoïde, bibliographie).

5. **Glottolog — références sur la grammaire kpelle (travaux de William E. Welmers)**
   URL : https://glottolog.org/resource/reference/id/94648
   — Welmers, *A Grammar of Kpelle*, reste la référence académique historique pour la description grammaticale de la branche kpelle ; citée en complément pour la validation du système aspecto-modal (niveau C1, Module 1).

6. **Languages and Numbers — « How to count in Kpelle »**
   URL : https://www.languagesandnumbers.com/how-to-count-in-kpelle/en/kpe/
   — Utilisé en recoupement pour les chiffres et nombres (Leçon A1_M2_L5), en complément de Konoshenko (2019).

## Source secondaire (comparative uniquement — jamais utilisée comme source primaire)

7. **Thach, S. & Dwyer, D. (1981). *Kpelle: A Reference Handbook*. Peace Corps Liberia / Live Lingua Project.**
   URL : https://files.eric.ed.gov/fulltext/ED217690.pdf
   — **AVERTISSEMENT IMPORTANT :** ce manuel documente le kpelle du **Libéria** (code ISO `xpe`), une variété apparentée mais **distincte** du guerzé de Guinée (`gkp`) selon Konoshenko elle-même (2019, p. 5), qui souligne que les deux variétés sont suffisamment différentes pour être considérées comme des langues séparées au sein du même groupe. Ce manuel n'a été consulté qu'à titre de **référence comparative** pour orienter la recherche initiale ; **aucun mot ni phrase de ce manuel n'a été utilisé directement** dans les 27 leçons produites — tout le contenu provient de Konoshenko (2019), qui documente spécifiquement le guerzé de Guinée.

## Méthodologie et garanties de fidélité

- **Aucun mot ni aucune phrase n'a été inventé.** Chaque terme de vocabulaire, chaque phrase d'exemple, chaque élément de dialogue et chaque proverbe cité dans les 27 fichiers JSON provient directement du dictionnaire de Konoshenko (2019), avec sa traduction française originale, sauf indication contraire explicite dans le champ `confidence_note` de la leçon concernée.
- Les phrases de dialogue combinent parfois plusieurs éléments lexicaux attestés séparément dans le dictionnaire pour créer un échange naturel ; dans ce cas, la leçon le signale honnêtement dans son `confidence_note` (confiance qualifiée de « moyenne » plutôt que « élevée »).
- Le champ `phonetic_api` reprend la notation tonale et phonémique utilisée par Konoshenko (2019) elle-même (tons marqués par accents : á haut, à bas, â descendant, ǎ montant ; consonnes spécifiques ɓ, ɠ, ŋ, kp, gb, hw, etc.).
- Une seule leçon (**C1_M3_L8**, lexique technique/professionnel) est notée en confiance **« faible »**, car le dictionnaire de référence ne documente que quelques emprunts techniques (voiture, téléphone, école, hôpital) et ne couvre pas la terminologie informatique ou médicale moderne ; ceci est signalé explicitement plutôt que de combler ce vide par une invention.

## Répartition de la confiance globale (27 leçons)

| Niveau de confiance | Nombre de leçons |
|---|---|
| Élevée | 15 |
| Moyenne | 11 |
| Faible | 1 |

**Confiance globale du corpus : moyenne à élevée.** La très grande majorité du vocabulaire de base, des formules courantes, de la grammaire (système des marqueurs prédicatifs), des proverbes et des notes culturelles repose directement sur une source académique unique mais rigoureuse et récente (Konoshenko 2019). Les points de vigilance principaux concernent : (1) le lexique technique/professionnel moderne, insuffisamment documenté dans les sources disponibles ; (2) certains dialogues de mise en situation (niveau C1 notamment : débat, registre cérémoniel), qui combinent des éléments lexicaux attestés séparément dans une mise en scène pédagogique composée, faute de transcriptions naturelles complètes disponibles sur ces thèmes précis dans la littérature existante.

## Avertissement sur la variation dialectale

Konoshenko (2019) elle-même signale une variation dialectale interne au guerzé de Guinée (dialectes notés « gb » et « s » dans le dictionnaire). Certaines leçons présentent donc plusieurs variantes attestées pour un même mot (par exemple hɔ́ɔnŋ / hɔ́ŋ (gb) / háŋuŋ (s) pour « proverbe »), fidèlement reproduites telles que documentées dans la source.
