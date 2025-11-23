# 📊 Progression - Implémentation Frontend Law Proposals

**Dernière mise à jour :** 23 novembre 2025 - 22h27
**Statut global :** 🟢 Sprint 1 terminé (40% complété)

---

## ✅ Réalisé

### Backend - Infrastructure
- [x] Migration vers Prisma v7
- [x] Schéma de base de données complet (LawProposal, Depute, Section, Article, Amendement)
- [x] Module de scraping fonctionnel depuis assemblee-nationale.fr
- [x] Limite paramétrable dans le scraper (au lieu de 150 hardcodé)
- [x] Gestion d'erreurs améliorée (messages concis)
- [x] Correction du bug de parsing de dates

### Backend - Endpoints Existants
- [x] `POST /law-proposal/initialize` (scraping admin)
- [x] `POST /law-proposal/process-simplification-queue` (simplification IA)
- [x] `GET /law-proposal/stats` (statistiques globales)
- [x] `GET /law-proposal/recent?limit=X` (propositions récentes)
- [x] `GET /law-proposal/:numero` (détail d'une proposition)

### Documentation
- [x] Spécification complète des données exposables (API_DATA_SPECIFICATION.md)
- [x] Cahier des charges frontend détaillé (ce fichier)

---

## 🔄 En cours

### Backend - Endpoints Complémentaires

**Endpoints REST terminés :**
- ✅ GET `/law-proposal` - Liste paginée avec filtres complets
- ✅ GET `/law-proposal/:numero` - Détail optimisé avec nouveau format

**Endpoints en attente :**
- ⏳ GET `/law-proposal/search` - Recherche textuelle
- ⏳ GET `/depute` - Liste des députés
- ⏳ GET `/depute/:id/proposals` - Propositions d'un député
- ⏳ GET `/groupes-politiques/stats` - Stats par groupe

### Backend - Service de Simplification IA

**État actuel :**
- Structure Prisma adaptée : ✅ FAIT (champ `simplifiedData` JSON)
- Types TypeScript créés : ✅ FAIT (`SimplifiedData` interface)
- DTOs de réponse : ✅ FAIT

**Actions restantes :**
- [ ] Adapter `law-simplification.service.ts` pour générer le JSON structuré
- [ ] Tester la génération IA avec le nouveau format
- [ ] Migrer les données existantes (si applicable)

---

## 🚧 À faire

### Backend - Endpoints Prioritaires

#### 1. Endpoint de Listing avec Filtres ✅ TERMINÉ
**`GET /law-proposal`**

**Query parameters implémentés :**
- [x] `page` (integer, défaut: 1)
- [x] `limit` (integer, défaut: 20, max: 100)
- [x] `sort` (string, défaut: "dateMiseEnLigne:desc")
  - [x] Support de "dateMiseEnLigne:asc|desc"
  - [x] Support de "titre:asc|desc"
  - [x] Support de "numero:asc|desc"
- [x] `filter[groupePolitique]` (string, multi-valeurs séparées par virgule)
- [x] `filter[typeProposition]` (string: "ordinaire" ou "constitutionnelle")
- [x] `filter[dateDebut]` (date ISO 8601)
- [x] `filter[dateFin]` (date ISO 8601)
- [x] `filter[simplificationStatus]` (string: "completed", "pending", "failed")
- [x] `include` (string, défaut: "simplified,auteur")

**Réponse structurée :**
```json
{
  "data": [ /* propositions avec simplified.keyPoints */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

**Contraintes :**
- [ ] Temps de réponse < 500ms pour 20 éléments (à tester)
- [ ] Cache Redis avec TTL 5 minutes (TODO: Sprint 2)
- [ ] Indices DB (TODO: Sprint 2)

**Fichiers modifiés :**
- [x] `src/law-proposal/infrastructure/law-proposal.controller.ts` (nouveau endpoint GET /)
- [x] `src/law-proposal/application/law-proposal.service.ts` (`findAllWithFilters`)
- [x] `src/law-proposal/dtos/law-proposal-list.dto.ts` (DTOs créés)
- [x] `src/law-proposal/dtos/law-proposal-response.dto.ts` (DTOs créés)

---

#### 2. Amélioration Endpoint de Détail ✅ TERMINÉ
**`GET /law-proposal/:numero`**

**Actions réalisées :**
- [x] Utilisation de `@Param` au lieu de `@Query`
- [x] Retour HTTP 404 au lieu d'objet d'erreur
- [x] Inclure `coSignataires` par défaut
- [x] Structure prête pour `simplified` (champ `simplifiedData`)

**Actions restantes (Sprint 2) :**
- [ ] Transformer `simplifiedData` en DTO structuré dans la réponse
- [ ] Temps de réponse < 1000ms (à tester)
- [ ] Cache Redis avec TTL 1 heure

**Fichiers modifiés :**
- [x] `src/law-proposal/infrastructure/law-proposal.controller.ts` (correction @Param + 404)

---

### Backend - Endpoints Supplémentaires (Nice-to-have)

#### 3. Recherche Textuelle
**`GET /api/law-proposals/search`**

- [ ] Paramètre `q` (query string, requis)
- [ ] Paramètre `fields` (array: titre, description, texte)
- [ ] Paramètre `limit` (integer, défaut: 20)
- [ ] Recherche full-text sur titre, description, sections
- [ ] Retour avec score de pertinence

**Fichiers à créer :**
- [ ] `src/law-proposal/application/law-search.service.ts`
- [ ] Route dans le controller

---

#### 4. Liste des Députés
**`GET /api/deputes`**

- [ ] Filtre `groupePolitique` (code)
- [ ] Option `withStats` (nombre de propositions auteur/co-signataire)
- [ ] Pagination

**Fichiers à créer :**
- [ ] `src/law-proposal/application/depute.service.ts`
- [ ] `src/law-proposal/infrastructure/depute.controller.ts`

---

#### 5. Propositions d'un Député
**`GET /api/deputes/:id/proposals`**

- [ ] Filtre `role` (auteur, coSignataire, all)
- [ ] Pagination
- [ ] Tri par date

---

#### 6. Statistiques par Groupe Politique
**`GET /api/groupes-politiques/stats`**

- [ ] Nombre de députés par groupe
- [ ] Nombre de propositions par groupe (auteur + co-signataire)
- [ ] Format pour data viz frontend

---

#### 7. Timeline Temporelle
**`GET /api/law-proposals/timeline`**

- [ ] Paramètres `startDate`, `endDate`
- [ ] Groupement par jour/semaine/mois
- [ ] Comptage par type de proposition

---

### Backend - Service de Simplification IA

#### 8. Adapter la Génération IA
**Fichier :** `src/law-proposal/application/law-simplification.service.ts`

**Modifications requises :**

- [ ] Parser la version simplifiée générée pour extraire :
  - [ ] 3-4 `keyPoints` (phrases clés de 50-100 chars)
  - [ ] 3-5 sections `exposeMotifs` avec `titre` + `texte`
  - [ ] Résumés individuels pour chaque `article`

**Approches possibles :**

**Option A - Prompt IA structuré :**
```typescript
const prompt = `
Simplifie cette proposition de loi en générant un JSON avec cette structure exacte :
{
  "keyPoints": ["point 1 (50-100 chars)", "point 2", "point 3"],
  "exposeMotifs": [
    {
      "ordre": 1,
      "titre": "Titre court (2-5 mots)",
      "texte": "Explication simple (100-200 mots)"
    }
  ],
  "articles": [
    {
      "ordre": 1,
      "numero": "Article 1",
      "resume": "Résumé simple (30-80 mots)"
    }
  ]
}

Texte source :
${propositionComplète}
`;
```

**Option B - Post-processing :**
- Générer une version simplifiée textuelle
- Utiliser un second appel IA pour extraire keyPoints
- Parser manuellement les sections et articles

**Recommandation :** Option A (plus robuste, JSON natif)

---

### Base de Données

#### 9. Adaptation du Schéma Prisma ✅ TERMINÉ

**Fichier :** `prisma/schema.prisma`

**Modifications réalisées - Option 1 JSON natif :**
```prisma
model LawProposal {
  // ... champs existants
  simplifiedData         Json?        // Structure complète simplified (JSONB en PostgreSQL)
  simplificationStatus   String       @default("pending")
  // Supprimés: simplifiedVersion String?, simplifiedAt DateTime?

  @@map("law_proposal")
}
```

**Actions réalisées :**
- [x] Approche choisie : JSON natif (plus simple, performant avec PostgreSQL JSONB)
- [x] Modifier `schema.prisma`
- [x] Migration créée : `20251123212553_replace_simplified_with_json/migration.sql`
- [x] Migration appliquée : `npx prisma migrate deploy`
- [x] Client régénéré : `npx prisma generate`
- [x] Types TypeScript créés : `src/law-proposal/types/simplified.types.ts`

**Migration SQL appliquée :**
```sql
ALTER TABLE "law_proposal" DROP COLUMN IF EXISTS "simplified_version";
ALTER TABLE "law_proposal" DROP COLUMN IF EXISTS "simplified_at";
ALTER TABLE "law_proposal" ADD COLUMN IF NOT EXISTS "simplified_data" JSONB;
```

---

### Performance et Cache

#### 10. Configuration Redis

**Fichier à créer :** `src/law-proposal/infrastructure/cache.service.ts`

**Stratégies de cache :**
- [ ] Cache sur `/law-proposals` (liste) : TTL 5 minutes
- [ ] Cache sur `/law-proposals/:numero` : TTL 1 heure
- [ ] Cache sur `/law-proposals/stats` : TTL 10 minutes
- [ ] Invalidation lors de nouveaux scrapings

**Exemple d'implémentation :**
```typescript
@Injectable()
export class CacheService {
  constructor(@Inject('REDIS_CLIENT') private redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

**Actions :**
- [ ] Ajouter `ioredis` aux dépendances (déjà installé)
- [ ] Créer `CacheModule` avec configuration Redis
- [ ] Implémenter `CacheService`
- [ ] Ajouter `@UseInterceptors(CacheInterceptor)` sur les endpoints publics
- [ ] Configurer les TTL par endpoint

---

#### 11. Optimisation Base de Données

**Indices à ajouter :**
```sql
-- Déjà existant : index sur numero (UNIQUE)
-- À ajouter :

CREATE INDEX idx_law_proposal_date ON law_proposal(date_mise_en_ligne DESC);
CREATE INDEX idx_law_proposal_type ON law_proposal(type_proposition);
CREATE INDEX idx_law_proposal_status ON law_proposal(simplification_status);
CREATE INDEX idx_law_proposal_auteur ON law_proposal(auteur_id);

CREATE INDEX idx_depute_groupe ON depute(groupe_politique_code);
CREATE INDEX idx_depute_nom ON depute(nom);
```

**Actions :**
- [ ] Créer une migration Prisma avec `@@index` directives
- [ ] Analyser les plans d'exécution des requêtes avec EXPLAIN
- [ ] Optimiser les requêtes N+1 avec `include` Prisma

---

### CORS et Sécurité

#### 12. Configuration CORS

**Fichier :** `src/main.ts`

**État actuel :**
```typescript
app.enableCors(); // Trop permissif
```

**À configurer :**
```typescript
app.enableCors({
  origin: [
    'http://localhost:3000', // Dev frontend
    'https://athena.example.com', // Prod frontend
  ],
  methods: ['GET', 'POST'],
  credentials: true,
  maxAge: 3600,
});
```

**Actions :**
- [ ] Définir les origines autorisées (variables d'environnement)
- [ ] Restreindre les méthodes HTTP
- [ ] Tester depuis le frontend

---

#### 13. Rate Limiting

**Package recommandé :** `@nestjs/throttler`

**Actions :**
- [ ] Installer `npm install @nestjs/throttler`
- [ ] Configurer le module :
```typescript
ThrottlerModule.forRoot({
  ttl: 60, // 60 secondes
  limit: 100, // 100 requêtes
}),
```
- [ ] Appliquer `@UseGuards(ThrottlerGuard)` sur les endpoints publics
- [ ] Exclure les endpoints admin (protégés autrement)

---

#### 14. Validation des Query Parameters

**Package :** `class-validator` + `class-transformer` (déjà utilisés par NestJS)

**Actions :**
- [ ] Créer des DTOs pour chaque endpoint :
  - [ ] `ListLawProposalsQueryDto`
  - [ ] `SearchLawProposalsQueryDto`
- [ ] Ajouter les décorateurs de validation :
```typescript
export class ListLawProposalsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(['dateMiseEnLigne:asc', 'dateMiseEnLigne:desc', 'titre:asc', 'titre:desc'])
  sort?: string = 'dateMiseEnLigne:desc';

  @IsOptional()
  @IsString()
  'filter[groupePolitique]'?: string;

  // etc.
}
```
- [ ] Appliquer dans le controller avec `@Query() query: ListLawProposalsQueryDto`

---

### Documentation

#### 15. Spécification OpenAPI/Swagger

**Package :** `@nestjs/swagger`

**Actions :**
- [ ] Installer `npm install @nestjs/swagger`
- [ ] Configurer Swagger dans `main.ts` :
```typescript
const config = new DocumentBuilder()
  .setTitle('Athena Law Proposals API')
  .setDescription('API publique pour consulter les propositions de loi')
  .setVersion('1.0')
  .addTag('law-proposals')
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```
- [ ] Ajouter les décorateurs sur chaque endpoint :
```typescript
@ApiOperation({ summary: 'Liste des propositions de loi' })
@ApiResponse({ status: 200, description: 'Liste paginée', type: LawProposalListDto })
@ApiQuery({ name: 'page', required: false, type: Number })
@Get()
async list(@Query() query: ListLawProposalsQueryDto) { ... }
```
- [ ] Documenter tous les DTOs avec `@ApiProperty()`
- [ ] Tester la doc sur `/api/docs`

---

#### 16. README Frontend-Friendly

**Fichier à créer :** `FRONTEND_API_GUIDE.md`

**Contenu :**
- [ ] Quick start avec exemples cURL
- [ ] Exemples de code JavaScript/TypeScript
- [ ] Guide des codes d'erreur
- [ ] Exemples de réponses pour chaque endpoint
- [ ] Guide de filtrage et tri
- [ ] Best practices (cache côté client, pagination, etc.)

---

### Tests

#### 17. Tests E2E des Endpoints Publics

**Fichiers à créer :**
- [ ] `test/law-proposal-public-api.e2e-spec.ts`

**Cas de test prioritaires :**
- [ ] GET /law-proposals (sans filtres)
- [ ] GET /law-proposals (avec filtres multiples)
- [ ] GET /law-proposals (pagination limite max)
- [ ] GET /law-proposals/:numero (proposition existante)
- [ ] GET /law-proposals/:numero (proposition inexistante → 404)
- [ ] GET /law-proposals/stats
- [ ] Validation des query parameters (valeurs invalides → 400)
- [ ] Rate limiting (dépassement → 429)

**Actions :**
- [ ] Configurer la base de données de test avec données de seed
- [ ] Créer des fixtures représentatives
- [ ] Exécuter les tests : `npm run test:e2e`

---

## 📅 Planning Suggéré

### Sprint 1 (Semaine 1) - Fondations
**Objectif :** API de base fonctionnelle pour le feed

- [ ] Tâche 9 : Adaptation schéma Prisma (JSON `simplifiedData`)
- [ ] Tâche 8 : Adapter service IA pour générer structure JSON
- [ ] Tâche 1 : Endpoint `/api/law-proposals` avec pagination de base
- [ ] Tâche 2 : Améliorer endpoint `/api/law-proposals/:numero`
- [ ] Tâche 12 : Configuration CORS
- [ ] Tâche 13 : Rate limiting

**Livrable :** Frontend peut afficher un feed de propositions avec keyPoints

---

### Sprint 2 (Semaine 2) - Filtres et Performance
**Objectif :** Fonctionnalités avancées du listing

- [ ] Tâche 1 (suite) : Filtres et tri sur `/api/law-proposals`
- [ ] Tâche 10 : Cache Redis
- [ ] Tâche 11 : Optimisation DB (indices)
- [ ] Tâche 14 : Validation des query parameters
- [ ] Tâche 17 : Tests E2E

**Livrable :** Frontend peut filtrer et trier les propositions

---

### Sprint 3 (Semaine 3) - Enrichissement
**Objectif :** Fonctionnalités secondaires

- [ ] Tâche 3 : Recherche textuelle
- [ ] Tâche 4 : Liste des députés
- [ ] Tâche 5 : Propositions d'un député
- [ ] Tâche 6 : Stats par groupe politique
- [ ] Tâche 7 : Timeline

**Livrable :** Frontend a toutes les fonctionnalités de v1

---

### Sprint 4 (Semaine 4) - Polissage
**Objectif :** Documentation et stabilisation

- [ ] Tâche 15 : Documentation Swagger
- [ ] Tâche 16 : README frontend
- [ ] Tests supplémentaires
- [ ] Monitoring (logs, métriques)
- [ ] Optimisations finales

**Livrable :** API production-ready

---

## 🔍 Points de Décision

### Décision 1 : Format du champ `simplified`
**Options :**
- A) JSON natif dans PostgreSQL (`simplifiedData Json`)
- B) Tables dédiées normalisées

**Recommandation :** Option A
**Justification :**
- Plus simple à implémenter
- Performances équivalentes avec PostgreSQL JSONB
- Pas besoin de jointures complexes
- Flexibilité pour ajuster la structure

**Décision finale :** ⏳ En attente

---

### Décision 2 : Service de Simplification IA
**Options :**
- A) Prompt IA retournant du JSON structuré directement
- B) Génération texte puis parsing/extraction

