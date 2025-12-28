import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';
import { GenerateMissingPodcastsCommand } from './generate-missing-podcasts.command';
import { GeneratePodcastForContentCommand } from './generate-podcast-for-content.command';
import { CommandBus } from '@nestjs/cqrs';

interface GenerateMissingPodcastsResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ contentId: number; error: string }>;
}

@CommandHandler(GenerateMissingPodcastsCommand)
export class GenerateMissingPodcastsHandler implements ICommandHandler<GenerateMissingPodcastsCommand> {
  private logger = new Logger(GenerateMissingPodcastsHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commandBus: CommandBus,
  ) {}

  async execute({ limit }: GenerateMissingPodcastsCommand): Promise<GenerateMissingPodcastsResult> {
    this.logger.log(`Searching for contents without podcasts (limit: ${limit})`);

    // Trouver les contenus WordPress > 500 chars sans podcast
    const contents = await this.prisma.content.findMany({
      where: {
        contentType: 'WORDPRESS',
        plainText: {
          not: null,
        },
        podcast: null,
      },
      select: {
        id: true,
        plainText: true,
      },
      take: limit,
      orderBy: {
        publishedAt: 'desc',
      },
    });

    // Filtrer par longueur de plainText
    const eligibleContents = contents.filter(c => (c.plainText?.length || 0) >= 500);

    this.logger.log(`Found ${eligibleContents.length} eligible contents out of ${contents.length} candidates`);

    const result: GenerateMissingPodcastsResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    for (const content of eligibleContents) {
      result.processed++;
      try {
        await this.commandBus.execute(new GeneratePodcastForContentCommand(content.id));
        result.succeeded++;
        this.logger.log(`✓ Podcast generated for content ${content.id}`);
      } catch (error) {
        result.failed++;
        const errorMessage = error.message || 'Unknown error';
        result.errors.push({ contentId: content.id, error: errorMessage });
        this.logger.warn(`✗ Failed to generate podcast for content ${content.id}: ${errorMessage}`);
      }
    }

    this.logger.log(`Batch complete: ${result.succeeded}/${result.processed} succeeded, ${result.failed} failed`);

    return result;
  }
}
