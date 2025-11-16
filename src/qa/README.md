# Module Q&A avec RAG (Retrieval-Augmented Generation)

Ce module permet de poser des questions et d'obtenir des réponses générées par IA basées sur les articles en base de données, avec streaming en temps réel.

## Architecture

### Flux de données

1. **Question utilisateur** → POST /qa/ask
2. **Job créé** avec status `processing`
3. **RAG Pipeline** :
   - Génération embedding de la question (OpenAI)
   - Recherche vectorielle des 5 chunks les plus similaires
   - Construction du contexte pour le LLM
   - Génération streaming de la réponse (OpenAI GPT-4)
4. **Réponse stockée** avec sources et status `completed`

### Services

**`VectorSearchService`**
- Recherche sémantique par similarité cosine
- Génère l'embedding de la question
- Compare avec tous les embeddings en DB
- Retourne les top K résultats les plus pertinents

**`RagService`**
- Construit le contexte RAG (sources + prompt)
- Interface avec OpenAI Chat Completions API
- Support streaming et non-streaming
- Utilise `gpt-4o-mini` pour optimiser les coûts

**`QaService`**
- Orchestration : création job → traitement → stockage
- Gestion des jobs asynchrones (fire-and-forget)
- Support SSE pour streaming temps réel
- CRUD historique

## API Endpoints

### 1. POST /qa/ask

Soumet une question et retourne immédiatement un job ID.

**Request:**
```json
{
  "question": "Quelle est la différence entre React et Vue ?"
}
```

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Question received, processing started"
}
```

**Exemple curl:**
```bash
curl -X POST http://localhost:3000/qa/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Comment fonctionne TypeORM ?"}'
```

---

### 2. GET /qa/stream/:jobId

Stream la réponse en temps réel via Server-Sent Events (SSE).

**Headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Events:**
```
data: {"type":"token","content":"La"}

data: {"type":"token","content":" réponse"}

data: {"type":"token","content":" est"}

data: {"type":"done","sources":[{...}]}
```

**Format des sources:**
```typescript
{
  "contentId": "article-123",
  "title": "Introduction à TypeORM",
  "url": "https://medium.com/...",
  "relevanceScore": 0.87,
  "chunkText": "TypeORM est un ORM..."
}
```

**Exemple JavaScript (frontend):**
```javascript
const eventSource = new EventSource(`/qa/stream/${jobId}`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'token') {
    // Afficher le token en temps réel
    appendToAnswer(data.content);
  } else if (data.type === 'done') {
    // Afficher les sources
    displaySources(data.sources);
    eventSource.close();
  } else if (data.type === 'error') {
    console.error(data.message);
    eventSource.close();
  }
};
```

---

### 3. GET /qa/result/:jobId

Récupère le résultat final d'un job (non-streaming).

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "question": "Comment fonctionne TypeORM ?",
  "answer": "TypeORM est un ORM (Object-Relational Mapping)...",
  "sources": [
    {
      "contentId": "article-123",
      "title": "Introduction à TypeORM",
      "url": "https://medium.com/...",
      "relevanceScore": 0.87,
      "chunkText": "TypeORM est un ORM..."
    }
  ],
  "status": "completed",
  "errorMessage": null,
  "createdAt": "2025-01-16T10:30:00Z",
  "completedAt": "2025-01-16T10:30:05Z"
}
```

**Status possibles:**
- `processing` : En cours de traitement
- `completed` : Terminé avec succès
- `error` : Échec (voir `errorMessage`)

**Exemple curl:**
```bash
curl http://localhost:3000/qa/result/550e8400-e29b-41d4-a716-446655440000
```

---

### 4. GET /qa/history

Récupère l'historique des questions (paginé).

**Query params:**
- `page` (default: 1) : Numéro de page
- `limit` (default: 20, max: 100) : Résultats par page

**Response:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "question": "Comment fonctionne TypeORM ?",
      "answer": "TypeORM est un ORM...",
      "sources": [...],
      "status": "completed",
      "createdAt": "2025-01-16T10:30:00Z",
      "completedAt": "2025-01-16T10:30:05Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

