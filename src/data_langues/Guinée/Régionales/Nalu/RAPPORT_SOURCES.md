# Rapport de sourçage — Leçons de Nalu (naj)

## Résumé exécutif

Ce rapport documente les sources utilisées et le niveau de confiance global pour les 27 leçons
JSON produites pour le **nalu** (code ISO 639-3 `naj`, Glottolog `nalu1240`), langue atlantique de
la branche Mel/Nord parlée en Guinée (préfecture de Boké, notamment les îles Tristão, la rive nord
du fleuve Nunez et la région de Kanfarandé/Kamsar) et, dans une moindre mesure, en Guinée-Bissau
(estuaire du Cacine, région de Tombali).

**Le nalu est une langue extrêmement rare et sous-documentée.** Aucun dictionnaire complet,
aucune grammaire pédagogique, aucun manuel Peace Corps/Live Lingua, et aucun corpus de proverbes
n'existe à ce jour dans la littérature accessible. La quasi-totalité du contenu linguistique
vérifiable provient des travaux de terrain de la linguiste **Frauke Seidel**, complétés par
quelques listes lexicales comparatives et les notices encyclopédiques standard (Glottolog,
Wikipédia). Conformément à la consigne, **aucun mot ni aucune phrase n'a été inventé** : chaque
entrée de vocabulaire, chaque phrase et chaque réplique de dialogue provient d'une source citée,
et le champ `confidence` (+ `confidence_note`) signale honnêtement chaque lacune documentaire.

## Sources utilisées (ensemble du corpus)

