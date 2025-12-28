import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetPodcastByContentIdQuery } from './get-podcast-by-content-id.query';
import { PrismaService } from '../../../infrastructure/prisma.service';

@QueryHandler(GetPodcastByContentIdQuery)
export class GetPodcastByContentIdHandler implements IQueryHandler<GetPodcastByContentIdQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetPodcastByContentIdQuery) {
    const { contentId } = query;

    const podcast = await this.prisma.podcast.findFirst({
      where: {
        contentId,
        status: 'completed',
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
          },
        },
      },
    });

    return podcast;
  }
}
