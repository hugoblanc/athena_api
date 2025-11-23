# Law Scraper

Services TypeScript pour scraper les propositions de loi de l'Assemblée Nationale.

## Structure

```
src/
├── types.ts              # Types & énumérations groupes politiques
├── scraper.ts            # Liste des propositions
├── propositionScraper.ts # Détail des propositions
└── deputeScraper.ts      # Infos députés
```

## Dépendances

```json
{
  "axios": "^1.13.2",
  "cheerio": "^1.1.2"
}
```

## Utilisation

Les services sont prêts pour injection NestJS. Ajouter `@Injectable()` et injecter dans le constructeur.
