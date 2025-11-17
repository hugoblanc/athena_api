# Migration des données MySQL → PostgreSQL + pgvector

Ce guide détaille la procédure pour migrer toutes les données de MySQL vers PostgreSQL sans perte de données.

## Étape 1: Dump des données MySQL

### 1.1 Se connecter au serveur MySQL de production

```bash
# Via Caprover ou directement sur le serveur MySQL
mysql -h <MYSQL_HOST> -u athenauser -p athena
```

### 1.2 Exporter les données en SQL

```bash
# Dump complet (structure + données)
mysqldump -h <MYSQL_HOST> -u athenauser -p \
  --single-transaction \
  --skip-set-charset \
  --skip-triggers \
  athena > mysql_dump.sql

# OU dump données uniquement (si TypeORM a déjà créé la structure Postgres)
mysqldump -h <MYSQL_HOST> -u athenauser -p \
  --no-create-info \
  --skip-triggers \
  --single-transaction \
  athena > mysql_data_dump.sql
```

## Étape 2: Transformation du dump pour PostgreSQL

Le dump MySQL doit être adapté pour PostgreSQL. Créer un script Python pour automatiser cela:

### 2.1 Script de transformation

```python
#!/usr/bin/env python3
"""
migrate_mysql_to_postgres.py
Transforme le dump MySQL en format compatible PostgreSQL
"""

import re
import sys

def transform_dump(input_file, output_file):
    """Transforme le dump MySQL en dump PostgreSQL compatible"""

    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Supprimer les commandes MySQL spécifiques
    content = re.sub(r'/\*!40\d{3}.*?\*/;', '', content, flags=re.DOTALL)
    content = re.sub(r'SET @.*?;', '', content)
    content = re.sub(r'SET SQL_MODE.*?;', '', content)
    content = re.sub(r'LOCK TABLES.*?;', '', content)
    content = re.sub(r'UNLOCK TABLES;', '', content)

    # 2. Remplacer les backticks par des guillemets doubles
    content = content.replace('`', '"')

    # 3. Convertir les INSERT avec valeurs multiples en INSERT séparés
    # (plus safe pour PostgreSQL)
    insert_pattern = r'INSERT INTO "(\w+)" VALUES\s*\((.*?)\);'

    def split_inserts(match):
        table = match.group(1)
        values = match.group(2)

        # Découper les tuples de valeurs
        # Note: cette regex simple peut nécessiter des ajustements selon les données
        value_tuples = re.findall(r'\([^)]+\)', values)

        if len(value_tuples) <= 1:
            return f'INSERT INTO "{table}" VALUES {values};'

        # Générer un INSERT par tuple
        inserts = []
        for tuple_val in value_tuples:
            inserts.append(f'INSERT INTO "{table}" VALUES {tuple_val};')

        return '\n'.join(inserts)

    content = re.sub(insert_pattern, split_inserts, content, flags=re.DOTALL)

    # 4. Adapter les types de données spécifiques
    # MySQL 'longtext' → PostgreSQL 'text' (déjà géré dans les entities)

    # 5. Convertir les booléens MySQL (0/1) en PostgreSQL (false/true)
    # Note: dépend de vos colonnes booléennes

    # 6. Gérer les séquences AUTO_INCREMENT
    # PostgreSQL utilise des SERIAL, TypeORM gère déjà avec synchronize: true

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"✅ Transformation terminée: {output_file}")

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: python3 migrate_mysql_to_postgres.py input.sql output.sql")
        sys.exit(1)

    transform_dump(sys.argv[1], sys.argv[2])
```

### 2.2 Exécuter la transformation

```bash
python3 migrate_mysql_to_postgres.py mysql_data_dump.sql postgres_data.sql
```

## Étape 3: Import dans PostgreSQL

### 3.1 Préparation de la base PostgreSQL

```bash
# Se connecter au PostgreSQL de production (Caprover)
psql -h <POSTGRES_HOST> -U athenauser -d athena

# OU localement
psql -h localhost -U athenauser -d athena
```

### 3.2 Vider les tables existantes (si nécessaire)

```sql
-- Attention: supprime toutes les données!
TRUNCATE TABLE content_embedding CASCADE;
TRUNCATE TABLE content CASCADE;
TRUNCATE TABLE meta_media CASCADE;
-- ... autres tables selon votre schéma
```

### 3.3 Import du dump transformé

```bash
# Option 1: Via psql
psql -h <POSTGRES_HOST> -U athenauser -d athena < postgres_data.sql

# Option 2: Via docker (si PostgreSQL en container local)
docker exec -i athena_api-db-1 psql -U athenauser -d athena < postgres_data.sql
```

## Étape 4: Traitement spécial des embeddings

Les embeddings nécessitent une conversion spéciale car:
- MySQL stocke: `'{"0":0.123,"1":-0.456,...}'` (JSON)
- PostgreSQL pgvector nécessite: `'[0.123,-0.456,...]'` (format vecteur)

### 4.1 Script de conversion des embeddings

```sql
-- Conversion des embeddings JSON MySQL → format pgvector
-- À exécuter APRÈS l'import des données

-- Vérifier le format actuel
SELECT id, chunkIndex, LEFT(embedding, 100) as embedding_sample
FROM content_embedding
LIMIT 3;

-- Si les embeddings sont en format JSON (depuis MySQL):
-- On doit les convertir en format array PostgreSQL

