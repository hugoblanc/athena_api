import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CommandBus } from '@nestjs/cqrs';
import { PostsCreatedEvent } from '../../../content/application/events/posts-created.event';
import { GeneratePodcastForContentCommand } from '../commands/generate-podcast-for-content.command';

@Injectable()
export class PodcastService {
  private logger = new Logger(PodcastService.name);

  constructor(private readonly commandBus: CommandBus) {}

  @OnEvent(PostsCreatedEvent.eventName)
  async handlePostCreated({ ids }: PostsCreatedEvent) {
    if (ids.length === 0) return;

    if (ids.length > 10) {
      this.logger.warn(`More than 10 posts created at once. Skipping automatic podcast generation.`);
      return;
    }

    this.logger.log(`Processing ${ids.length} posts for podcast generation`);

    for (const id of ids) {
      try {
        await this.commandBus.execute(new GeneratePodcastForContentCommand(id));
      } catch (error) {
        // Ne pas bloquer si échec (ex: contenu trop court, déjà existe, YouTube video)
        this.logger.warn(`Skipped podcast generation for content ${id}: ${error.message}`);
      }
    }
  }
}
