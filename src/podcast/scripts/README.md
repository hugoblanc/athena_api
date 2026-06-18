# Scripts de gestion des podcasts

## calculate-missing-durations.ts

Script pour calculer et mettre à jour les durées manquantes des podcasts existants.

### Utilisation

```bash
npm run script:calculate-durations
```

### Fonctionnement

1. Récupère tous les podcasts avec `duration = null` ou `duration = 0`
2. Pour chaque podcast :
   - Télécharge le fichier WAV depuis Google Cloud Storage
   - Parse le header WAV pour extraire les paramètres audio (sampleRate, bitsPerSample, channels)
   - Calcule la durée : `duration = dataLength / byteRate`
   - Met à jour la base de données

### Environnement

Le script utilise la configuration de l'application (fichier `.env`), assurez-vous que les variables suivantes sont définies :

- `ATHENA_DB_HOST`
- `ATHENA_DB_PORT`
- `ATHENA_DB_USER`
- `ATHENA_DB_PASSWORD`
- `ATHENA_DB_NAME`

### Production

Pour exécuter le script en production :

```bash
# SSH vers le serveur de production
ssh user@production-server

# Naviguer vers le dossier de l'API
cd /path/to/athena_api

# Exécuter le script
npm run script:calculate-durations
```

### Notes

- Le script ajoute un délai de 500ms entre chaque podcast pour éviter de surcharger le serveur
- Les durées sont arrondies à la seconde près
- Un résumé est affiché à la fin (succès/échecs)