**Exemple curl:**
```bash
curl "http://localhost:3000/qa/history?page=1&limit=10"
```

---

### 5. DELETE /qa/history/:id

Supprime un élément de l'historique.

**Response:**
```json
{
  "message": "Job deleted successfully"
}
```

**Exemple curl:**
```bash
curl -X DELETE http://localhost:3000/qa/history/550e8400-e29b-41d4-a716-446655440000
```

## Base de données

### Table `qa_jobs`

```sql
CREATE TABLE qa_jobs (
  id VARCHAR(36) PRIMARY KEY,           -- UUID v4
  question TEXT NOT NULL,
  answer TEXT,                          -- NULL si en cours
  sources JSON,                         -- Array de sources
  status VARCHAR(20) NOT NULL,          -- 'processing' | 'completed' | 'error'
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_created_at (created_at DESC)
);
```

Créée automatiquement par TypeORM avec `synchronize: true`.

## Configuration

Ajouter dans `.env` :

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

Le module utilise :
- `text-embedding-3-small` pour les embeddings (1536 dimensions)
- `gpt-4o-mini` pour la génération de réponses

## Coûts estimés

**Par question :**
- Embedding de la question : ~$0.000002 (10 tokens @ $0.02/1M)
- Génération de réponse : ~$0.00015 (500 tokens input + 200 tokens output @ $0.15/$0.60/1M)
- **Total : ~$0.00016 par question**

**Volumétrie :**
- 1000 questions/mois : ~$0.16
- 10000 questions/mois : ~$1.60

## Limitations actuelles

1. **Recherche vectorielle en mémoire** :
   - Tous les embeddings sont chargés en RAM pour le calcul de similarité
   - Acceptable pour <20k chunks (~10k articles)
   - Pour scale : migrer vers type VECTOR + index HNSW

2. **Pas de cache** :
   - Questions identiques génèrent de nouvelles réponses
   - Possibilité d'ajouter un cache par hash de question

3. **Pas de rate limiting** :
   - À implémenter pour éviter abus (ex: @nestjs/throttler)

4. **Streaming simple** :
   - Le job se traite intégralement même si l'utilisateur ferme le stream SSE
   - Possibilité d'optimiser avec abort signals

## Optimisations futures

1. **Migration VECTOR + HNSW** :
```sql
ALTER TABLE content_embedding
  MODIFY COLUMN embedding VECTOR(1536);

CREATE INDEX idx_embedding_hnsw
  ON content_embedding USING HNSW (embedding)
  WITH (distance = 'cosine');
```

2. **Cache de questions** :
```typescript
// Hasher la question et checker le cache
const questionHash = crypto.createHash('sha256').update(question).digest('hex');
const cached = await cache.get(questionHash);
if (cached) return cached;
```

3. **Websockets au lieu de SSE** :
- Permet bidirectionnel (ex: stop generation)
- Meilleur contrôle du lifecycle

4. **Feedback utilisateur** :
- Ajouter 👍/👎 sur les réponses
- Utiliser pour améliorer le système

## Tests

### Test local d'une question

```bash
# 1. Poser une question
JOB_ID=$(curl -s -X POST http://localhost:3000/qa/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Comment fonctionne NestJS ?"}' \
  | jq -r '.jobId')

echo "Job ID: $JOB_ID"

# 2. Stream la réponse
curl -N http://localhost:3000/qa/stream/$JOB_ID

# 3. Récupérer le résultat final
curl http://localhost:3000/qa/result/$JOB_ID | jq
```

### Test de l'historique

```bash
# Historique
curl http://localhost:3000/qa/history | jq

# Supprimer un job
curl -X DELETE http://localhost:3000/qa/history/$JOB_ID
```

## Références

- [OpenAI Chat Completions](https://platform.openai.com/docs/guides/chat)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [MySQL Vector Search](https://dev.mysql.com/doc/refman/9.1/en/vector-search.html)