| Source | URL |
|---|---|
| Seidel, F. (2024) « Nalu », chapitre in *The Oxford Guide to the Atlantic Languages of West Africa*, Oxford University Press | https://academic.oup.com/book/59850/chapter/511378992 |
| Seidel, F. (2011) « Documenting Nalu – an Atlantic Language on the Coast of Guinea », CASRR, University of Florida | https://africa.ufl.edu/wp-content/uploads/sites/205/CASRR2011.Seidel.pdf |
| Seidel, F. (2012-13) « Language Documentation of Nalu in Guinea, West Africa », CASRR, University of Florida | https://africa.ufl.edu/wp-content/uploads/sites/258/CASRR12-13-Seidel.pdf |
| Wiktionary, « Appendix:Word lists of Atlantic languages of Guinea » (d'après Fields 2001, 2008) | https://en.wiktionary.org/wiki/Appendix:Word_lists_of_Atlantic_languages_of_Guinea |
| Wikipedia (EN), « Nalu language » | https://en.wikipedia.org/wiki/Nalu_language |
| Wikipédia (FR), « Nalu (langue) » | https://fr.wikipedia.org/wiki/Nalu_(langue) |
| Glottolog 5.3, « Nalu » (nalu1240 / naj) | https://glottolog.org/resource/languoid/id/nalu1240 |
| Creissels, D. « Noun class systems in Atlantic languages » | http://www.deniscreissels.fr/public/Creissels-noun_classes_Atl.pdf |

**Source principale (utilisée dans les 27 fichiers) :** Seidel (2024), *The Oxford Guide to the
Atlantic Languages of West Africa* — c'est de loin la description la plus riche et la plus récente
du nalu disponible, incluant grammaire, phonologie, morphologie verbale (système TAM, extensions),
et un nombre significatif de phrases d'exemple issues de récits de vie et de contes recueillis sur
le terrain.

**Ethnologue** (`https://www.ethnologue.com/language/naj/`) a été consulté lors de la phase de
recherche initiale pour confirmer le code ISO, le statut de vitalité et la localisation
géographique de la langue, mais n'a fourni aucune donnée lexicale ou grammaticale distincte
exploitable dans les leçons elles-mêmes ; il n'apparaît donc pas dans le champ `sources` des
fichiers, conformément à la règle de ne citer que les sources réellement utilisées par fichier.

## Note sur le Landuma et le Baga

Le brief demandait de signaler toute comparaison avec le Landuma et le Baga si des cognats étaient
attestés. Les recherches menées (notamment le tableau comparatif de Fields 2001/2008 repris par
Wiktionary) montrent que le **nalu et le landuma partagent la même branche Mel/Nord mais ont des
racines lexicales de base largement différentes** — par exemple « un » : nalu *d-endek* vs landuma
*iin* ; « eau » : nalu *ngɔl* vs landuma *da-mun*. Le nalu apparaît génétiquement plus proche du
Mbulungish/Baga Foré que du Landuma proprement dit. **Aucun cognat direct exploitable en leçon n'a
été identifié** entre nalu et landuma/baga dans les sources consultées ; cette absence de cognats
est donc traitée comme une non-découverte plutôt que comme une comparaison positive, et aucune
leçon ne présente le nalu comme un « dialecte » du landuma ou du baga.

## Distribution de la confiance (27 fichiers)

| Confiance | Nombre de fichiers | Pourcentage |
|---|---|---|
| **Élevée** | 0 | 0 % |
| **Moyenne** | 10 | 37 % |
| **Faible** | 17 | 63 % |

Aucun fichier n'atteint le niveau « élevée », ce qui reflète fidèlement l'état réel de la
documentation du nalu : même les points les mieux attestés (système temporel/aspectuel verbal,
vocabulaire de base, quelques dizaines de phrases d'exemple) reposent sur un corpus de terrain
limité produit par une seule chercheuse, sans dictionnaire de référence multi-sources ni corpus
oral volumineux permettant une vérification croisée systématique.

### Détail par niveau et par leçon

**Niveau Débutant (A1-A2)**
| # | Titre | Confiance |
|---|---|---|
| 1 | Les salutations et les formules de politesse | faible |
| 2 | Se présenter | moyenne |
| 3 | L'alphabet et les sons spécifiques | moyenne |
| 4 | La famille et les relations proches | moyenne |
| 5 | Les chiffres, les nombres et le comptage | faible |
| 6 | Les jours de la semaine, les mois, l'heure | faible |
| 7 | Demander son chemin et se repérer | moyenne |
| 8 | La nourriture et les boissons | faible |
| 9 | Les couleurs et les vêtements | faible |

**Niveau Intermédiaire (B1-B2)**
| # | Titre | Confiance |
|---|---|---|
| 1 | Parler de sa maison, son logement, sa ville | faible |
| 2 | Les loisirs, passions, activités sportives | faible |
| 3 | Exprimer ses goûts, préférences, sentiments | faible |
| 4 | Raconter des faits passés | moyenne |
| 5 | Parler de ses projets futurs et ambitions | faible |
| 6 | Faire des achats, négocier, gérer l'argent | faible |
| 7 | Obligation, interdiction, permission | faible |
| 8 | Travail, études, routine professionnelle | moyenne |
| 9 | Demander et donner des conseils | faible |

**Niveau Avancé (C1-C2)**
| # | Titre | Confiance |
|---|---|---|
| 1 | Temps complexes et modes avancés | moyenne |
| 2 | Hypothèse, doute et condition | moyenne |
| 3 | Connecteurs logiques | moyenne |
| 4 | Proverbes, dictons, expressions imagées | **faible (lacune documentaire majeure assumée)** |
| 5 | Débattre et argumenter | faible |
| 6 | Registre soutenu, discours de cérémonie | faible |
| 7 | Textes littéraires ou historiques | moyenne |
| 8 | Lexique technique et professionnel | faible |
| 9 | Traduction et nuances stylistiques | faible |

## Principales lacunes documentaires signalées honnêtement

- **Aucun corpus de proverbes ou dictons nalu** n'a été localisé dans la littérature académique
  disponible (Leçon Avancé n°4) : la seule expression à valeur figurative repérée,
  *« baker mθɔkɔθ kfeef »* (« fabriquer une corde de sable »), n'est pas explicitement cataloguée
  comme proverbe par Seidel (2024) et est présentée comme telle, avec la réserve appropriée.
- **Aucune formule de salutation standard** (bonjour/au revoir) n'est attestée dans les sources
  consultées ; la Leçon Débutant n°1 le signale explicitement et construit son contenu à partir des
  formes de politesse et d'adresse effectivement disponibles.
- **Les nombres 7, 8 et 10 ne sont attestés dans aucune source** ; seuls 1 à 5 ont des racines
  indépendantes confirmées, 6 et 9 se construisant par addition (Leçon Débutant n°5).
- **Le lexique technique/professionnel moderne** repose presque exclusivement sur des emprunts au
  français (*kontra* « contrat », *izin* « usine », *departemaŋ* « département ») relevés dans un
  unique récit de vie d'ouvrier de l'industrie de la bauxite de Kamsar (Leçon Avancé n°8).
- **La palette de couleurs attestée se limite à blanc, noir et rouge** ; aucune source ne fournit
  de terme pour le bleu, le vert ou le jaune (Leçon Débutant n°9).

## Méthodologie

1. Recherche exhaustive via `pplx_sdk.search.web` et `pplx_sdk.content.fetch` couvrant Ethnologue,
   Glottolog, Wiktionary, Wikipedia (EN/FR), et la littérature académique sur les langues Mel du
   Nord de Guinée.
2. Constitution d'un référentiel lexical et grammatical unique (`nalu_lexicon_reference.md`)
   compilant tout le vocabulaire, toutes les phrases d'exemple et tous les points de grammaire
   attestés, avec leur source précise.
3. Génération des 27 fichiers JSON à partir exclusivement de ce référentiel : chaque mot de
   vocabulaire, chaque phrase et chaque réplique de dialogue est soit directement attesté dans une
   source, soit une réutilisation d'un élément déjà vérifié dans le même fichier (jamais un ajout
   externe non sourcé).
4. Vérification systématique de la conformité au schéma (nombre d'entrées vocabulary 5-8,
   common_phrases 4-10, grammar_points 1-3, dialogue 4-8, exercises 2-3, sources 2-5) et correction
   des fichiers déficients par réutilisation stricte du contenu déjà attesté dans chaque fichier.
5. Validation finale des 27 fichiers avec `python3 -m json.tool` (JSON strictement valide, sans
   commentaires ni virgules finales).

## Conclusion

Les 27 leçons produites représentent l'exploitation la plus complète possible, à ce jour, du
corpus académique publiquement disponible sur le nalu. La confiance globale du corpus est
**modeste à faible** (0 % élevée, 37 % moyenne, 63 % faible), ce qui reflète fidèlement la rareté
extrême de la documentation sur cette langue plutôt qu'une lacune de méthode : à chaque fois que
les données manquaient, la lacune a été signalée explicitement dans `confidence_note` plutôt que
comblée par une invention.
