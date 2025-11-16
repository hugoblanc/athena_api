import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { QaJob, QaJobStatus } from '../domain/qa-job.entity';
import { RagService } from './rag.service';

@Injectable()
export class QaService {
  constructor(
    @InjectRepository(QaJob)
    private qaJobRepository: Repository<QaJob>,
    private ragService: RagService,
  ) {}

  /**
   * Crée un nouveau job de question et démarre le traitement en arrière-plan
   * @param question Question de l'utilisateur
   * @returns Job ID
   */
  async createJob(question: string): Promise<string> {
    const jobId = uuidv4();

    // Créer le job en base avec status 'processing'
    const job = new QaJob({
      id: jobId,
      question,
      answer: null,
      sources: null,
      status: 'processing',
      errorMessage: null,
      completedAt: null,
    });

    await this.qaJobRepository.save(job);

    // Lancer le traitement en arrière-plan (fire-and-forget)
    this.processJob(jobId).catch((error) => {
      console.error(`Error processing job ${jobId}:`, error);
    });

    return jobId;
  }

  /**
   * Traite un job de manière asynchrone
   * @param jobId ID du job
   */
  private async processJob(jobId: string): Promise<void> {
    try {
      const job = await this.qaJobRepository.findOne({ where: { id: jobId } });

      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      // 1. Construire le contexte RAG
      const context = await this.ragService.buildContext(job.question);

      // 2. Générer la réponse complète
      const answer = await this.ragService.generateAnswer(job.question, context);

      // 3. Mettre à jour le job avec la réponse
      job.answer = answer;
      job.sources = context.sources;
      job.status = 'completed';
      job.completedAt = new Date();

      await this.qaJobRepository.save(job);
    } catch (error) {
      // En cas d'erreur, marquer le job comme failed
      await this.qaJobRepository.update(jobId, {
        status: 'error',
        errorMessage: error.message,
        completedAt: new Date(),
      });
    }
  }

  /**
   * Récupère un job par son ID
   * @param jobId ID du job
   * @returns Job ou null
   */
  async getJob(jobId: string): Promise<QaJob | null> {
    return this.qaJobRepository.findOne({ where: { id: jobId } });
  }

  /**
   * Récupère l'historique des jobs, paginé
   * @param page Numéro de page (commence à 1)
   * @param limit Nombre de résultats par page
   * @returns Liste des jobs et total
   */
  async getHistory(
    page: number = 1,
    limit: number = 20,
  ): Promise<{ jobs: QaJob[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const [jobs, total] = await this.qaJobRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      jobs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Supprime un job de l'historique
   * @param jobId ID du job à supprimer
   * @returns true si supprimé, false sinon
   */
  async deleteJob(jobId: string): Promise<boolean> {
    const result = await this.qaJobRepository.delete({ id: jobId });
    return result.affected > 0;
  }

  /**
   * Stream la réponse d'un job en temps réel
   * Utilisé par l'endpoint SSE
   * @param jobId ID du job
   * @returns AsyncGenerator de chunks
   */
  async *streamJobAnswer(jobId: string): AsyncGenerator<string, void, unknown> {
    const job = await this.qaJobRepository.findOne({ where: { id: jobId } });

    if (!job) {
      throw new Error('Job not found');
    }

    // Si le job est déjà terminé, envoyer la réponse complète
    if (job.status === 'completed' && job.answer) {
      yield `data: ${JSON.stringify({ type: 'token', content: job.answer })}\n\n`;
      yield `data: ${JSON.stringify({ type: 'done', sources: job.sources })}\n\n`;
      return;
    }

    if (job.status === 'error') {
      yield `data: ${JSON.stringify({ type: 'error', message: job.errorMessage })}\n\n`;
      return;
    }

    // Si le job est en cours, on doit le traiter en streaming
    try {
      // 1. Construire le contexte
      const context = await this.ragService.buildContext(job.question);

      let fullAnswer = '';

      // 2. Streamer la réponse token par token
      for await (const chunk of this.ragService.streamAnswer(job.question, context)) {
        if (chunk.done) {
          // Sauvegarder la réponse complète en DB
          job.answer = fullAnswer;
          job.sources = context.sources;
          job.status = 'completed';
          job.completedAt = new Date();
          await this.qaJobRepository.save(job);

          // Envoyer l'événement de fin avec les sources
          yield `data: ${JSON.stringify({ type: 'done', sources: context.sources })}\n\n`;
        } else {
          fullAnswer += chunk.token;
          // Envoyer chaque token au client
          yield `data: ${JSON.stringify({ type: 'token', content: chunk.token })}\n\n`;
        }
      }
    } catch (error) {
      // En cas d'erreur, mettre à jour le job et envoyer l'erreur
      job.status = 'error';
      job.errorMessage = error.message;
      job.completedAt = new Date();
      await this.qaJobRepository.save(job);

      yield `data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`;
    }
  }
}
