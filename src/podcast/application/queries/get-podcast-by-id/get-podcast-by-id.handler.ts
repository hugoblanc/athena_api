import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { GetPodcastByIdQuery } from './get-podcast-by-id.query';
import { PrismaService } from '../../../infrastructure/prisma.service';

@QueryHandler(GetPodcastByIdQuery)
export class GetPodcastByIdHandler implements IQueryHandler<GetPodcastByIdQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetPodcastByIdQuery) {
    const { id } = query;

    const podcast = await this.prisma.podcast.findUnique({
      where: { id },
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

    if (!podcast) {
      throw new NotFoundException(`Podcast with ID ${id} not found`);
    }

    return podcast;
  }
}
