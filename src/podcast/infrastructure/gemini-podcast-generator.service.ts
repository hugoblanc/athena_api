import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../../storage/application/storage.service';
import { PodcastGeneratorService, PodcastGenerationResult } from '../application/providers/podcast-generator.service';
import { Content, MetaMedia } from '@prisma/client';
import { PODCAST_SYSTEM_PROMPT } from '../application/providers/podcast-prompt.constants';
import { writeFile, unlink } from 'fs/promises';
import mime from 'mime';

type ContentWithMetaMedia = Content & { meta_media: MetaMedia };

interface WavConversionOptions {
  sampleRate: number;
  bitsPerSample: number;
  channels: number;
}

@Injectable()
export class GeminiPodcastGeneratorService extends PodcastGeneratorService {
  private logger = new Logger(GeminiPodcastGeneratorService.name);
  private ai: GoogleGenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {
    super();
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generatePodcastFromContent(content: ContentWithMetaMedia): Promise<PodcastGenerationResult> {
    // Étape 1 : Générer le dialogue avec Gemini Flash 3
    const dialogueText = await this.generateDialogue(content);
    this.logger.log(`Dialogue generated for content ${content.id} (${dialogueText.length} chars)`);

    // Étape 2 : Générer l'audio TTS multi-speaker avec calcul de la durée
    const { filename: audioFilename, duration } = await this.generateAudio(dialogueText, content);
    this.logger.log(`Audio generated: ${audioFilename} (${duration}s)`);

    // Étape 3 : Upload vers Google Cloud Storage
    const localFilePath = `./${audioFilename}`;
    const destinationPath = `${content.meta_media.key}/podcasts/${audioFilename}`;
    const audioUrl = await this.storageService.saveFile(localFilePath, destinationPath);

    await unlink(localFilePath);
    this.logger.log(`Podcast uploaded to ${audioUrl}`);

    return {
      dialogueText,
      audioUrl,
      duration,
    };
  }

  private async generateDialogue(content: ContentWithMetaMedia): Promise<string> {
    const config = {
      thinkingConfig: { thinkingLevel: 'HIGH' as const },
      tools: [{ googleSearch: {} }],
    } as any;

    const userPrompt = `${PODCAST_SYSTEM_PROMPT}\n\nArticle à transformer :\n\nTitre: ${content.title}\n\n${content.plainText}`;

    const response = await this.ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      config,
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
    });

    let dialogue = '';
    for await (const chunk of response) {
      if (chunk.text) {
        dialogue += chunk.text;
      }
    }

    // Insérer l'introduction après la ligne [TON: ...] et avant le premier speaker
    const trimmedDialogue = dialogue.trim();
    const lines = trimmedDialogue.split('\n');

    // Trouver l'index de la ligne TON
    const tonIndex = lines.findIndex(line => line.trim().startsWith('[TON:'));

    if (tonIndex !== -1) {
      const mediaName = content.meta_media.title;
      const introLine = `\nSpeaker 1 : Ce podcast a été généré par l'application Athena, en utilisant comme source l'article de ${mediaName}, que vous pouvez retrouver en lien avec ce podcast.\n`;

      // Insérer l'introduction après la ligne TON
      lines.splice(tonIndex + 1, 0, introLine);
      return lines.join('\n');
    }

    return trimmedDialogue;
  }

  private async generateAudio(dialogueText: string, content: Content): Promise<{ filename: string; duration: number }> {
    const config = {
      temperature: 1,
      responseModalities: ['audio'],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            {
              speaker: 'Speaker 1',
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } },
            },
            {
              speaker: 'Speaker 2',
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
            },
          ],
        },
      },
    };

    const response = await this.ai.models.generateContentStream({
      model: 'gemini-2.5-flash-preview-tts',
      config,
      contents: [
        {
          role: 'user',
          parts: [{ text: dialogueText }],
        },
      ],
    });

    const audioFilename = `podcast_${content.contentId}.wav`;
    const audioChunks: Buffer[] = [];
    let lastMimeType = '';

    for await (const chunk of response) {
      if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
        const inlineData = chunk.candidates[0].content.parts[0].inlineData;
        let buffer: Buffer = Buffer.from(inlineData.data || '', 'base64');

        // Convertir en WAV si nécessaire
        const fileExtension = mime.getExtension(inlineData.mimeType || '');
        if (!fileExtension) {
          buffer = this.convertToWav(inlineData.data || '', inlineData.mimeType || '') as Buffer;
        }

        lastMimeType = inlineData.mimeType || '';
        audioChunks.push(buffer);
      }
    }

    // Concaténer tous les chunks
    const finalBuffer = Buffer.concat(audioChunks);
    await writeFile(audioFilename, finalBuffer);

    // Calculer la durée du fichier WAV
    const duration = this.calculateWavDuration(finalBuffer, lastMimeType);

    return { filename: audioFilename, duration };
  }

  // Méthode de conversion WAV
  private convertToWav(rawData: string, mimeType: string): Buffer {
    const options = this.parseMimeType(mimeType);
    const dataBuffer = Buffer.from(rawData, 'base64');
    const wavHeader = this.createWavHeader(dataBuffer.length, options);
    return Buffer.concat([wavHeader, dataBuffer]);
  }

  private parseMimeType(mimeType: string): WavConversionOptions {
    // Default values
    let sampleRate = 24000;
    let bitsPerSample = 16;
    let channels = 1;

    // Parse mime type like "audio/l16;rate=24000;channels=1"
    if (mimeType.includes('rate=')) {
      const rateMatch = mimeType.match(/rate=(\d+)/);
      if (rateMatch) sampleRate = parseInt(rateMatch[1]);
    }

    if (mimeType.includes('channels=')) {
      const channelsMatch = mimeType.match(/channels=(\d+)/);
      if (channelsMatch) channels = parseInt(channelsMatch[1]);
    }

    return { sampleRate, bitsPerSample, channels };
  }

  private createWavHeader(dataLength: number, options: WavConversionOptions): Buffer {
    const { sampleRate, bitsPerSample, channels } = options;
    const blockAlign = (channels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;

    const header = Buffer.alloc(44);

    // RIFF chunk descriptor
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataLength, 4);
    header.write('WAVE', 8);

    // fmt sub-chunk
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
    header.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);

    // data sub-chunk
    header.write('data', 36);
    header.writeUInt32LE(dataLength, 40);

    return header;
  }

  /**
   * Calculate WAV file duration in seconds
   * Duration = dataLength / byteRate
   */
  private calculateWavDuration(wavBuffer: Buffer, mimeType: string): number {
    try {
      // Parse WAV header to get audio parameters
      const options = this.parseMimeType(mimeType);
      const { sampleRate, bitsPerSample, channels } = options;

      // Calculate byte rate: sampleRate * blockAlign
      const blockAlign = (channels * bitsPerSample) / 8;
      const byteRate = sampleRate * blockAlign;

      // Get data length from WAV buffer
      // WAV header is 44 bytes, rest is audio data
      const dataLength = wavBuffer.length - 44;

      // Calculate duration in seconds
      const durationInSeconds = dataLength / byteRate;

      this.logger.log(`Calculated duration: ${durationInSeconds.toFixed(2)}s (dataLength: ${dataLength}, byteRate: ${byteRate})`);

      // Return duration rounded to nearest second
      return Math.round(durationInSeconds);
    } catch (error) {
      this.logger.warn(`Failed to calculate WAV duration: ${error.message}`);
      return 0;
    }
  }
}
