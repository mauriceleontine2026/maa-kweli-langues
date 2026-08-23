# Rapport de sources — Leçons de Mano (mev)

## Langue traitée

**Mano** (aussi Mann/Manô), code ISO 639-3 `mev`, langue mandé du Sud parlée en Guinée forestière autour de N'Zérékoré et Sérédou, apparentée au Dan/Yacouba de Côte d'Ivoire.

## Sources principales utilisées

1. **Khachaturyan, Maria (2015).** *Grammaire du mano.* Mandenkan 54, LLACAN/CNRS. Grammaire académique complète (252 pages) en accès libre.
   URL : https://llacan.cnrs.fr/PDF/Mandenkan54/54khachaturyan.pdf

2. **Khachaturyan, Maria, Carbou, Marie & Mamy, Yakoubou (2022).** *Dictionnaire mano-français.* Mandenkan 67, LLACAN/CNRS. Dictionnaire bilingue de plus de 3200 entrées, en accès libre.
   URL : https://llacan.cnrs.fr/PDF/Mandenkan67/67mano_dict_all.pdf

3. **Khachaturyan, Maria (2018).** *Dialectal variation of Mano.* Mandenkan 59, LLACAN/CNRS/OpenEdition. Article sur la variation dialectale (Guinée : zaan, maa, kpenson ; Libéria : maalaa, maazein, maabei).
   URL : https://journals.openedition.org/mandenkan/1308

4. **Wiktionnaire — entrée « mano (langue) ».**
   URL : https://fr.wiktionary.org/wiki/mano

5. **Wikipédia (français) — article « Mano (langue) ».**
   URL : https://fr.wikipedia.org/wiki/Mano_(langue)

## Source recherchée mais non exploitable directement

**deZeeuw, J. & Kruah, S. (1981).** *A Learner Directed Approach to Mano.* Peace Corps Guinée/Libéria (référence bibliographique ERIC ED217691).
URL (notice bibliographique uniquement) : https://eric.ed.gov/?id=ED217691

Ce manuel du Peace Corps a été activement recherché, y compris sur le Live Lingua Project, mais son texte intégral n'a pu être localisé en ligne — seule la notice bibliographique ERIC est accessible. Il n'a donc **pas** été utilisé comme source de vocabulaire ou de grammaire ; il est mentionné ici uniquement pour attester la recherche effectuée, conformément à la demande initiale.

## Constat méthodologique important

Contrairement à l'hypothèse de départ (langue minoritaire aux ressources limitées, nécessitant potentiellement un recours au Dan/Yacouba pour combler des lacunes), les travaux académiques de Maria Khachaturyan publiés dans la revue *Mandenkan* (LLACAN/CNRS, en libre accès) se sont révélés **exceptionnellement complets** : une grammaire de référence de 252 pages et un dictionnaire de plus de 3200 entrées, tous deux avec des exemples de phrases authentiques et une transcription tonale rigoureuse. **Il n'a donc pas été nécessaire de recourir au Dan/Yacouba** comme langue de secours — les 27 leçons ont pu être construites presque intégralement à partir de sources mano authentiques et sourcées.

## Couverture par niveau

- **Niveau Débutant (A1-A2)** — 9 leçons : salutations, présentation, alphabet/phonologie, famille, chiffres, jours/heure, directions, nourriture, couleurs/vêtements. Vocabulaire et exemples directement attestés dans le dictionnaire (Mandenkan 67) et la grammaire (Mandenkan 54).
- **Niveau Intermédiaire (B1-B2)** — 9 leçons : logement/ville, loisirs, sentiments, récit au passé, projets futurs, marché/négociation, obligation/interdiction, travail/études, conseils. Structures TAM (prétérit, parfait, imperfectif, prospectif, subjonctif) directement issues du paradigme documenté par Khachaturyan.
- **Niveau Avancé (C1-C2)** — 9 leçons : système TAM complet, hypothèse/condition (réelle vs irréelle), connecteurs logiques, proverbes authentiques (fable du lion et du chimpanzé), débat/argumentation, registre soutenu/cérémoniel, analyse de texte étiologique, lexique technique/professionnel, traduction et nuances stylistiques. Ce niveau exploite en profondeur les textes narratifs, le système des sept séries d'auxiliaires et les six catégories de connecteurs logiques documentés dans la grammaire académique.

## Limites et lacunes signalées honnêtement

Certaines lacunes lexicales ont été identifiées dans les sources disponibles et sont explicitement signalées dans les champs `confidence_note` des leçons concernées plutôt que masquées par une invention non sourcée :

- **Métiers modernes** (agriculteur, chauffeur, pêcheur, informaticien, ingénieur) : aucune entrée dédiée trouvée dans le dictionnaire académique pour ces noms d'agent modernes. La leçon 8 du niveau Intermédiaire et la leçon 8 du niveau Avancé signalent ce manque et privilégient les métiers traditionnels bien attestés (enseignant, médecin, commerçant, forgeron, chasseur, chef) ainsi que des périphrases descriptives honnêtes pour les métiers modernes plutôt que des néologismes non attestés.
- **Calendrier mensuel** : les noms de mois du calendrier grégorien en mano sont moins fréquemment employés au quotidien que les repères saisonniers traditionnels ; la leçon 6 du niveau Débutant (jours/mois/heure) porte donc une confiance « moyenne » sur cet aspect spécifique.
- **Formules de permission, palabre formelle, débat contradictoire** : ces actes de langage précis ne disposent pas de corpus dédié dans les sources consultées. Les formules proposées ont été construites par combinaison raisonnée d'éléments grammaticaux et lexicaux individuellement attestés (subjonctif, verbes de sentiment/accord, connecteurs), avec une confiance « moyenne » assumée et signalée dans les leçons concernées (Intermédiaire L7 et L9, Avancé L5 et L6, Avancé L8).
- **Transcription phonétique** : en l'absence de source audio native, le champ `phonetic_api` reproduit la forme orthographique tonale attestée dans les sources (Khachaturyan utilise une orthographe à tons marqués proche de l'API pour les voyelles et tons), complétée par un `phonetic_simple` simplifié à visée pédagogique. Cette approche est signalée explicitement.

## Bilan des sources par lesson (résumé)

| Niveau | Leçons avec source principale dictionnaire+grammaire | Leçons avec confiance "moyenne" (lacune signalée) |
|---|---|---|
| Débutant (A1-A2) | 9/9 | 1 (L6 — mois/calendrier) |
| Intermédiaire (B1-B2) | 9/9 | 3 (L7 permission, L8 métiers modernes, L9 conseils) |
| Avancé (C1-C2) | 9/9 | 3 (L5 débat, L6 registre cérémoniel, L8 lexique technique moderne) |

**Total : 20 leçons à confiance "élevée", 7 leçons à confiance "moyenne", 0 leçon à confiance "faible".**

## Note sur les dialectes

Le mano compte en Guinée trois variétés principales : le **zaan** (préfecture de Lola), le **maa** (préfecture de N'Zérékoré — variété de référence utilisée dans les sources académiques et donc dans ce cours), et le **kpenson** (préfecture de Yomou). Au Libéria (comté de Nimba), on distingue le maalaa, le maazein et le maabei ([Khachaturyan 2018, Mandenkan 59](https://journals.openedition.org/mandenkan/1308)).
