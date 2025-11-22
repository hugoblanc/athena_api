#!/bin/bash

# Script pour fixer le type de colonne embedding en production
# Ce script doit être exécuté après avoir déployé le code avec synchronize: false

set -e

echo "🔧 Fix production embedding column type"
echo ""

PG_CONTAINER="srv-captain--athena-api-db"
PG_USER="athenauser"
PG_DB="athena"

echo "📊 Vérification du type actuel de la colonne embedding..."
CURRENT_TYPE=$(docker exec $PG_CONTAINER psql -U $PG_USER -d $PG_DB -t -c "
SELECT data_type
FROM information_schema.columns
WHERE table_name = 'content_embedding'
AND column_name = 'embedding';
" | xargs)

echo "Type actuel: $CURRENT_TYPE"
echo ""

if [ "$CURRENT_TYPE" = "text" ]; then
  echo "⚠️  La colonne est de type 'text', conversion nécessaire..."
  echo ""

  # 1. Supprimer l'index HNSW s'il existe
  echo "🗑️  Suppression de l'ancien index HNSW (s'il existe)..."
  docker exec $PG_CONTAINER psql -U $PG_USER -d $PG_DB -c "DROP INDEX IF EXISTS idx_embedding_hnsw;" 2>/dev/null || true

  # 2. Convertir la colonne
  echo "🔄 Conversion de la colonne embedding en vector(1536)..."
  docker exec $PG_CONTAINER psql -U $PG_USER -d $PG_DB -c "
ALTER TABLE content_embedding
  ALTER COLUMN embedding TYPE vector(1536)
  USING embedding::vector(1536);
"

  # 3. Recréer l'index HNSW
  echo "📈 Création de l'index HNSW..."
  docker exec $PG_CONTAINER psql -U $PG_USER -d $PG_DB -c "
CREATE INDEX idx_embedding_hnsw
  ON content_embedding
  USING hnsw (embedding vector_cosine_ops);
"

  echo ""
  echo "✅ Conversion terminée !"

elif [ "$CURRENT_TYPE" = "USER-DEFINED" ]; then
  echo "✅ La colonne est déjà de type vector(1536)"

  # Vérifier que l'index existe
  echo ""
  echo "🔍 Vérification de l'index HNSW..."
  INDEX_EXISTS=$(docker exec $PG_CONTAINER psql -U $PG_USER -d $PG_DB -t -c "
SELECT COUNT(*)
FROM pg_indexes
WHERE tablename = 'content_embedding'
AND indexname = 'idx_embedding_hnsw';
" | xargs)

  if [ "$INDEX_EXISTS" = "0" ]; then
    echo "⚠️  L'index HNSW n'existe pas, création..."
    docker exec $PG_CONTAINER psql -U $PG_USER -d $PG_DB -c "
CREATE INDEX idx_embedding_hnsw
  ON content_embedding
  USING hnsw (embedding vector_cosine_ops);
"
    echo "✅ Index créé !"
  else
    echo "✅ L'index HNSW existe déjà."
  fi

else
  echo "⚠️  Type inattendu: $CURRENT_TYPE"
  exit 1
fi

echo ""
echo "📊 État final:"
docker exec $PG_CONTAINER psql -U $PG_USER -d $PG_DB -c "
SELECT
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'content_embedding'
AND column_name = 'embedding';
"

echo ""
echo "📈 Index disponibles:"
docker exec $PG_CONTAINER psql -U $PG_USER -d $PG_DB -c "
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'content_embedding';
"

echo ""
echo "📊 Nombre d'embeddings:"
docker exec $PG_CONTAINER psql -U $PG_USER -d $PG_DB -c "
SELECT COUNT(*) as total_embeddings
FROM content_embedding
WHERE embedding IS NOT NULL;
"

echo ""
echo "✅ Terminé !"
