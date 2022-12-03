import { Injectable } from '@nestjs/common';

@Injectable()
export abstract class SpeechService {
  abstract fromTextToSpeech(text: string, filename: string): Promise<void>;
}
