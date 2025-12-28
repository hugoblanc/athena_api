import { Controller, Post, Param, ParseIntPipe, Query, Get } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GeneratePodcastForContentCommand } from './commands/generate-podcast-for-content.command';
import { GenerateMissingPodcastsCommand } from './commands/generate-missing-podcasts.command';
import { GetPodcastListQuery } from './queries/get-podcast-list/get-podcast-list.query';
import { GetPodcastByContentIdQuery } from './queries/get-podcast-by-content-id/get-podcast-by-content-id.query';
import { GetPodcastByIdQuery } from './queries/get-podcast-by-id/get-podcast-by-id.query';
import { Public } from '../../auth/infrastructure/decorators';

@Controller('podcast')
@Public()
export class PodcastController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('list')
  async getPodcastList(
    @Query('page') page?: string,
    @Query('size') size?: string,
    @Query('terms') terms?: string,
  ) {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const sizeNumber = size ? parseInt(size, 10) : 10;
    return this.queryBus.execute(new GetPodcastListQuery(pageNumber, sizeNumber, terms));
  }

  @Get('content/:contentId')
  async getPodcastByContentId(@Param('contentId', ParseIntPipe) contentId: number) {
    return this.queryBus.execute(new GetPodcastByContentIdQuery(contentId));
  }

  @Get(':id')
  async getPodcastById(@Param('id', ParseIntPipe) id: number) {
    return this.queryBus.execute(new GetPodcastByIdQuery(id));
  }

  @Post(':id')
  async generatePodcast(@Param('id', ParseIntPipe) id: number) {
    return this.commandBus.execute(new GeneratePodcastForContentCommand(id));
  }

  @Post('generate-missing')
  async generateMissingPodcasts(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    return this.commandBus.execute(new GenerateMissingPodcastsCommand(limitNumber));
  }
}
