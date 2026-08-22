# Rapport des sources — Leçons de Pular (Fouta-Djalon, Guinée)

**Langue :** Pular de Guinée (Fula/Fulfulde, variété du Fouta-Djalon) — code ISO 639-3 `fuf`, famille Atlantique/Niger-Congo.
**Nombre de fichiers produits :** 27 leçons JSON (9 niveau A1-A2, 9 niveau B1-B2, 9 niveau C1-C2), réparties en 3 niveaux × 3 modules × 3 leçons, conformément au schéma défini dans `lesson_schema_brief.md`.

---

## 1. Méthodologie

Chaque leçon a été construite à partir de vocabulaire et de structures grammaticales **réellement attestés** dans des sources fiables sur le pular/fulfulde, en priorisant systématiquement :

1. Le **manuel de référence principal** — *Learner's Guide to Pular (Fuuta Jallon)*, manuel du Peace Corps Guinée par Herb Caudill et Ousmane Besseko Diallo, disponible en ligne : [https://ibamba.net/pular/manual.pdf](https://ibamba.net/pular/manual.pdf). Ce manuel, structuré en 9 « Competences » thématiques et 4 textes authentiques (fable, conseils traditionnels, cérémonies, récit d'histoire orale), est la source la plus fiable car elle documente spécifiquement la variété Pular du Fouta-Djalon parlée en Guinée.
2. Les **dictionnaires et lexiques Pular-français** en ligne (Lexilogos, Fula Fular pula Pular Pulaar Fulfulde, Wiktionary) pour compléter et vérifier le vocabulaire de base.
3. Des **ressources grammaticales et culturelles complémentaires** (pulaar.org, Scribd, proverbes fulani, manuel technique Fulfulde du Peace Corps) pour les registres avancés (connecteurs logiques, débat, lexique professionnel), en signalant explicitement quand ces sources documentent une variété générale de Fulfulde plutôt que la variété spécifiquement guinéenne du Fouta-Djalon.

Aucun mot de vocabulaire n'a été inventé de toutes pièces : lorsque le terme exact n'était pas disponible dans les sources consultées (par exemple pour un vocabulaire sportif moderne ou un registre de débat très spécialisé), le mot réel le plus proche attesté a été utilisé, avec mention explicite de cette limite dans le champ `confidence_note` du fichier concerné.

---

## 2. Sources utilisées (liste consolidée)

| Source | URL |
|---|---|
| Learner's Guide to Pular (Fuuta Jallon) — Peace Corps Guinée (Herb Caudill & Ousmane Besseko Diallo) | https://ibamba.net/pular/manual.pdf |
| Live Lingua Project — Peace Corps Manual of Fulfulde | https://www.livelingua.com/course/peace-corps/manual-of-fulfulde |
| Lexilogos — Dictionnaire peul (pular, fulfulde) en ligne | https://www.lexilogos.com/peul_dictionnaire.htm |
| Fula Fular pula Pular Pulaar Fulfulde (FULA FR) — lexique et grammaire | https://fulapula.wordpress.com/grandvoc/ |
| Fula Fular pula Pular Pulaar Fulfulde — Verb Conjugation | https://fulapula.wordpress.com/verb-conjugation/ |
| Wiktionary — catégorie langue Fula (sikke, sikkugol : doute, opinion, penser) | https://en.wiktionary.org/wiki/sikkugol |
| pulaar.org — Grammaire de Référence Pulaar/Fulfulde (connecteurs logiques et marqueurs de subordination) | https://pulaar.org/pulaar/grammaire_pulaar_v2.html |
| pulaar.org — Miijo ko fayti e nguurndam (exemple de discours argumentatif en pulaar) | https://pulaar.org/2020/04/17/miijo-ko-fayti-e-nguurndam/ |
| Grammaire de la Langue Pular Fula (cours PCV, notes grammaticales détaillées) | https://www.scribd.com/document/770009186/Grammaire-de-La-Langue-Pular-Fula |
| Maneno Matamu — Pulaar: the colour spectrum | https://manenomatamu.wordpress.com/2011/12/06/pulaar-the-colour-spectrum-english-translation/ |
| MasterAnyLanguage — Fula Language (Pulaar, Fulani) Clothing/Colors/Idioms | https://www.masteranylanguage.com/c/r/en/Fula/IdiomsProverbs/1 |
| African Manners — Fulani Proverbs (33 in Total) | https://africanmanners.wordpress.com/2012/07/07/fulani-proverbs-30-in-total/ |
| My Little Word Land — cours Fulfulde (vocabulaire vêtements, famille, métiers) | https://mylittlewordland.com/course/379346/fulfulde |
| Ethnologue — Pular (fuf), Guinea | https://www.ethnologue.com/language/fuf/ |
| Peace Corps — Fulfulde Technical Language Manual (lexique technique/professionnel) | https://www.livelingua.com/peace-corps/Fulfulde/fulfulde%20peace%20corps.pdf |
| Dictionnaire Fulfulde-Français-English (Aadi Keyri, webonary.org) | https://www.webonary.org/fulfuldeburkina/files/Dictionnaire-Fulfulde-fran%C3%A7ais-english-et-images.pdf |

