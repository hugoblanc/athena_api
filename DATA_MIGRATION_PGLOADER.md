# Migration MySQL → PostgreSQL avec pgloader

Migration simplifiée sans embeddings (resynchronisation après migration).

## Prérequis

### Installer pgloader

```bash
# macOS
brew install pgloader

# Ubuntu/Debian
apt-get install pgloader

# Docker (si pas d'installation locale)
docker pull dimitri/pgloader
```

## Migration avec pgloader

### Option 1: Commande directe

```bash
pgloader mysql://root:10V7x7j6iQTWk9@mysql-host:3306/athena \
          postgresql://root:10V7x7j6iQTWk9@postgres-host:5432/athena
```

### Option 2: Fichier de configuration (recommandé)

Créer `migration.load`:

```lisp
LOAD DATABASE
    FROM mysql://athenauser:password@mysql-host:3306/athena
    INTO postgresql://athenauser:password@postgres-host:5432/athena

WITH include drop, create tables, create indexes, reset sequences

EXCLUDING TABLE NAMES MATCHING 'content_embedding'

CAST type datetime to timestamptz
     drop default drop not null using zero-dates-to-null,
     type date drop not null drop default using zero-dates-to-null

ALTER SCHEMA 'athena' RENAME TO 'public'

;
```

**Explications :**

- `include drop, create tables` : pgloader crée les tables PostgreSQL
- `EXCLUDING TABLE NAMES MATCHING 'content_embedding'` : on skip les embeddings, ils seront regénérés
- `CAST type datetime to timestamptz` : conversion auto des dates MySQL
- `reset sequences` : fix les AUTO_INCREMENT pour PostgreSQL

Exécuter :

```bash
pgloader migration.load
```

### Option 3: Via Docker

```bash
docker run --rm -it \
  -v $(pwd)/migration.load:/migration.load \
  dimitri/pgloader \
  pgloader /migration.load
```

## Après migration

### 1. Vérifier les données

```bash
psql -h postgres-host -U athenauser -d athena
```

```sql
-- Compter les lignes
SELECT 'meta_media' as table_name, COUNT(*) FROM meta_media
UNION ALL
SELECT 'content', COUNT(*) FROM content
UNION ALL
SELECT 'image', COUNT(*) FROM image
UNION ALL
SELECT 'audio', COUNT(*) FROM audio;
```

### 2. Activer pgvector

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Modifier la table content_embedding

Si TypeORM a créé la table avec le mauvais type :

```sql
-- Vider la table (sera remplie par resync)
TRUNCATE TABLE content_embedding;

-- Convertir la colonne en vector(1536)
ALTER TABLE content_embedding
  ALTER COLUMN embedding TYPE vector(1536)
  USING embedding::vector;

-- Créer l'index HNSW
CREATE INDEX idx_embedding_hnsw
  ON content_embedding
  USING hnsw (embedding vector_cosine_ops);
```

### 4. Resynchroniser les embeddings

Deux options :

**Option A : Via endpoint API (si existant)**

```bash
# Si vous avez un endpoint de resync
curl -X POST http://localhost:3001/embeddings/resync-all
```

**Option B : Via script**

Créer un script qui :

1. Lit tous les `Content` avec `plainText`
2. Pour chaque content, appelle `EmbeddingsService.generateAndStoreEmbeddings()`

```typescript
// scripts/resync-embeddings.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { EmbeddingsService } from '../src/content/application/embeddings.service';
import { ContentRepository } from '../src/content/infrastructure/content.repository';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const embeddingsService = app.get(EmbeddingsService);
  const contentRepository = app.get(ContentRepository);

  // Récupérer tous les contents avec plainText
  const contents = await contentRepository.find({
    where: { plainText: Not(IsNull()) },
    select: ['id', 'contentId', 'plainText'],
  });

  console.log(`Found ${contents.length} contents to process`);

  let processed = 0;
  for (const content of contents) {
    try {
      await embeddingsService.generateAndStoreEmbeddings(
        content.id,
        content.plainText,
      );
      processed++;
      console.log(`✅ ${processed}/${contents.length} - ${content.contentId}`);
    } catch (error) {
      console.error(`❌ Error processing ${content.contentId}:`, error.message);
    }
  }

  console.log(`\n✅ Resync completed: ${processed}/${contents.length}`);
  await app.close();
}

bootstrap();
```

Exécuter :

```bash
npm run build
node dist/scripts/resync-embeddings.js
```

## Procédure production

1. **Backup MySQL**

   ```bash
   mysqldump -h mysql-host -u athenauser -p athena > backup.sql
   ```

2. **Mode maintenance** (optionnel si peu de trafic)

3. **Migration pgloader**

   ```bash
   pgloader migration.load
   ```

4. **Setup pgvector + index**

   ```sql
   -- Voir étape 2 et 3 ci-dessus
   ```

5. **Déployer l'app sur PostgreSQL**

   - Push code
   - Update env vars sur Caprover
   - Redeploy

6. **Resync embeddings en background**

   ```bash
   # Via SSH sur le serveur Caprover
   node dist/scripts/resync-embeddings.js
   ```

7. **Tests**

8. **Fin mode maintenance**

## Avantages de cette approche

- Pas de conversion manuelle des embeddings
- pgloader gère automatiquement :
  - Les différences de types MySQL/PostgreSQL
  - Les séquences AUTO_INCREMENT
  - Les index (recréés automatiquement)
  - Les contraintes foreign key
- Moins de risque d'erreur
- Temps de migration réduit
- Les embeddings seront fraîchement régénérés (au cas où le modèle OpenAI a évolué)

## Temps estimé

- Migration pgloader : 5-15 min (selon volume)
- Resync embeddings : 15-30 min pour ~9000 articles
  - Coût OpenAI : ~$0.50 pour 9000 articles (text-embedding-3-small)
