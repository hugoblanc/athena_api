#!/bin/bash

echo "🚀 Génération des embeddings en local..."
echo ""

curl -X POST http://localhost:3000/maintenance/generate-embeddings \
  -H "x-maintenance-key: zepfojzdgfpojzgpozgrj" \
  -w "\n\nStatus: %{http_code}\n"

echo ""
echo "✅ Terminé !"
