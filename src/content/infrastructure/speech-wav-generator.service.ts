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

  // Azure TTS limit: 10 minutes of audio
  // ~8000 chars = safe margin under 10 minutes
  private static readonly MAX_CHUNK_SIZE = 8000;

  constructor(
    private readonly speechAzureService: SpeechAzureService,
    private readonly storageService: StorageService,
    private readonly textFormatter: TextFormatter,
  ) {
    super();
  }

  async createAudioFromContent(content: Content): Promise<Audio> {
    const plainTextDescription = this.extractSpeakableTextFromContent(content);
    this.logger.log(plainTextDescription);

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
    // Check if text needs to be split
    const chunks = this.splitTextIntoChunks(
      plainText,
      SpeechWavGeneratorService.MAX_CHUNK_SIZE,
    );

    this.logger.log(
      `Text split into ${chunks.length} chunk(s) for content ${content.contentId}`,
    );

    if (chunks.length === 1) {
      // Single chunk - direct generation
      const audioFilename = `${content.contentId}.mp3`;
      await this.speechAzureService.fromTextToSpeech(plainText, audioFilename);
      return audioFilename;
    }

    // Multiple chunks - generate and concatenate
    return this.generateAndConcatenateChunks(chunks, content);
  }

  private async generateAndConcatenateChunks(
    chunks: string[],
    content: Content,
  ): Promise<string> {
    const tempFiles: string[] = [];

    try {
      // Generate MP3 for each chunk sequentially
      for (let i = 0; i < chunks.length; i++) {
        const chunkFilename = `${content.contentId}_chunk_${i}.mp3`;
        this.logger.log(
          `Generating chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`,
        );
        await this.speechAzureService.fromTextToSpeech(
          chunks[i],
          chunkFilename,
        );
        tempFiles.push(chunkFilename);
      }

      // Concatenate all MP3 files
      const finalFilename = `${content.contentId}.mp3`;
      await this.concatenateMp3Files(tempFiles, finalFilename);

      // Cleanup temp files
      await this.cleanupTempFiles(tempFiles);

      return finalFilename;
    } catch (error) {
      // Cleanup on error
      await this.cleanupTempFiles(tempFiles);
      throw error;
    }
  }

  private async concatenateMp3Files(
    sourceFiles: string[],
    outputFile: string,
  ): Promise<void> {
    this.logger.log(`Concatenating ${sourceFiles.length} MP3 files`);

    const buffers: Buffer[] = [];

    // Read all files into buffers
    for (const file of sourceFiles) {
      const buffer = await fsPromises.readFile(file);
      buffers.push(buffer);
    }

    // Concatenate buffers and write final file
    const finalBuffer = Buffer.concat(buffers as any);
    await fsPromises.writeFile(outputFile, finalBuffer as any);

    this.logger.log(`Concatenation complete: ${outputFile}`);
  }

  private async cleanupTempFiles(files: string[]): Promise<void> {
    for (const file of files) {
      try {
        await fsPromises.unlink(file);
        this.logger.debug(`Deleted temp file: ${file}`);
      } catch (error) {
        this.logger.warn(`Failed to delete temp file ${file}: ${error.message}`);
      }
    }
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

  /**
   * Split text into chunks intelligently by finding sentence boundaries
   * Ensures no chunk exceeds maxSize characters
   */
  private splitTextIntoChunks(text: string, maxSize: number): string[] {
    if (text.length <= maxSize) {
      return [text];
    }

    const chunks: string[] = [];
    let currentChunk = '';

    // Split by sentences (. ! ? followed by space or end)
    const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) || [text];

    for (const sentence of sentences) {
      // If single sentence is too long, force split it
      if (sentence.length > maxSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        // Split long sentence by words at maxSize boundary
        const words = sentence.split(' ');
        let tempChunk = '';
        for (const word of words) {
          if ((tempChunk + ' ' + word).length > maxSize) {
            chunks.push(tempChunk.trim());
            tempChunk = word;
          } else {
            tempChunk += (tempChunk ? ' ' : '') + word;
          }
        }
        if (tempChunk) {
          currentChunk = tempChunk;
        }
        continue;
      }

      // Check if adding this sentence would exceed limit
      if ((currentChunk + sentence).length > maxSize) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }

    // Add remaining chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}