**Source primaire dominante :** le manuel Peace Corps *Learner's Guide to Pular (Fuuta Jallon)* est cité dans la quasi-totalité des 27 leçons ; il constitue la colonne vertébrale de l'ensemble du contenu (vocabulaire de base, dialogues, grammaire verbale, textes authentiques : fable, conseils traditionnels, cérémonies, récit historique du dernier Almaami).

---

## 3. Niveau de confiance global

| Confiance | Nombre de leçons | Proportion |
|---|---|---|
| **Élevée** | 20 / 27 | 74 % |
| **Moyenne** | 5 / 27 | 18,5 % |
| **Faible** | 2 / 27 | 7,5 % |

**Confiance globale de l'ensemble : élevée à moyenne.**

- Les leçons à confiance **élevée** (20/27, la grande majorité) s'appuient directement sur le manuel Peace Corps Guinée, source spécifiquement dédiée à la variété Pular du Fouta-Djalon, avec vocabulaire, phrases et dialogues directement attestés.
- Les leçons à confiance **moyenne** (5/27) concernent des thématiques pour lesquelles le manuel principal manquait de contenu direct (vocabulaire sportif, couleurs/vêtements détaillés, vocabulaire professionnel courant, proverbes non confirmés spécifiquement Fouta-Djalon) et ont dû être complétées par des sources secondaires (blogs spécialisés, dictionnaires en ligne) documentant le Pulaar/Fulfulde de façon plus générale.
- Les leçons à confiance **faible** (2/27 : C1_M2_L5 « Débattre, argumenter » et C1_M3_L8 « Lexique technique ») portent sur des registres très spécialisés (débat argumentatif soutenu, terminologie de gestion de projet/ONG) pour lesquels aucune source n'a permis de confirmer un vocabulaire spécifiquement attesté en Pular du Fouta-Djalon ; ces leçons utilisent uniquement des verbes et termes fondamentaux réellement attestés (ex. *sikkugol*, *jaɓude*, *poroje*), en évitant toute invention, mais avec une couverture lexicale plus limitée que souhaité pour ces registres.

Chaque fichier JSON contient son propre champ `confidence` et `confidence_note` détaillant precisément la justification de son niveau de confiance individuel.

---

## 4. Limites connues et zones de prudence

- **Vocabulaire sportif moderne** (football, etc.) : aucun terme natif spécifique attesté trouvé ; les leçons concernées (A1, B1) le signalent en confiance moyenne.
- **Couleurs et vêtements** (A1_M3_L9) : vocabulaire issu de sources secondaires (blogs), non confirmé exclusivement Fouta-Djalon.
- **Débat/argumentation soutenue** (C1_M2_L5) : couverture lexicale minimale, confiance faible, faute de vocabulaire spécialisé attesté (motion, réfutation, etc.).
- **Lexique technique/professionnel** (C1_M3_L8) : le manuel technique Fulfulde du Peace Corps documente une variété générale de développement communautaire ouest-africain, non confirmée spécifique au Fouta-Djalon guinéen ; à utiliser avec prudence en contexte strictement local.
- **Proverbes** (C1_M2_L4) : un seul proverbe directement confirmé dans le manuel Peace Corps (« Wata gerto yaw ko hoccata ») ; les autres proviennent de compilations générales de proverbes fulani/peuls, non garanties spécifiques à la variété du Fouta-Djalon.

---

*Rapport généré dans le cadre de la production des 27 leçons de Pular (Fouta-Djalon) conformément au schéma défini dans `lesson_schema_brief.md`.*
