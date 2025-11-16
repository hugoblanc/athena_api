import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { QaService } from './application/qa.service';

class AskQuestionDto {
  question: string;
}

@Controller('qa')
export class QaController {
  constructor(private qaService: QaService) {}

  /**
   * POST /qa/ask
   * Soumet une question et retourne immédiatement un job ID
   */
  @Post('ask')
  async ask(@Body() dto: AskQuestionDto) {
    if (!dto.question || dto.question.trim().length === 0) {
      throw new HttpException('Question is required', HttpStatus.BAD_REQUEST);
    }

    const jobId = await this.qaService.createJob(dto.question.trim());

    return {
      jobId,
      message: 'Question received, processing started',
    };
  }

  /**
   * GET /qa/stream/:jobId
   * Stream la réponse en temps réel via Server-Sent Events (SSE)
   */
  @Get('stream/:jobId')
  async stream(@Param('jobId') jobId: string, @Res() res: Response) {
    // Vérifier que le job existe
    const job = await this.qaService.getJob(jobId);

    if (!job) {
      throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
    }

    // Configurer les headers SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Streamer la réponse
    try {
      for await (const chunk of this.qaService.streamJobAnswer(jobId)) {
        res.write(chunk);
      }
    } catch (error) {
      res.write(
        `data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`,
      );
    } finally {
      res.end();
    }
  }

  /**
   * GET /qa/result/:jobId
   * Récupère le résultat final d'un job (non-streaming)
   */
  @Get('result/:jobId')
  async getResult(@Param('jobId') jobId: string) {
    const job = await this.qaService.getJob(jobId);

    if (!job) {
      throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
    }

    return {
      id: job.id,
      question: job.question,
      answer: job.answer,
      sources: job.sources,
      status: job.status,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }

  /**
   * GET /qa/history
   * Récupère l'historique des questions (paginé)
   */
  @Get('history')
  async getHistory(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      throw new HttpException('Invalid page number', HttpStatus.BAD_REQUEST);
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      throw new HttpException(
        'Invalid limit (must be between 1 and 100)',
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.qaService.getHistory(pageNum, limitNum);

    return {
      data: result.jobs.map((job) => ({
        id: job.id,
        question: job.question,
        answer: job.answer,
        sources: job.sources,
        status: job.status,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      })),
      pagination: {
        page: result.page,
        limit: limitNum,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  /**
   * DELETE /qa/history/:id
   * Supprime un élément de l'historique
   */
  @Delete('history/:id')
  async deleteHistory(@Param('id') id: string) {
    const deleted = await this.qaService.deleteJob(id);

    if (!deleted) {
      throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
    }

    return {
      message: 'Job deleted successfully',
    };
  }
}
