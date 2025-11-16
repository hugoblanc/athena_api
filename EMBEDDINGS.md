# Système d'Embeddings pour Athena

Ce document décrit l'architecture du système d'embeddings vectoriels pour la recherche sémantique et le RAG.

## 📊 Architecture

### Entités

**`Content`** (existante)
- `plainText`: Texte extrait du HTML (colonne ajoutée)
- `embeddings`: Relation OneToMany vers ContentEmbedding

**`ContentEmbedding`** (nouvelle)
- `id`: Primary key
- `content`: Relation vers Content
- `chunkIndex`: Position du chunk (0, 1, 2...)
- `chunkText`: Le texte du chunk (~700 mots)
- `tokenCount`: Nombre de tokens utilisés
- `embedding`: Vecteur JSON (1536 dimensions)
- `createdAt / updatedAt`: Timestamps

### Services

**`ChunkingService`**
- Découpage intelligent par phrases
- Taille cible: 700 mots (range 600-800)
- Overlap: 100 mots
- Préserve les phrases complètes

**`EmbeddingsService`**
- Appels OpenAI API `text-embedding-3-small`
- Support batch (jusqu'à 2048 inputs)
- Gestion des erreurs et retry

**`ContentEmbeddingService`**
- Orchestration: chunking + embedding + save
- Génération batch pour tous les contenus
- Transactions DB pour cohérence

## 📦 Volumétrie (Production)

- **Articles**: 9 334
- **Mots totaux**: ~11.6M
- **Chunks estimés**: ~16 646
- **Stockage**: ~216 MB (avec index)
- **Coût génération**: ~$0.30 (unique)
- **Coût mensuel**: négligeable (<$0.05/an)

## 🚀 Déploiement

### 1. Variables d'environnement

```env
MAINTENANCE_KEY=your-secret-key
OPENAI_API_KEY=sk-your-openai-key
```

### 2. Déployer le code

```bash
git add .
git commit -m "feat: add embeddings system"
git push
```

### 3. Vérifier la création des tables

Avec `synchronize: true`, TypeORM créera automatiquement :
- Table `content_embedding`
- Relation avec `content`
- Index sur (`contentId`, `chunkIndex`)

### 4. Générer les embeddings

```bash
curl -X POST https://www.athena-app.fr/maintenance/generate-embeddings \
  -H "x-maintenance-key: YOUR_KEY"
```

**Durée estimée** : 15-20 minutes pour 9 334 articles

## 🔍 Utilisation future

### Recherche sémantique

```sql
-- Pseudo-code (à implémenter)
SELECT c.*, ce.chunkText,
       COSINE_DISTANCE(ce.embedding, :query_embedding) as distance
FROM content_embedding ce
JOIN content c ON ce.contentId = c.id
ORDER BY distance ASC
LIMIT 10
```

### RAG (Retrieval Augmented Generation)

1. User query → Embedding
2. Recherche des chunks les plus similaires
3. Contexte envoyé au LLM
4. Génération de la réponse

### Recommandations d'articles

1. Article actuel → Embeddings
2. Recherche des articles similaires par distance cosine
3. Suggestion des N meilleurs matchs

## ⚠️ Limitations actuelles

1. **Type VECTOR MySQL** : Stocké en JSON pour compatibilité TypeORM
   - Pour utiliser les index VECTOR natifs, il faudra une migration SQL manuelle
   - Performances de recherche sub-optimales sans index HNSW

2. **Pas de endpoint de recherche** : À implémenter
   - POST /search/semantic
   - GET /content/:id/similar

3. **Pas de mise à jour automatique** :
   - Les embeddings ne sont pas régénérés quand le content change
   - À implémenter avec des hooks ou événements

## 🔄 Prochaines étapes

1. ✅ Structure DB et génération d'embeddings
2. ⏳ Migration SQL pour type VECTOR + index HNSW
3. ⏳ Endpoint de recherche sémantique
4. ⏳ Endpoint de recommandation d'articles
5. ⏳ Auto-update des embeddings lors de modification
6. ⏳ Interface frontend de recherche

## 📚 Références

- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [MySQL Vector Type](https://dev.mysql.com/doc/refman/9.1/en/vector.html)
- [HNSW Index](https://dev.mysql.com/doc/refman/9.1/en/vector-index-hnsw.html)
