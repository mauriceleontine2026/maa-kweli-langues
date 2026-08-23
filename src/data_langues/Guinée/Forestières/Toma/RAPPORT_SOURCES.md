# Rapport des sources — Leçons Toma (Loma de Guinée forestière, ISO 639-3 "lom")

## Contexte et clarification importante

Le brief initial faisait référence à un « manuel Loma du Peace Corps Libéria (Live Lingua Project) ».
Vérification effectuée : **Live Lingua Project (livelingua.com) ne propose aucun cours Loma ni
Toma** dans sa liste de manuels Peace Corps en libre accès. Le véritable manuel Peace Corps sur le
Lorma existe bien, mais il est archivé par l'ERIC (Education Resources Information Center) du
département américain de l'éducation, et non par Live Lingua. C'est cette version qui a été utilisée
ici (voir source n°2 ci-dessous). Cette correction est signalée par souci de transparence.

## Sources principales utilisées

1. **Wesley Sadler, « A Complete Analysis of the Lɔɔma Language, Interior Liberia, West Africa »**,
   *Mandenkan* 42 (publication posthume, LLACAN/CNRS), pp. 5-109.
   https://llacan.cnrs.fr/PDF/Mandenkan42/sadler.pdf
   — Grammaire académique de référence : phonologie complète (tons, consonnes, voyelles), système
   pronominal (7+ paradigmes), système verbal à quatre formes (base/progressif/passé récent/passé
   lointain), négation, postpositions, numération, morphologie nominale, mutation consonantique.

