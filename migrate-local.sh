#!/bin/bash

# Script de migration MySQL local → PostgreSQL local
# Copie toutes les tables sauf content_embedding (sera regénéré)

set -e  # Exit on error

MYSQL_CONTAINER="super_proper-db-1"
MYSQL_USER="root"
MYSQL_PASS="example"
MYSQL_DB="athena"

PG_CONTAINER="athena_api-db-1"
PG_USER="athenauser"
PG_DB="athena"

echo "🔄 Migration MySQL local → PostgreSQL local"
echo ""

# 1. Migrer les 4 tables simples
echo "📦 Migration des tables simples (audio, image, list_meta_media, meta_media)..."

for table in audio image list_meta_media meta_media; do
  echo "  → $table..."

  docker exec $MYSQL_CONTAINER \
    mysqldump -u$MYSQL_USER -p$MYSQL_PASS \
    --skip-extended-insert \
    --no-create-info \
    --skip-triggers \
    --compact \
    $MYSQL_DB $table 2>/dev/null \
    | sed 's/`//g' \
    | docker exec -i $PG_CONTAINER \
    psql -U $PG_USER -d $PG_DB 2>&1 | grep -E "INSERT|ERROR" || true
done

echo ""
echo "📝 Migration de la table meta_media avec colonnes camelCase..."

docker exec $MYSQL_CONTAINER \
  mysqldump -u$MYSQL_USER -p$MYSQL_PASS \
  --complete-insert \
  --skip-extended-insert \
  --no-create-info \
  --skip-triggers \
  --compact \
  $MYSQL_DB meta_media 2>/dev/null \
  | sed 's/`//g' \
  | sed 's/listMetaMediaId/"listMetaMediaId"/g' \
  | docker exec -i $PG_CONTAINER \
  psql -U $PG_USER -d $PG_DB 2>&1 | grep -E "INSERT|ERROR" || true

echo ""
echo "📄 Migration de la table content..."

# Export avec UTF-8
docker exec $MYSQL_CONTAINER \
  bash -c "mysql -u$MYSQL_USER -p$MYSQL_PASS -D $MYSQL_DB --default-character-set=utf8mb4 -B -e 'SELECT * FROM content'" \
  > /tmp/content_local.tsv 2>/dev/null

# Retirer l'en-tête
tail -n +2 /tmp/content_local.tsv > /tmp/content_local_no_header.tsv

# Nettoyer les CRLF
sed -i '' 's/\r//g' /tmp/content_local_no_header.tsv 2>/dev/null || sed -i 's/\r//g' /tmp/content_local_no_header.tsv

# Copier dans PostgreSQL
docker cp /tmp/content_local_no_header.tsv $PG_CONTAINER:/tmp/content.tsv

# Importer (ordre MySQL: id, contentId, title, contentType, description, plainText, publishedAt, metaMediaId, imageId, audioId)
docker exec $PG_CONTAINER \
  psql -U $PG_USER -d $PG_DB -c "COPY content(id, \"contentId\", title, \"contentType\", description, \"plainText\", \"publishedAt\", \"metaMediaId\", \"imageId\", \"audioId\") FROM '/tmp/content.tsv' WITH (NULL 'NULL');" 2>&1

echo ""
echo "🔢 Reset des séquences..."

docker exec $PG_CONTAINER psql -U $PG_USER -d $PG_DB << 'EOF'
SELECT setval('content_id_seq', (SELECT COALESCE(MAX(id), 1) FROM content));
SELECT setval('meta_media_id_seq', (SELECT COALESCE(MAX(id), 1) FROM meta_media));
SELECT setval('audio_id_seq', (SELECT COALESCE(MAX(id), 1) FROM audio));
SELECT setval('image_id_seq', (SELECT COALESCE(MAX(id), 1) FROM image));
SELECT setval('list_meta_media_id_seq', (SELECT COALESCE(MAX(id), 1) FROM list_meta_media));
EOF

echo ""
echo "🎯 Setup pgvector + index HNSW..."

docker exec $PG_CONTAINER psql -U $PG_USER -d $PG_DB << 'EOF'
-- Activer pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Convertir la colonne embedding en vector(1536)
ALTER TABLE content_embedding
  ALTER COLUMN embedding TYPE vector(1536)
  USING embedding::vector(1536);

-- Créer l'index HNSW
CREATE INDEX IF NOT EXISTS idx_embedding_hnsw
  ON content_embedding
  USING hnsw (embedding vector_cosine_ops);
EOF

echo ""
echo "📊 Vérification des données..."

docker exec $PG_CONTAINER psql -U $PG_USER -d $PG_DB -c "
SELECT 'audio' as table_name, COUNT(*) FROM audio
UNION ALL SELECT 'image', COUNT(*) FROM image
UNION ALL SELECT 'list_meta_media', COUNT(*) FROM list_meta_media
UNION ALL SELECT 'meta_media', COUNT(*) FROM meta_media
UNION ALL SELECT 'content', COUNT(*) FROM content
UNION ALL SELECT 'content_embedding', COUNT(*) FROM content_embedding;
"

echo ""
echo "✅ Migration terminée !"
echo ""
echo "Pour tester l'API Q&A :"
echo "  npm run start:dev"
echo "  ./test-qa.sh \"Votre question\""