-- Créer une fonction temporaire de conversion
CREATE OR REPLACE FUNCTION json_to_vector_array(json_text TEXT)
RETURNS TEXT AS $$
DECLARE
    json_obj JSON;
    result TEXT[];
    i INTEGER;
BEGIN
    -- Parser le JSON
    json_obj := json_text::JSON;

    -- Extraire les valeurs dans l'ordre (0, 1, 2, ...)
    FOR i IN 0..1535 LOOP
        result[i+1] := (json_obj->i::TEXT)::TEXT;
    END LOOP;

    -- Retourner au format '[x,y,z,...]'
    RETURN '[' || array_to_string(result, ',') || ']';
END;
$$ LANGUAGE plpgsql;

-- Appliquer la conversion sur toutes les lignes
UPDATE content_embedding
SET embedding = json_to_vector_array(embedding)
WHERE embedding IS NOT NULL
  AND embedding LIKE '{%';  -- Détecter format JSON

-- Nettoyer
DROP FUNCTION json_to_vector_array(TEXT);
```

### 4.2 Conversion de la colonne en type vector(1536)

```sql
-- Activer pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Convertir la colonne text → vector(1536)
ALTER TABLE content_embedding
  ALTER COLUMN embedding TYPE vector(1536)
  USING embedding::vector;

-- Créer l'index HNSW
CREATE INDEX idx_embedding_hnsw
  ON content_embedding
  USING hnsw (embedding vector_cosine_ops);
```

## Étape 5: Vérification de l'intégrité

### 5.1 Vérifier les comptages

```sql
-- Comparer le nombre de lignes importées
SELECT 'meta_media' as table_name, COUNT(*) FROM meta_media
UNION ALL
SELECT 'content', COUNT(*) FROM content
UNION ALL
SELECT 'content_embedding', COUNT(*) FROM content_embedding
UNION ALL
SELECT 'qa_jobs', COUNT(*) FROM qa_jobs;

-- Comparer avec les comptages MySQL
-- (exécuter la même requête sur MySQL avant migration)
```

### 5.2 Vérifier les embeddings

```sql
-- Vérifier le type et l'index
\d content_embedding

-- Devrait afficher:
-- embedding | vector(1536) |
-- Index: idx_embedding_hnsw hnsw (embedding vector_cosine_ops)

-- Vérifier quelques embeddings
SELECT
    id,
    chunkIndex,
    array_length(embedding::real[], 1) as embedding_dimension,
    embedding[1:3] as first_3_values
FROM content_embedding
LIMIT 5;

-- Devrait retourner dimension = 1536
```

### 5.3 Test de recherche vectorielle

```sql
-- Test d'une recherche par similarité cosinus
-- (remplacer [...] par un vrai vecteur de test)
SELECT
    c.title,
    ce.chunkText,
    1 - (ce.embedding <=> '[0.1,0.2,...]'::vector) as similarity
FROM content_embedding ce
JOIN content c ON ce."contentId" = c.id
ORDER BY ce.embedding <=> '[0.1,0.2,...]'::vector
LIMIT 5;
```

## Étape 6: Reset des séquences AUTO_INCREMENT

PostgreSQL utilise des séquences pour les colonnes auto-incrémentées. Après import, il faut les réinitialiser:

```sql
-- Reset des séquences pour éviter les conflits de clés primaires
SELECT setval('content_embedding_id_seq', (SELECT MAX(id) FROM content_embedding));
SELECT setval('content_id_seq', (SELECT MAX(id) FROM content));
SELECT setval('meta_media_id_seq', (SELECT MAX(id) FROM meta_media));
-- Ajouter pour toutes les tables avec id auto-incrémenté
```

## Étape 7: Déploiement en production

Une fois la migration testée localement:

1. **Backup de sécurité**
   ```bash
   # Backup MySQL avant migration
   mysqldump -h <MYSQL_HOST> -u athenauser -p athena > backup_before_migration.sql
   ```

2. **Mode maintenance**
   - Activer le mode maintenance sur l'app
   - Arrêter les workers qui créent du contenu

3. **Migration production**
   - Exécuter les étapes 1-6 sur la production
   - Tester l'API Q&A

4. **Mise à jour de l'app**
   ```bash
   git push origin master
   # Redéployer sur Caprover
   # Vérifier que les variables d'env pointent vers PostgreSQL
   ```

5. **Tests de smoke**
   - Tester GET /qa/history
   - Tester POST /qa/ask avec une vraie question
   - Vérifier les logs

6. **Désactiver mode maintenance**

## Notes importantes

- **Temps d'arrêt**: prévoir 30-60 min selon volume de données
- **Backup**: toujours garder le dump MySQL en sécurité
- **Rollback**: garder MySQL actif quelques jours en read-only
- **Embeddings**: la conversion JSON→vector est la partie la plus critique
- **Index HNSW**: la création peut prendre plusieurs minutes si beaucoup d'embeddings

## Dépannage

### Erreur: "invalid input syntax for type vector"

Les embeddings ne sont pas au bon format. Vérifier:
```sql
SELECT embedding FROM content_embedding LIMIT 1;
-- Doit être: [0.123,-0.456,...]
-- Pas: {"0":0.123,"1":-0.456}
```

### Erreur: "dimension mismatch"

Un embedding n'a pas 1536 dimensions:
```sql
-- Trouver les embeddings invalides
SELECT id, array_length(embedding::text::real[], 1) as dim
FROM content_embedding
WHERE array_length(embedding::text::real[], 1) != 1536;
```

### Performance dégradée

Vérifier que l'index HNSW existe:
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'content_embedding';
```