2. **Dwyer, David J., Bodegie, Pewu B., Bague, James D., « A Learner Directed Approach to Lorma »**
   (Peace Corps / Michigan State University African Studies Center, 1981), version numérisée ERIC
   n° ED247766. https://files.eric.ed.gov/fulltext/ED247766.pdf
   — Manuel pédagogique complet : salutations, famille, chiffres et argent, alimentation, santé,
   habitat, agriculture, métiers, conjonctions (et/ou/mais/donc/si/sauf si/avant/jusqu'à), vocabulaire
   vestimentaire, vocabulaire de la palabre/débat, 20 proverbes numérotés avec traduction anglaise
   (texte source dégradé par une reconnaissance optique de caractères imparfaite).

3. **Omniglot, « Useful phrases in Loma »** (dialecte Guizima, contribution Balla Koevogui).
   https://www.omniglot.com/language/phrases/loma.htm
   — Environ 50 phrases usuelles (salutations, questions de base, phrases d'urgence).

4. **Omniglot, « Loma (Löömàgòòi / Löghömàgòòi) »**. https://www.omniglot.com/writing/loma.htm
   — Présentation générale de la langue, chiffres 1-10, liste des dialectes, histoire d'un syllabaire
   local antérieur à l'alphabet latin standardisé.

5. **Wikipédia (anglais), « Loma language »**. https://en.wikipedia.org/wiki/Loma_language
   — Phonologie (21 consonnes, 28 voyelles, 2 tons), texte intégral du « Notre Père » en loma
   (transcription API), mention des hymnes de Billema Kwillia, codes ISO.

6. **Wikipédia (français), « Loma (langue) »**. https://fr.wikipedia.org/wiki/Loma_(langue)
   — Inventaire consonantique/vocalique, historique de l'alphabet officiel en Guinée (ordonnance
   n° 19/PRG/SGG du 10 mars 1989), bibliographie.

7. **Ethnologue, « Loma » [lom]**. https://www.ethnologue.com/language/lom/
   — Données de classification et de vitalité de la langue.

8. **Glottolog, « Loma (Liberia) »**. https://glottolog.org/resource/languoid/id/loma1260
   — Confirmation de la classification Mande du Sud et du code ISO 639-3.

9. **Proverbicals, « Liberian Proverbs »**. https://proverbicals.com/liberian/
   — Source secondaire complémentaire pour le module sur les proverbes (proverbes libériens en
   anglais, non spécifiquement en langue loma ; utilisée uniquement en appui contextuel, pas comme
   source principale de texte en langue cible).

## Couverture des 27 leçons

Les 27 fichiers JSON demandés ont été produits et couvrent l'intégralité du programme :
- **Niveau Débutant (A1-A2)** — 9 leçons : salutations, présentation, alphabet/sons, famille,
  chiffres, jours/heure, directions, nourriture, couleurs/vêtements.
- **Niveau Intermédiaire (B1-B2)** — 9 leçons : maison/ville, loisirs/sport, goûts/sentiments, récit
  passé, projets futurs, achats/négociation, obligation/interdiction, travail/études, conseils.
- **Niveau Avancé (C1-C2)** — 9 leçons : temps/modes complexes, hypothèse/condition, connecteurs
  logiques, proverbes, débat/argumentation, registre soutenu, textes littéraires, lexique technique,
  traduction/nuances stylistiques.

Chaque fichier respecte strictement le schéma imposé (vocabulary, common_phrases, grammar_points,
dialogue, cultural_notes, exercises, sources, confidence, confidence_note) et a été validé avec
`python3 -m json.tool` (27/27 fichiers valides).

## Le continuum dialectal Toma (Guinée) / Loma-Lorma (Libéria)

Le toma de Guinée forestière et le loma/lorma du Libéria (dialecte Gizima principalement documenté)
forment un seul continuum dialectal au sein du sous-groupe mandé du Sud (groupe Mende-Loma). Les
locuteurs des deux côtés de la frontière se comprennent largement. **Cependant, la quasi-totalité de
la documentation linguistique publiée et accessible (grammaire de Sadler, manuel Peace Corps Dwyer)
concerne le côté libérien de ce continuum**, la documentation académique spécifique au parler de
Guinée (avec ses particularités comme le son /ɣ/ absent au Libéria) étant nettement plus rare et
peu accessible en ligne. Ce déséquilibre documentaire explique le niveau de confiance « moyenne »
attribué à la majorité des leçons de vocabulaire et de phrases : le contenu est réel et vérifié,
mais provient très majoritairement de sources décrivant le loma/lorma du Libéria plutôt que le toma
de Guinée proprement dit.

## Répartition des niveaux de confiance

| Confiance | Nombre de leçons | Justification |
|---|---|---|
| **Élevée** | 2 | Phonologie (A1_M1_L3, convergence de deux sources académiques indépendantes) et système verbal à quatre formes (C1_M1_L1, décrit explicitement et de façon détaillée par la grammaire de Sadler). |
| **Moyenne** | 20 | Vocabulaire et grammaire directement attestés dans les sources listées, mais concernant le continuum Loma/Lorma du Libéria plutôt que le Toma de Guinée spécifiquement, et/ou provenant d'un nombre restreint de sources. |
| **Faible** | 5 | Domaines pour lesquels aucune source directement dédiée au sujet précis de la leçon n'a été trouvée (loisirs/sports, lexique professionnel élargi, lexique technique moderne, proverbes dont le texte source est dégradé par l'OCR) : le contenu réel le plus proche disponible a été utilisé, conformément à la consigne du brief, plutôt qu'une invention. |

## Confiance globale

**Niveau de confiance global : MOYEN.**

Justification : l'intégralité du vocabulaire, des phrases et des exemples grammaticaux provient de
sources réelles et vérifiables (grammaire académique publiée, manuel Peace Corps archivé par l'ERIC,
Omniglot, Wikipédia, Ethnologue, Glottolog) — aucun contenu n'a été inventé. La limite principale est
double : (1) la documentation disponible concerne majoritairement le Loma/Lorma du Libéria plutôt que
le Toma de Guinée forestière proprement dit (continuum dialectal, mais pas la même source
géographique exacte que celle visée par le brief) ; (2) certains domaines lexicaux modernes ou
spécialisés (sports/loisirs, lexique professionnel étendu, lexique technique) restent peu ou pas
documentés dans les sources accessibles, obligeant à un contenu plus restreint signalé honnêtement en
confiance « faible » plutôt que comblé par des inventions.
