import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ContentEmbeddingService } from '../content/application/content-embedding.service';
import { DataSource } from 'typeorm';
import { Content } from '../content/domain/content.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const contentEmbeddingService = app.get(ContentEmbeddingService);
  const dataSource = app.get(DataSource);
  const contentRepository = dataSource.getRepository(Content);

  console.log('🧪 Test de génération d\'embeddings en local\n');

  // Récupérer 3 articles avec plainText
  const contents = await contentRepository.find({
    where: {},
    take: 3,
    order: { id: 'DESC' },
  });

  console.log(`📄 ${contents.length} articles trouvés pour le test\n`);

  for (const content of contents) {
    console.log(`\n--- Article: ${content.contentId} - "${content.title}" ---`);
    console.log(`PlainText length: ${content.plainText?.length || 0} chars`);

    try {
      const result = await contentEmbeddingService.generateEmbeddingsForContent(
        content,
      );

      if (result.success) {
        console.log(`✅ Succès!`);
        console.log(`   - Chunks créés: ${result.chunksCreated}`);
        console.log(`   - Tokens utilisés: ${result.tokensUsed}`);
        console.log(
          `   - Coût estimé: $${((result.tokensUsed / 1000000) * 0.02).toFixed(6)}`,
        );
      } else {
        console.log(`❌ Échec: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Erreur: ${error.message}`);
    }
  }

  console.log('\n✨ Test terminé!\n');

  await app.close();
}

bootstrap();
