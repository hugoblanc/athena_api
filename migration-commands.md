# Commandes de migration MySQL → PostgreSQL

## Vider les tables avant import (si nécessaire)

```bash
docker exec srv-captain--athena-postgres.1.m8l3jg6o59u1fzmeptv0s1cnc psql -U root -d athena -c "TRUNCATE TABLE content CASCADE;"
```

## Nettoyer le fichier TSV des caractères CRLF

```bash
sed -i 's/\r//g' content_utf8_no_header.tsv
docker cp content_utf8_no_header.tsv srv-captain--athena-postgres.1.m8l3jg6o59u1fzmeptv0s1cnc:/tmp/content.tsv
```

## Importer la table content avec le bon ordre de colonnes

```bash
docker exec srv-captain--athena-postgres.1.m8l3jg6o59u1fzmeptv0s1cnc psql -U root -d athena -c "COPY content(id, \"contentId\", title, \"metaMediaId\", \"imageId\", \"contentType\", \"publishedAt\", description, \"audioId\", \"plainText\") FROM '/tmp/content.tsv' WITH (NULL 'NULL');"
```

## Vérifier les données importées

```bash
docker exec srv-captain--athena-postgres.1.m8l3jg6o59u1fzmeptv0s1cnc psql -U root -d athena -c "SELECT COUNT(*) FROM content;"
```

## Vérifier toutes les tables

```bash
docker exec srv-captain--athena-postgres.1.m8l3jg6o59u1fzmeptv0s1cnc psql -U root -d athena -c "SELECT 'audio' as table_name, COUNT(*) FROM audio UNION ALL SELECT 'image', COUNT(*) FROM image UNION ALL SELECT 'list_meta_media', COUNT(*) FROM list_meta_media UNION ALL SELECT 'meta_media', COUNT(*) FROM meta_media UNION ALL SELECT 'content', COUNT(*) FROM content;"
```

## Reset des séquences (après migration)

```bash
docker exec srv-captain--athena-postgres.1.m8l3jg6o59u1fzmeptv0s1cnc psql -U root -d athena << 'EOF'
SELECT setval('content_id_seq', (SELECT MAX(id) FROM content));
SELECT setval('meta_media_id_seq', (SELECT MAX(id) FROM meta_media));
SELECT setval('audio_id_seq', (SELECT MAX(id) FROM audio));
SELECT setval('image_id_seq', (SELECT MAX(id) FROM image));
SELECT setval('list_meta_media_id_seq', (SELECT MAX(id) FROM list_meta_media));
EOF
```

## Setup pgvector + index HNSW (après migration)

```bash
docker exec srv-captain--athena-postgres.1.m8l3jg6o59u1fzmeptv0s1cnc psql -U root -d athena << 'EOF'
-- Activer pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Convertir la colonne embedding en vector(1536)
ALTER TABLE content_embedding
  ALTER COLUMN embedding TYPE vector(1536)
  USING embedding::vector;

-- Créer l'index HNSW
CREATE INDEX idx_embedding_hnsw
  ON content_embedding
  USING hnsw (embedding vector_cosine_ops);
EOF
```

## Vérifier la structure finale

```bash
docker exec srv-captain--athena-postgres.1.m8l3jg6o59u1fzmeptv0s1cnc psql -U root -d athena -c "\d content_embedding"
```
