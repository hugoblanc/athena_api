#!/bin/bash

# Script de test de l'API Q&A
# Usage: ./test-qa.sh "Votre question ici"

# Configuration
API_URL="${API_URL:-http://localhost:3000}"  # Default local, override with: API_URL=https://www.athena-app.fr ./test-qa.sh "question"

# Couleurs pour l'affichage
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Vérifier qu'une question est fournie
if [ -z "$1" ]; then
  echo -e "${RED}Usage: $0 \"Votre question\"${NC}"
  echo "Exemple: $0 \"Quelles sont les conséquences du changement climatique ?\""
  exit 1
fi

QUESTION="$1"

echo -e "${BLUE}=== Test API Q&A ===${NC}"
echo -e "${YELLOW}Question: ${QUESTION}${NC}"
echo ""

# Étape 1: Poser la question
echo -e "${BLUE}[1/3] Envoi de la question...${NC}"
RESPONSE=$(curl -s -X POST "${API_URL}/qa/ask" \
  -H "Content-Type: application/json" \
  -d "{\"question\": \"${QUESTION}\"}")

# Extraire le jobId
JOB_ID=$(echo $RESPONSE | grep -o '"jobId":"[^"]*' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
  echo -e "${RED}Erreur: Impossible de récupérer le jobId${NC}"
  echo "Réponse: $RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Job créé: ${JOB_ID}${NC}"
echo ""

# Étape 2: Attendre un peu que le traitement commence
echo -e "${BLUE}[2/3] Traitement de la question...${NC}"
sleep 2

# Étape 3: Stream la réponse
echo -e "${BLUE}[3/3] Réponse en temps réel:${NC}"
echo -e "${GREEN}───────────────────────────────────────${NC}"

# Variable pour stocker la réponse complète
FULL_ANSWER=""

# Stream et afficher en temps réel
curl -N -s "${API_URL}/qa/stream/${JOB_ID}" | while IFS= read -r line; do
  # Extraire le contenu JSON après "data: "
  if [[ $line == data:* ]]; then
    JSON_DATA="${line#data: }"

    # Extraire le type
    TYPE=$(echo "$JSON_DATA" | grep -o '"type":"[^"]*' | cut -d'"' -f4)

    if [ "$TYPE" = "token" ]; then
      # Extraire et afficher le token
      TOKEN=$(echo "$JSON_DATA" | grep -o '"content":"[^"]*' | cut -d'"' -f4)
      echo -n "$TOKEN"
    elif [ "$TYPE" = "done" ]; then
      echo ""
      echo -e "${GREEN}───────────────────────────────────────${NC}"
      echo ""

      # Extraire et afficher les sources
      echo -e "${BLUE}Sources utilisées:${NC}"

      # Utiliser jq si disponible
      if command -v jq &> /dev/null; then
        # Parser et afficher les sources
        echo "$JSON_DATA" | jq -r '.sources[]? | "  • \(.title) (\((.relevanceScore * 100) | floor)%)\n    \(.url)"' | while IFS= read -r line; do
          if [[ $line == "  •"* ]]; then
            # Extraire le titre et le pourcentage
            echo -e "${YELLOW}${line}${NC}"
          elif [[ $line == "    "* ]]; then
            # URL
            echo -e "${BLUE}${line}${NC}"
          fi
        done
      else
        # Fallback sans jq: afficher message
        echo -e "${YELLOW}  (installez jq pour voir les sources formatées)${NC}"
      fi
    fi
  fi
done

echo ""
echo -e "${GREEN}✓ Test terminé${NC}"
