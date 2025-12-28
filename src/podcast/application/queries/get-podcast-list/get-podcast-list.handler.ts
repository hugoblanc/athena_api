import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetPodcastListQuery } from './get-podcast-list.query';
import { PrismaService } from '../../../infrastructure/prisma.service';

@QueryHandler(GetPodcastListQuery)
export class GetPodcastListHandler implements IQueryHandler<GetPodcastListQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetPodcastListQuery) {
    const { page, size, terms } = query;
    const skip = (page - 1) * size;

    const where = {
      status: 'completed',
      ...(terms && {
        OR: [
          { dialogueText: { contains: terms, mode: 'insensitive' as const } },
          { content: { title: { contains: terms, mode: 'insensitive' as const } } },
        ],
      }),
    };

    const [podcasts, total] = await Promise.all([
      this.prisma.podcast.findMany({
        where,
        skip,
        take: size,
        orderBy: { createdAt: 'desc' },
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
      }),
      this.prisma.podcast.count({ where }),
    ]);

    return {
      data: podcasts,
      meta: {
        page,
        size,
        total,
        totalPages: Math.ceil(total / size),
      },
    };
  }
}
