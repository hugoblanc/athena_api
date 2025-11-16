-- Migration pour utiliser le type VECTOR natif de MySQL 9.1
-- À exécuter sur la base de données locale

-- 1. Modifier la colonne embedding pour utiliser le type VECTOR
ALTER TABLE content_embedding
  MODIFY COLUMN embedding VECTOR(1536);

-- 2. Créer un index HNSW pour la recherche vectorielle optimisée
-- Note: HNSW (Hierarchical Navigable Small World) est l'algorithme d'indexation pour les vecteurs
CREATE INDEX idx_embedding_vector
  ON content_embedding
  USING HNSW (embedding)
  WITH (distance = 'cosine');

-- 3. Vérifier la structure de la table
DESCRIBE content_embedding;

-- 4. Vérifier l'index
SHOW INDEX FROM content_embedding;
