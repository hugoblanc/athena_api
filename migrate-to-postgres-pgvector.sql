-- Migration PostgreSQL + pgvector
-- À exécuter après le premier démarrage de l'app (TypeORM crée le schéma)

-- 1. Activer l'extension pgvector (déjà fait si image ankane/pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Convertir la colonne embedding de text à vector(1536)
ALTER TABLE content_embedding
  ALTER COLUMN embedding TYPE vector(1536)
  USING embedding::vector;

-- 3. Créer l'index HNSW pour recherche vectorielle performante
CREATE INDEX idx_embedding_hnsw
  ON content_embedding
  USING hnsw (embedding vector_cosine_ops);

-- 4. Vérifier le schéma
\d content_embedding

-- 5. Vérifier les index
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'content_embedding';
