import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { promises as fsPromises } from 'fs';
import { SpeechAzureService } from '../../speech/infrastructure/speech-azure.service';
import { StorageService } from '../../storage/application/storage.service';
import { SpeechGeneratorService } from '../application/providers/speech-generator.service';
import { Audio } from '../domain/audio.entity';
import { Content } from '../domain/content.entity';
import { TextFormatter } from '../application/providers/text-formatter.service';

@Injectable()
export class SpeechWavGeneratorService extends SpeechGeneratorService {
  logger = new Logger(SpeechWavGeneratorService.name);

  constructor(
    private readonly speechAzureService: SpeechAzureService,
    private readonly storageService: StorageService,
    private readonly textFormatter: TextFormatter,
  ) {
    super();
  }

  async createAudioFromContent(content: Content): Promise<Audio> {
    const plainTextDescription = this.extractSpeakableTextFromContent(content);
    this.logger.debug(
      'Content text extracted success with a length of ' +
        plainTextDescription.length,
    );
    const audioFilename = await this.convertTextToSpeech(
      plainTextDescription,
      content,
    );
    this.logger.debug('Content text conversion to speech success');

    const localFilePath = './' + audioFilename;
    const destinationFilePath = `${content.metaMedia.key}/${audioFilename}`;

    const speechFileUrl = await this.storeSpeechFile(
      localFilePath,
      destinationFilePath,
    );
    await this.removeLocalSpeechFile(localFilePath);
    this.logger.debug('File removed locally success');

    const audio = new Audio({ url: speechFileUrl });
    return audio;
  }

  private extractSpeakableTextFromContent(content: Content): string {
    const plainTextDescription = this.textFormatter.htmlToText(
      content.description,
    );
    return plainTextDescription;
  }

  private async convertTextToSpeech(
    plainText: string,
    content: Content,
  ): Promise<string> {
    const audioFilename = `${content.contentId}.wav`;
    await this.speechAzureService.fromTextToSpeech(plainText, audioFilename);
    return audioFilename;
  }

  private storeSpeechFile(
    filePath: string,
    destination: string,
  ): Promise<string> {
    return this.storageService.saveFile(filePath, destination);
  }

  private async removeLocalSpeechFile(filepath: string) {
    await fsPromises.unlink(filepath);
  }
}
