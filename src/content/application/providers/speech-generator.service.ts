import { Inject, Injectable } from '@nestjs/common';
import { Audio } from '../../domain/audio.entity';
import { Content } from '../../domain/content.entity';

@Injectable()
export abstract class SpeechGeneratorService {
  abstract createAudioFromContent(content: Content): Promise<Audio>;
}
