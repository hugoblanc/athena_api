import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../podcast/infrastructure/prisma.service';
import { Logger } from '@nestjs/common';
import * as https from 'https';
import * as http from 'http';

/**
 * Script pour calculer et mettre à jour les durées manquantes des podcasts existants
 *
 * Usage: npm run script:calculate-durations
 */

interface WavConversionOptions {
  sampleRate: number;
  bitsPerSample: number;
  channels: number;
}

class DurationCalculator {
  private logger = new Logger(DurationCalculator.name);

  /**
   * Download WAV file from URL
   */
  private async downloadWavFile(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;

      protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      }).on('error', reject);
    });
  }

  /**
   * Parse WAV header to extract audio parameters
   */
  private parseWavHeader(wavBuffer: Buffer): WavConversionOptions {
    // WAV header structure:
    // Bytes 22-23: Number of channels
    // Bytes 24-27: Sample rate
    // Bytes 34-35: Bits per sample

    const channels = wavBuffer.readUInt16LE(22);
    const sampleRate = wavBuffer.readUInt32LE(24);
    const bitsPerSample = wavBuffer.readUInt16LE(34);

    return { sampleRate, bitsPerSample, channels };
  }

  /**
   * Calculate WAV file duration in seconds
   */
  private calculateWavDuration(wavBuffer: Buffer): number {
    try {
      // Parse WAV header to get audio parameters
      const { sampleRate, bitsPerSample, channels } = this.parseWavHeader(wavBuffer);

      // Calculate byte rate: sampleRate * blockAlign
      const blockAlign = (channels * bitsPerSample) / 8;
      const byteRate = sampleRate * blockAlign;

      // Get data length from WAV buffer
      // WAV header is 44 bytes, rest is audio data
      const dataLength = wavBuffer.length - 44;

      // Calculate duration in seconds
      const durationInSeconds = dataLength / byteRate;

      this.logger.debug(`Calculated duration: ${durationInSeconds.toFixed(2)}s (dataLength: ${dataLength}, byteRate: ${byteRate})`);

      // Return duration rounded to nearest second
      return Math.round(durationInSeconds);
    } catch (error) {
      this.logger.warn(`Failed to calculate WAV duration: ${error.message}`);
      return 0;
    }
  }

  /**
   * Calculate duration for a single podcast
   */
  async calculateDuration(audioUrl: string): Promise<number | null> {
    try {
      this.logger.log(`Downloading WAV file: ${audioUrl}`);
      const wavBuffer = await this.downloadWavFile(audioUrl);

      const duration = this.calculateWavDuration(wavBuffer);
      this.logger.log(`Duration calculated: ${duration}s`);

      return duration;
    } catch (error) {
      this.logger.error(`Failed to calculate duration for ${audioUrl}: ${error.message}`);
      return null;
    }
  }
}

async function bootstrap() {
  const logger = new Logger('CalculateMissingDurations');

  logger.log('Starting duration calculation script...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const calculator = new DurationCalculator();

  try {
    // Find all podcasts with null duration
    const podcasts = await prisma.podcast.findMany({
      where: {
        OR: [
          { duration: null },
          { duration: 0 },
        ],
        status: 'completed',
      },
      select: {
        id: true,
        audioUrl: true,
        contentId: true,
      },
    });

    logger.log(`Found ${podcasts.length} podcasts with missing duration`);

    let successCount = 0;
    let failureCount = 0;

    for (const podcast of podcasts) {
      logger.log(`Processing podcast ${podcast.id} (content ${podcast.contentId})...`);

      const duration = await calculator.calculateDuration(podcast.audioUrl);

      if (duration !== null && duration > 0) {
        await prisma.podcast.update({
          where: { id: podcast.id },
          data: { duration },
        });

        logger.log(`✓ Updated podcast ${podcast.id} with duration ${duration}s`);
        successCount++;
      } else {
        logger.warn(`✗ Failed to calculate duration for podcast ${podcast.id}`);
        failureCount++;
      }

      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    logger.log('');
    logger.log('=== Summary ===');
    logger.log(`Total podcasts processed: ${podcasts.length}`);
    logger.log(`Successfully updated: ${successCount}`);
    logger.log(`Failed: ${failureCount}`);

  } catch (error) {
    logger.error(`Script failed: ${error.message}`, error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
