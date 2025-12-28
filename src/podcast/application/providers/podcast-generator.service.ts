import { Injectable } from '@nestjs/common';
import { Content } from '@prisma/client';

export interface PodcastGenerationResult {
  dialogueText: string;
  audioUrl: string;
  duration?: number;
}

@Injectable()
export abstract class PodcastGeneratorService {
  abstract generatePodcastFromContent(content: Content): Promise<PodcastGenerationResult>;
}
