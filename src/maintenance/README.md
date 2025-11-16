# Maintenance Module

Ce module contient des endpoints de maintenance pour des opérations d'administration de la base de données.

## Configuration

Ajouter dans votre `.env` :

```env
MAINTENANCE_KEY=your-secret-maintenance-key-here
OPENAI_API_KEY=sk-your-openai-api-key-here
```

## Endpoints disponibles

### POST /maintenance/populate-plaintext

Migre tous les articles existants en convertissant leur `description` HTML en `plainText`.

**Headers requis** :
```
x-maintenance-key: your-secret-maintenance-key-here
```

**Exemple avec curl** :
```bash
curl -X POST http://localhost:3000/maintenance/populate-plaintext \
  -H "x-maintenance-key: your-secret-maintenance-key-here"
```

**Réponse** :
```json
{
  "processed": 71,
  "updated": 71,
  "failed": 0,
  "errors": []
}
```

---

### POST /maintenance/generate-embeddings

Génère les embeddings vectoriels pour tous les articles qui n'en ont pas encore.

- **Chunking** : Découpe intelligente en chunks de 600-800 mots avec overlap de 100 mots
- **Model** : OpenAI `text-embedding-3-small` (1536 dimensions)
- **Coût** : ~$0.02 / 1M tokens (~$0.30 pour 9334 articles)

**Headers requis** :
```
x-maintenance-key: your-secret-maintenance-key-here
```

**Exemple avec curl** :
```bash
curl -X POST https://www.athena-app.fr/maintenance/generate-embeddings \
  -H "x-maintenance-key: your-secret-maintenance-key-here"
```

**Réponse** :
```json
{
  "processed": 9334,
  "successful": 9334,
  "failed": 0,
  "totalTokens": 15147970,
  "estimatedCost": 0.3030
}
```

**⚠️ Important** :
- Cette opération peut prendre plusieurs minutes (9334 articles = ~15-20 min)
- Coût estimé : $0.30 pour tous les articles existants
- Ne pas interrompre pendant l'exécution

## Utilisation en production

1. Ajouter les variables `MAINTENANCE_KEY` et `OPENAI_API_KEY` dans votre environnement de production
2. S'assurer que les tables existent (avec `synchronize: true`, elles seront créées automatiquement)
3. Appeler d'abord `/populate-plaintext` puis `/generate-embeddings`

## Ordre d'exécution

```bash
# 1. Peupler les plainText (si ce n'est pas déjà fait)
curl -X POST https://www.athena-app.fr/maintenance/populate-plaintext \
  -H "x-maintenance-key: YOUR_KEY"

# 2. Générer les embeddings
curl -X POST https://www.athena-app.fr/maintenance/generate-embeddings \
  -H "x-maintenance-key: YOUR_KEY"
```

## Sécurité

- Les endpoints sont protégés par une clé secrète
- Ne jamais commiter les clés dans le code
- Utiliser des variables d'environnement
- Changer la clé régulièrement en production
- L'API OpenAI Key doit avoir les permissions pour `text-embedding-3-small`
