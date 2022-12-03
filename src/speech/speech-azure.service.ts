import { Injectable, Logger } from '@nestjs/common';
import {
  AudioConfig,
  ResultReason,
  SpeechConfig,
  SpeechSynthesizer,
} from 'microsoft-cognitiveservices-speech-sdk';

@Injectable()
export class SpeechAzureService {
  private readonly key = process.env.AZURE_SPEECH_KEY;
  private readonly region = process.env.AZURE_SPEECH_REGION;
  private speechConfig: SpeechConfig;
  private readonly logger = new Logger(SpeechAzureService.name);
  constructor() {
    this.speechConfig = SpeechConfig.fromSubscription(this.key, this.region);
    this.speechConfig.speechSynthesisVoiceName = 'fr-FR-DeniseNeural';
  }

  async fromTextToSpeech(text: string, filename: string) {
    const audioConfig = AudioConfig.fromAudioFileOutput(filename);
    const synthesizer = new SpeechSynthesizer(this.speechConfig, audioConfig);

    await this.synthesizeTextToSpeech(text, synthesizer);
  }

  private synthesizeTextToSpeech(
    text: string,
    synthesizer: SpeechSynthesizer,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      synthesizer.speakTextAsync(
        text,
        result => {
          if (result.reason === ResultReason.SynthesizingAudioCompleted) {
            this.logger.log('synthesis finished.');
          } else {
            this.logger.error(
              'Speech synthesis canceled, ' +
                result.errorDetails +
                '\nDid you set the speech resource key and region values?',
            );
            reject(result.errorDetails);
          }
          synthesizer.close();
          synthesizer = null;
          resolve();
        },
        err => {
          console.trace('err - ' + err);
          synthesizer.close();
          synthesizer = null;
          reject(err);
        },
      );
    });
  }
}
