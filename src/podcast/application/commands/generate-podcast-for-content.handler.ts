import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConflictException, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';
import { PodcastGeneratorService } from '../providers/podcast-generator.service';
import { GeneratePodcastForContentCommand } from './generate-podcast-for-content.command';
import { Podcast } from '@prisma/client';

@CommandHandler(GeneratePodcastForContentCommand)
export class GeneratePodcastForContentHandler implements ICommandHandler<GeneratePodcastForContentCommand> {
  private logger = new Logger(GeneratePodcastForContentHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly podcastGeneratorService: PodcastGeneratorService,
  ) {}

  async execute({ id }: GeneratePodcastForContentCommand): Promise<Podcast> {
    // 1. Charger le contenu avec metaMedia et podcast
    const content = await this.prisma.content.findUnique({
      where: { id },
      include: {
        meta_media: true,
        podcast: true,
      },
    });

    if (!content) {
      throw new NotFoundException(`Content with id ${id} not found`);
    }

    // 2. Vérifier que le podcast n'existe pas déjà
    if (content.podcast) {
      throw new ConflictException(`Podcast already exists for content ${id}`);
    }

    // 3. Filtrer : seulement WordPress
    if (content.contentType !== 'WORDPRESS') {
      throw new BadRequestException(`Podcast generation is only supported for WordPress content`);
    }

    // 4. Filtrer : seulement articles > 500 caractères
    const textLength = content.plainText?.length || 0;
    if (textLength < 500) {
      throw new BadRequestException(`Content plainText is too short (${textLength} chars, minimum 500)`);
    }

    this.logger.log(`Generating podcast for content ${id} (${textLength} chars)`);

    // 5. Générer le podcast
    const result = await this.podcastGeneratorService.generatePodcastFromContent(content as any);

    // 6. Sauvegarder en base avec Prisma
    const podcast = await this.prisma.podcast.create({
      data: {
        contentId: content.id,
        dialogueText: result.dialogueText,
        audioUrl: result.audioUrl,
        duration: result.duration,
        status: 'completed',
      },
    });

    this.logger.log(`Podcast created for content ${id}: ${podcast.audioUrl}`);

    return podcast;
  }
}
