#!/bin/bash

# Script de test pour l'API Q&A avec RAG
# Usage: ./test-qa-api.sh [URL_BASE]
# Exemple: ./test-qa-api.sh http://localhost:3000
#          ./test-qa-api.sh https://www.athena-app.fr

BASE_URL="${1:-http://localhost:3000}"

echo "🧪 Test de l'API Q&A - Base URL: $BASE_URL"
echo ""

# Test 1: POST /qa/ask
echo "📤 Test 1: POST /qa/ask - Soumettre une question"
echo "-----------------------------------------------"
JOB_ID=$(curl -s -X POST "$BASE_URL/qa/ask" \
  -H "Content-Type: application/json" \
  -d '{"question": "Quelles sont les principales problématiques écologiques dans les articles ?"}' \
  | jq -r '.jobId')

echo "Job ID créé: $JOB_ID"
echo ""

# Attendre un peu pour que le job commence
sleep 2

# Test 2: GET /qa/result/:jobId
echo "📊 Test 2: GET /qa/result/:jobId - Vérifier le statut du job"
echo "---------------------------------------------------------------"
curl -s "$BASE_URL/qa/result/$JOB_ID" | jq '{
  id: .id,
  question: .question,
  status: .status,
  answer_preview: (.answer[:200] // "null")
}'
echo ""

# Test 3: GET /qa/stream/:jobId
echo "🌊 Test 3: GET /qa/stream/:jobId - Stream SSE (5 premières lignes)"
echo "----------------------------------------------------------------------"
echo "Note: Le stream continue jusqu'à ce que la réponse soit complète"
curl -s -N "$BASE_URL/qa/stream/$JOB_ID" | head -5
echo ""
echo "... (stream coupé pour le test)"
echo ""

# Attendre que le job soit complété
echo "⏳ Attente de la complétion du job..."
for i in {1..30}; do
  STATUS=$(curl -s "$BASE_URL/qa/result/$JOB_ID" | jq -r '.status')
  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "error" ]; then
    echo "Job terminé avec statut: $STATUS"
    break
  fi
  echo "  Status: $STATUS (tentative $i/30)"
  sleep 2
done
echo ""

# Test 4: GET /qa/result/:jobId (résultat final)
echo "✅ Test 4: GET /qa/result/:jobId - Récupérer le résultat final"
echo "----------------------------------------------------------------"
curl -s "$BASE_URL/qa/result/$JOB_ID" | jq '{
  question: .question,
  answer: .answer,
  sources_count: (.sources | length),
  sources: (.sources[:2] | map({title, relevanceScore})),
  status: .status,
  completedAt: .completedAt
}'
echo ""

# Test 5: Créer quelques jobs supplémentaires pour tester l'historique
echo "📝 Création de jobs supplémentaires pour tester l'historique..."
curl -s -X POST "$BASE_URL/qa/ask" \
  -H "Content-Type: application/json" \
  -d '{"question": "Comment lutter contre le changement climatique ?"}' > /dev/null

curl -s -X POST "$BASE_URL/qa/ask" \
  -H "Content-Type: application/json" \
  -d '{"question": "Quelle est l importance de la biodiversité ?"}' > /dev/null

sleep 2
echo ""

# Test 6: GET /qa/history
echo "📚 Test 5: GET /qa/history - Récupérer l'historique (page 1, limit 5)"
echo "------------------------------------------------------------------------"
curl -s "$BASE_URL/qa/history?page=1&limit=5" | jq '{
  total: .pagination.total,
  page: .pagination.page,
  totalPages: .pagination.totalPages,
  questions: (.data | map({id, question, status}))
}'
echo ""

# Test 7: DELETE /qa/history/:id
echo "🗑️  Test 6: DELETE /qa/history/:id - Supprimer un job"
echo "--------------------------------------------------------"
curl -s -X DELETE "$BASE_URL/qa/history/$JOB_ID" | jq
echo ""

# Test 8: Vérifier que le job a bien été supprimé
echo "🔍 Test 7: Vérifier que le job a été supprimé"
echo "-----------------------------------------------"
RESULT=$(curl -s "$BASE_URL/qa/result/$JOB_ID")
if echo "$RESULT" | jq -e '.statusCode == 404' > /dev/null 2>&1; then
  echo "✅ Job correctement supprimé (404 Not Found)"
else
  echo "❌ Le job existe toujours"
fi
echo ""

# Test 9: Test d'erreur - question vide
echo "❌ Test 8: POST /qa/ask - Test avec question vide (devrait échouer)"
echo "----------------------------------------------------------------------"
curl -s -X POST "$BASE_URL/qa/ask" \
  -H "Content-Type: application/json" \
  -d '{"question": ""}' | jq
echo ""

# Test 10: Test d'erreur - job inexistant
echo "❌ Test 9: GET /qa/result/:jobId - Job inexistant (devrait retourner 404)"
echo "----------------------------------------------------------------------------"
curl -s "$BASE_URL/qa/result/00000000-0000-0000-0000-000000000000" | jq
echo ""

echo "✨ Tests terminés!"
echo ""
echo "Pour tester le streaming en temps réel, exécutez:"
echo "  curl -N $BASE_URL/qa/stream/<JOB_ID>"
