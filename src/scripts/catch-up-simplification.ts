/**
 * Script de rattrapage pour simplifier toutes les propositions de loi en attente
 *
 * Usage: npx ts-node src/scripts/catch-up-simplification.ts
 */

const API_URL = process.env.API_URL || 'https://www.athena-app.fr';
const BATCH_SIZE = 5;
const DELAY_BETWEEN_BATCHES_MS = 2000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getStats(): Promise<{
  total: number;
  pending: number;
  completed: number;
  failed: number;
}> {
  const response = await fetch(`${API_URL}/law-proposal/stats`);
  return response.json();
}

async function processQueue(batchSize: number): Promise<void> {
  const response = await fetch(
    `${API_URL}/law-proposal/process-simplification-queue?batchSize=${batchSize}`,
    {
      method: 'POST',
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to process queue: ${response.status} ${response.statusText}`,
    );
  }
}

async function main(): Promise<void> {
  console.log(
    '🚀 Démarrage du rattrapage de simplification des propositions de loi\n',
  );
  console.log(`API: ${API_URL}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Délai entre batches: ${DELAY_BETWEEN_BATCHES_MS}ms\n`);

  // Stats initiales
  const initialStats = await getStats();
  console.log('📊 Stats initiales:');
  console.log(`   Total: ${initialStats.total}`);
  console.log(`   En attente: ${initialStats.pending}`);
  console.log(`   Complétées: ${initialStats.completed}`);
  console.log(`   Échouées: ${initialStats.failed}\n`);

  if (initialStats.pending === 0) {
    console.log('✅ Aucune proposition en attente de simplification');
    return;
  }

  let processed = 0;
  let batchNumber = 0;

  while (true) {
    const stats = await getStats();

    if (stats.pending === 0) {
      console.log('\n✅ Toutes les propositions ont été traitées!');
      break;
    }

    batchNumber++;
    console.log(
      `\n📦 Batch ${batchNumber} - ${stats.pending} propositions restantes...`,
    );

    try {
      await processQueue(BATCH_SIZE);
      processed += Math.min(BATCH_SIZE, stats.pending);
      console.log(
        `   ✓ Batch traité (${processed} propositions traitées au total)`,
      );
    } catch (error) {
      console.error(`   ✗ Erreur lors du traitement:`, error);
      // Continuer quand même
    }

    // Attendre avant le prochain batch pour ne pas surcharger l'API
    await sleep(DELAY_BETWEEN_BATCHES_MS);
  }

  // Stats finales
  const finalStats = await getStats();
  console.log('\n📊 Stats finales:');
  console.log(`   Total: ${finalStats.total}`);
  console.log(`   En attente: ${finalStats.pending}`);
  console.log(`   Complétées: ${finalStats.completed}`);
  console.log(`   Échouées: ${finalStats.failed}`);

  console.log(
    `\n🎉 Rattrapage terminé! ${
      finalStats.completed - initialStats.completed
    } nouvelles simplifications générées.`,
  );
}

main().catch(console.error);
