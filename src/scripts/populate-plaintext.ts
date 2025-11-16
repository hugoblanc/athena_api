import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Content } from '../content/domain/content.entity';
import { TextFormatter } from '../content/application/providers/text-formatter.service';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const textFormatter = app.get(TextFormatter);
  const dataSource = app.get(DataSource);
  const contentRepository = dataSource.getRepository(Content);

  console.log('Starting plainText population...');

  const contents = await contentRepository.find();
  console.log(`Found ${contents.length} articles to process`);

  let processed = 0;
  let updated = 0;

  for (const content of contents) {
    try {
      // Convertir HTML en texte pur
      const plainText = textFormatter.htmlToText(content.description);

      // Mettre à jour l'entité
      content.plainText = plainText;
      await contentRepository.save(content);

      updated++;
      console.log(`[${processed + 1}/${contents.length}] Updated contentId: ${content.contentId} (${plainText.length} chars)`);
    } catch (error) {
      console.error(`Error processing contentId: ${content.contentId}`, error.message);
    }
    processed++;
  }

  console.log(`\nDone! Processed ${processed} articles, updated ${updated}`);

  await app.close();
}

bootstrap();