**Recommandation :** Option A
**Justification :**
- Format garanti cohérent
- Moins de post-processing
- Prompts modernes (GPT-4, Claude) gèrent bien le JSON

**Décision finale :** ⏳ En attente

---

### Décision 3 : Versionning de l'API
**Question :** Faut-il préfixer l'API avec `/api/v1/` ?

**Recommandation :** Oui
**Justification :**
- Facilite les évolutions futures
- Standard de l'industrie
- Permet rétrocompatibilité

**Décision finale :** ⏳ En attente

---

## 📞 Questions pour l'Équipe Produit

1. **Priorisation :** Quelles fonctionnalités sont bloquantes pour le lancement v1 ?
   - Feed avec filtres ?
   - Recherche textuelle ?
   - Pages députés ?

2. **Performance :** Quelle est la volumétrie attendue ?
   - Nombre d'utilisateurs simultanés ?
   - Besoins de cache côté CDN ?

3. **Simplification IA :** Quel service IA utiliser ?
   - OpenAI GPT-4 ?
   - Azure OpenAI ?
   - Autre (Claude, Mistral) ?

4. **Juridique :** Y a-t-il des contraintes légales sur la simplification ?
   - Disclaimer "Version simplifiée non officielle" ?
   - Validation par experts ?

---

## 📊 Métriques de Succès

### Performance
- [ ] Temps de réponse `/law-proposals` < 500ms (p95)
- [ ] Temps de réponse `/law-proposals/:numero` < 1000ms (p95)
- [ ] Taux de cache hit > 80%

### Qualité
- [ ] 100% des endpoints documentés dans Swagger
- [ ] Couverture de tests > 80%
- [ ] 0 erreurs 5xx en production

### Adoption Frontend
- [ ] 100% des besoins frontend couverts par l'API
- [ ] Temps d'intégration frontend < 2 semaines

---

**Prochaine révision :** [Date à définir]
**Responsable Backend :** [À définir]
**Responsable Frontend :** [À définir]
