# Rapport des sources — Pack de leçons Bassari (Oniyan, ISO 639-3 « bsc »)

## 1. Présentation de la langue

Le **bassari**, dont les locuteurs se désignent eux-mêmes **Ɓëliyan** (le peuple) et **oniyan/ɔnə́yan** (la langue) — « Bassari » étant un exonyme — est une langue de la famille Niger-Congo, branche atlantique, groupe **Tenda** (avec le bedik et le konyagi), parlée à cheval entre le Sénégal oriental (départements de Bandafassi, Salémata, zone d'Éthiolo) et la Guinée (région de Koundara), selon [Glottolog](https://glottolog.org/resource/languoid/id/bass1258) et [Wikipédia (Bassari, langue)](https://fr.wikipedia.org/wiki/Bassari_(langue)). Le nombre de locuteurs est estimé entre 15 000 et 30 000 personnes selon les sources, avec environ 10 000 Ɓëliyan recensés au Sénégal. La langue présente plusieurs dialectes (ane, këɗ, oxalac) ; la description grammaticale de référence (SIL) documente principalement la variété **ane**.

C'est une langue **très rare et peu documentée** : aucun dictionnaire exhaustif librement accessible en texte intégral n'a pu être consulté dans le cadre de cette recherche, hormis les grammaires descriptives ci-dessous.

## 2. Sources utilisées

| Source | Auteur / Éditeur | URL |
|---|---|---|
| A Grammar of Oniyan | SIL — Winters, J. & Winters, P. (2004) | https://www.sil.org/system/files/reapdata/18/63/15/1863153183176772870767650622005357320/BSC_Oniyan_grammar_En_2004.pdf |
| Orthographe Oniyan (Bassari Phonology) | SIL (2003) | https://www.sil.org/system/files/reapdata/13/27/28/132728046882691513259738660939179774460/BSC_Orthographe_Oniyan_Fr_2003.pdf |
| Description grammaticale du basari (oniyan) | Guillaume Ségerer, INALCO/LLACAN | https://books.openedition.org/pressesinalco/pdf/36937 |
| Bassari (langue) | Wikipédia FR | https://fr.wikipedia.org/wiki/Bassari_(langue) |
| Bassari language | Wikipedia EN | https://en.wikipedia.org/wiki/Bassari_language |
| Bassari-Tanda | Glottolog | https://glottolog.org/resource/languoid/id/bass1258 |
| Bassari Country: Bassari, Fula and Bedik Cultural Landscapes | UNESCO (inscription 2012) | https://whc.unesco.org/en/list/1407/ |
| Pays bassari | Wikipédia FR | https://fr.wikipedia.org/wiki/Pays_bassari |
| Thesaurus tenda (1991) | Marie-Paule Ferry — référencé via bibliographie, **non consulté en texte intégral** | https://senelangues.huma-num.fr/pdf/BiblAtl.pdf |

Les deux grammaires SIL et l'analyse INALCO constituent le socle du pack : elles fournissent l'essentiel de la phonologie, de la morphologie (classes nominales, système TAM, négation, impératif, numération) et de quelques dizaines de phrases-exemples traduites, qui ont servi de base à toutes les leçons. Les travaux de Marie-Paule Ferry (chercheuse ayant le plus publié sur le bassari : 1968, 1971, 1972, 1981, et le *Thesaurus tenda* de 1991) sont cités comme référence bibliographique de premier plan, mais n'ont pas pu être consultés en texte intégral dans le cadre de cette recherche — leur accès aurait vraisemblablement permis de combler une bonne partie des lacunes lexicales signalées ci-dessous.

## 3. Méthodologie de sourçage et de confiance

Conformément à la consigne, **aucun mot de vocabulaire n'a été inventé**. Chaque terme, phrase ou règle grammaticale provient directement d'un exemple attesté dans les sources citées, ou constitue une **application régulière d'une règle grammaticale attestée** (par exemple, la formation d'un futur en `-ɗ` appliquée à un verbe déjà attesté par ailleurs). Cette distinction est systématiquement précisée dans le champ `confidence_note` de chaque leçon.

Trois niveaux de confiance ont été utilisés :
- **Élevée** : vocabulaire et règles directement attestés et corroborés par au moins deux sources indépendantes convergentes.
- **Moyenne** : règles grammaticales bien attestées combinées à des exemples partiellement reconstruits par application régulière de ces règles, ou vocabulaire attesté dans une seule source robuste.
- **Faible** : champ lexical largement ou totalement absent des sources disponibles (couleurs secondaires, vêtements, calendrier, métiers modernes, lexique technique/juridique, proverbes, formules cérémonielles) ; la leçon s'appuie alors sur le mot ou la structure la plus proche réellement attestée, avec mention explicite de la lacune plutôt qu'une invention.

### Principales lacunes lexicales documentées honnêtement
- Aucune formule figée de salutation (« bonjour », « merci », « au revoir ») n'est attestée dans les sources — la grammaire SIL signale elle-même l'absence d'une section dédiée aux salutations.
- Aucun nom de couleur autre que rouge, noir et blanc n'a été trouvé.
- Aucun vocabulaire des vêtements modernes, des mois du calendrier, des jours de la semaine, des métiers modernes, du lexique technique/juridique/professionnel, ni des proverbes traditionnels n'a pu être vérifié.
- Le vocabulaire de la nourriture/boissons se limite à une seule expression attestée (« Sel ke », j'ai soif).

## 4. Distribution de confiance sur les 27 leçons

| Confiance | Nombre de leçons |
|---|---|
| Élevée | 2 |
| Moyenne | 12 |
| Faible | 13 |
| **Total** | **27** |

Les deux leçons à confiance élevée portent sur les domaines les plus richement documentés dans les sources SIL/INALCO : la phonologie/alphabet (A1 M1 L3) et le système numérique complet (A1 M2 L5). Les leçons à confiance faible concernent presque toutes des champs lexicaux modernes ou culturellement spécifiques (couleurs/vêtements, nourriture, calendrier, directions, lexique professionnel/technique, proverbes, registre cérémoniel) pour lesquels la documentation académique disponible ne fournit pas de vocabulaire dédié.

## 5. Structure du pack

27 fichiers JSON répartis en 3 niveaux (Débutant A1-A2, Intermédiaire B1-B2, Avancé C1-C2), chacun composé de 3 modules de 3 leçons, conformément au schéma défini dans `lesson_schema_brief.md`. Chaque fichier a été validé syntaxiquement avec `python3 -m json.tool` et vérifié programmatiquement pour la conformité structurelle (présence de tous les champs requis, nombre d'éléments dans les bornes attendues pour `vocabulary`, `common_phrases`, `grammar_points`, `dialogue`, `exercises`).

## 6. Recommandation pour approfondir

Pour combler les lacunes identifiées, la ressource la plus prometteuse serait le **Thesaurus tenda** de Marie-Paule Ferry (1991), dictionnaire ethnolinguistique consacré au bassari, au bedik et au konyagi, qui n'a pas pu être consulté en texte intégral dans le cadre de cette recherche. Une enquête de terrain auprès de locuteurs natifs (région de Kédougou/Sénégal ou Koundara/Guinée) permettrait également de vérifier et d'enrichir les champs lexicaux modernes totalement absents de la documentation académique disponible en ligne.
