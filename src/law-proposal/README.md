# Module Law Proposal

Module de scraping et simplification des propositions de loi de l'Assemblée Nationale française.

## Fonctionnalités

- **Scraping automatisé** : Récupération des propositions de loi depuis le site de l'Assemblée Nationale
- **Déduplication des députés** : Gestion intelligente des députés via `acteurRef` (clé primaire métier)
- **Simplification IA** : Génération de versions simplifiées avec OpenAI pour une lecture rapide (30-60 secondes)
- **Persistance relationnelle** : Stockage complet en base de données TypeORM
- **API REST** : Endpoints pour initialisation et consultation

## Structure

```
src/law-proposal/
├── domain/               # Entités TypeORM
│   ├── law-proposal.entity.ts
│   ├── depute.entity.ts
│   ├── section.entity.ts
│   ├── article.entity.ts
│   └── amendement.entity.ts
├── application/          # Services métier
│   ├── law-proposal.service.ts        # CRUD
│   ├── law-scraping.service.ts        # Scraping + déduplication
│   └── law-simplification.service.ts  # Génération IA
├── infrastructure/       # Infrastructure NestJS
│   ├── law-proposal.module.ts
│   ├── law-proposal.controller.ts
│   └── law-scraping-cron.service.ts  # Cron désactivé
└── scrapers/            # Code de scraping
    ├── assemblee-nationale-scraper.ts
    ├── proposition-scraper.ts
    ├── depute-scraper.ts
    └── types.ts
```

## Endpoints API

### POST /law-proposal/initialize?limit=50
Initialise le scraping des X dernières propositions de loi

**Paramètres** :
- `limit` : nombre de propositions à scraper (1-500)

**Réponse** :
```json
{
  "message": "Scraping completed, simplification in progress",
  "created": 45,
  "skipped": 5
}
```

### POST /law-proposal/process-simplification-queue?batchSize=5
Force le traitement de la queue de simplification IA

**Paramètres** :
- `batchSize` : nombre de propositions à traiter en une fois (défaut: 5)

### GET /law-proposal/stats
Récupère les statistiques du module

**Réponse** :
```json
{
  "total": 150,
  "pending": 10,
  "completed": 135,
  "failed": 5
}
```

### GET /law-proposal/recent?limit=10
Récupère les propositions récentes

### GET /law-proposal/:numero
Récupère une proposition par son numéro

## Configuration

Variables d'environnement à configurer dans `.env` :

```bash
# OpenAI (déjà configuré dans Athéna)
OPENAI_API_KEY=sk-xxx

# Law Proposal Module (optionnel)
LAW_SIMPLIFICATION_MODEL=gpt-4o-mini
```

## Cron Job (désactivé par défaut)

Le cron quotidien est désactivé dans [law-scraping-cron.service.ts](infrastructure/law-scraping-cron.service.ts#L18).

Pour l'activer :
1. Décommenter le décorateur `@Cron('0 0 2 * * *')`
2. Redémarrer l'application

Le cron s'exécutera tous les jours à 2h du matin et scrapera les 20 dernières propositions.

## Déduplication des Députés

Le système utilise `acteurRef` (identifiant unique de l'API Assemblée Nationale) comme clé primaire métier.

**Logique** :
1. Recherche par `acteurRef` (prioritaire)
2. Fallback par `nom + groupePolitiqueCode`
3. Création si aucun doublon trouvé

**Mise à jour automatique** :
- Groupe politique (peut changer)
- Photo (enrichissement progressif)
- URL du député

Voir [law-scraping.service.ts](application/law-scraping.service.ts#L200) pour l'implémentation.

## Workflow de Simplification

1. **Scraping** : Récupération des propositions → Status `PENDING`
2. **Queue asynchrone** : Traitement par lots (batch de 5)
3. **OpenAI** : Génération de la version simplifiée (300-400 mots max)
4. **Sauvegarde** : Status `COMPLETED` + `simplifiedVersion` remplie

Status possibles :
- `PENDING` : En attente de simplification
- `PROCESSING` : Simplification en cours
- `COMPLETED` : Terminé avec succès
- `FAILED` : Échec de la simplification

## Utilisation

### Initialiser la base avec les 50 dernières propositions

```bash
curl -X POST "http://localhost:3000/law-proposal/initialize?limit=50"
```

### Vérifier les statistiques

```bash
curl "http://localhost:3000/law-proposal/stats"
```

### Forcer le traitement de la simplification

```bash
curl -X POST "http://localhost:3000/law-proposal/process-simplification-queue"
```

## Tests

```bash
# Build
npm run build

# Démarrer l'application
npm run start:dev
```

## Documentation technique

Voir [specs/law-proposal-module-tech.md](../../specs/law-proposal-module-tech.md) pour la spécification technique complète.
