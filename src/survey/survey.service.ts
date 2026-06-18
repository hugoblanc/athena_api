import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../law-proposal/infrastructure/prisma.service';
import { CreateSurveyResponseDto } from './dto/create-survey-response.dto';

@Injectable()
export class SurveyService {
  private readonly logger = new Logger(SurveyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enregistre une réponse de sondage. `country` vient du serveur (geoip), pas
   * du client. Le texte libre est conservé tel quel ; aucune IP n'est stockée.
   */
  async record(
    dto: CreateSurveyResponseDto,
    country: string | null,
  ): Promise<void> {
    await this.prisma.surveyResponse.create({
      data: {
        survey: dto.survey,
        message: dto.message.trim(),
        contact: dto.contact?.trim() || null,
        country,
        locale: dto.locale ?? null,
      },
    });

    this.logger.log(
      `Survey "${dto.survey}" response stored (country=${country ?? '??'})`,
    );
  }
}
