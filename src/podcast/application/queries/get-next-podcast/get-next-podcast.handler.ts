import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetNextPodcastQuery } from './get-next-podcast.query';
import { PrismaService } from '../../../infrastructure/prisma.service';

@QueryHandler(GetNextPodcastQuery)
export class GetNextPodcastHandler implements IQueryHandler<GetNextPodcastQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetNextPodcastQuery) {
    const { currentPodcastId } = query;

    // Récupère le podcast actuel pour connaître sa date de création
    const currentPodcast = await this.prisma.podcast.findUnique({
      where: { id: currentPodcastId },
      select: { createdAt: true },
    });

    if (!currentPodcast) {
      return null;
    }

    // Récupère le prochain podcast (plus récent que l'actuel) dans l'ordre de publication
    const nextPodcast = await this.prisma.podcast.findFirst({
      where: {
        status: 'completed',
        createdAt: {
          lt: currentPodcast.createdAt, // Plus ancien (publié avant)
        },
      },
      orderBy: {
        createdAt: 'desc', // Tri décroissant pour avoir le suivant
      },
      include: {
        content: {
          include: {
            meta_media: {
              select: {
                id: true,
                key: true,
                title: true,
                logo: true,
              },
            },
            image: {
              select: {
                id: true,
                url: true,
                width: true,
                height: true,
              },
            },
          },
        },
      },
    });

    return nextPodcast;
  }
}
