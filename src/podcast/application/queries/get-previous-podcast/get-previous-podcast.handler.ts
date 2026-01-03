import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { GetPreviousPodcastQuery } from './get-previous-podcast.query';
import { PrismaService } from '../../../infrastructure/prisma.service';

@QueryHandler(GetPreviousPodcastQuery)
export class GetPreviousPodcastHandler implements IQueryHandler<GetPreviousPodcastQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetPreviousPodcastQuery) {
    const { currentPodcastId } = query;

    const currentPodcast = await this.prisma.podcast.findUnique({
      where: { id: currentPodcastId },
      select: { createdAt: true },
    });

    if (!currentPodcast) {
      throw new NotFoundException(`Podcast with ID ${currentPodcastId} not found`);
    }

    const previousPodcast = await this.prisma.podcast.findFirst({
      where: {
        status: 'completed',
        createdAt: {
          gt: currentPodcast.createdAt, // Plus récent (publié après)
        },
      },
      orderBy: {
        createdAt: 'asc', // Le plus ancien des podcasts plus récents = le précédent
      },
      include: {
        content: {
          select: {
            id: true,
            contentId: true,
            title: true,
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

    return previousPodcast;
  }
}
