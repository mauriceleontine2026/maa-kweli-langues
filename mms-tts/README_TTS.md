# Service interne MMS-TTS

Meta MMS-TTS est une collection open source de modèles de synthèse vocale multilingues publiée sur Hugging Face. Ici, chaque modèle est chargé à la demande depuis `facebook/mms-tts-<code-ISO-639-3>` puis gardé en mémoire. MMS est un premier moteur pratique pour une couverture multilingue; la qualité et la disponibilité doivent toutefois être vérifiées langue par langue.

## Installation

Python 3.9 ou plus récent est requis. Depuis la racine du dépôt :

```bash
cd mms-tts
python -m venv .venv
```

Activez l'environnement virtuel, puis installez les dépendances :

```bash
# Linux/macOS
source .venv/bin/activate
pip install -r requirements.txt

# Windows PowerShell : utilisez plutôt .venv\Scripts\Activate.ps1
```

`torch` peut être volumineux. Pour une machine avec GPU, installez la version PyTorch correspondant à votre version de CUDA en suivant le sélecteur officiel PyTorch, puis installez le reste des dépendances. Sans GPU compatible, le service utilise le CPU.

## Démarrage

Depuis le dossier `mms-tts` :

```bash
python main.py
```

Le serveur écoute par défaut sur `http://localhost:8000`. Les variables `TTS_HOST` et `TTS_PORT` permettent de modifier l'adresse et le port, par exemple `TTS_PORT=8010`. Sur PowerShell : `$env:TTS_PORT = "8010"`. Définissez aussi `TTS_API_KEY` pour autoriser les appels à `POST /tts`; cet endpoint échoue fermé si la clé est absente. Le premier appel à une langue télécharge son modèle; les suivants réutilisent le cache en mémoire. Une connexion Internet à Hugging Face est donc nécessaire au premier chargement.

Pour autoriser l'application web à appeler l'API depuis une autre origine, définissez `TTS_ALLOWED_ORIGINS` avec les origines séparées par des virgules (par exemple `https://app.example.com`). La valeur par défaut `*` convient au test local; en production, limitez-la à vos domaines. CORS n'est pas un mécanisme d'authentification.

## API

Vérifier le service et la configuration :

```bash
curl http://localhost:8000/health
curl http://localhost:8000/languages
```

Synthétiser du texte en WAV :

```bash
curl -X POST http://localhost:8000/tts \
  -H "Content-Type: application/json" \
  -H "X-TTS-API-Key: $TTS_API_KEY" \
  -d '{"text":"Bonjour","lang_iso":"fr"}' \
  --output output.wav
```

La clé est réservée au backend; ne l'intégrez jamais dans le JavaScript, le bundle web ou l'application mobile. Définissez la même valeur comme `MMS_TTS_API_KEY` dans le backend appelant et `TTS_API_KEY` dans le service MMS-TTS.

L'API accepte les codes ISO 639-3 et les alias courants configurés, tels que `fr` (`fra`), `en` (`eng`) et `ja` (`jpn`). Exemple JavaScript depuis une application web ou mobile :

```javascript
const response = await fetch("http://localhost:8000/tts", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: "Bonjour", lang_iso: "fra" }),
});

if (!response.ok) throw new Error(await response.text());
const wav = await response.blob();
const audioUrl = URL.createObjectURL(wav);
const audio = new Audio(audioUrl);
await audio.play();
```

## Ajouter une langue ou un fallback

1. Vérifiez que le code est bien un code ISO 639-3 et que le dépôt `facebook/mms-tts-<code>` existe sur [Hugging Face](https://huggingface.co/models?search=facebook%2Fmms-tts-). La disponibilité des modèles varie selon la langue; la liste de référence Meta `all_langs.tsv` est également consultable [ici](https://dl.fbaipublicfiles.com/mms/metadata/all_langs.tsv).
2. Ajoutez le code dans `DEFAULT_LANGUAGES` dans `config.py`. Par exemple, Pular est généralement identifié par `fuf`; évitez `pular` comme nom de modèle si le dépôt Hugging Face utilise le code ISO.
3. Pour accepter un alias supplémentaire (par exemple un code ISO 639-1), ajoutez-le à `LANG_ALIASES` en le faisant pointer vers le code de modèle ISO 639-3.
4. Pour une langue dont le modèle n'existe pas, ajoutez une entrée `"code_demandé": "code_de_secours"` dans `LANG_FALLBACK`. La langue de secours doit aussi être dans `DEFAULT_LANGUAGES` et posséder un dépôt MMS disponible. Le service tente d'abord la langue demandée, puis suit la chaîne de fallback si le chargement échoue.

Un fallback prononce le texte avec le modèle de la langue de secours; il ne traduit pas le texte et peut donner une prononciation incorrecte. Choisissez-le seulement si cela reste utile pour votre cas d'usage. Une erreur de téléchargement/réseau peut aussi déclencher le fallback; si aucun candidat ne se charge, l'API renvoie HTTP 503 avec le détail de l'échec.

## Déploiement

Déployez le contenu de `mms-tts/` sur un serveur Linux avec Python 3.9+, puis lancez `python main.py` ou `uvicorn tts_api:app --host 0.0.0.0 --port 8000`. Prévoyez assez de mémoire pour les modèles conservés en cache. En production, placez l'API derrière HTTPS et configurez un contrôle d'accès si elle n'est pas destinée à être publique.