# Maintenance Module

Ce module contient des endpoints de maintenance pour des opérations d'administration de la base de données.

## Configuration

Ajouter dans votre `.env` :

```env
MAINTENANCE_KEY=your-secret-maintenance-key-here
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

## Utilisation en production

1. Ajouter la variable `MAINTENANCE_KEY` dans votre environnement de production
2. S'assurer que la colonne `plainText` existe (avec `synchronize: true`, elle sera créée automatiquement)
3. Appeler l'endpoint avec la clé secrète

## Sécurité

- L'endpoint est protégé par une clé secrète
- Ne jamais commiter la clé dans le code
- Utiliser des variables d'environnement
- Changer la clé régulièrement en production
