import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../auth/infrastructure/decorators';
import { IpRateLimitGuard } from '../analytics/ip-rate-limit.guard';
import { resolveCountry } from '../core/geo/geo.util';
import { SurveyService } from './survey.service';
import {
  CreateSurveyResponseDto,
  SURVEYS,
  SURVEY_ELIGIBLE_COUNTRY,
  type Survey,
} from './dto/create-survey-response.dto';

function isSurvey(value: string | undefined): value is Survey {
  return value != null && (SURVEYS as readonly string[]).includes(value);
}

/**
 * Sondages in-app ciblés par géolocalisation (ex. sondage Iran). Public,
 * throttlé par IP. L'éligibilité ET l'enregistrement reposent sur le pays
 * geoip déduit côté serveur — le client ne peut pas se déclarer éligible.
 */
@Controller('survey')
@Public()
@UseGuards(IpRateLimitGuard)
export class SurveyController {
  constructor(private readonly surveyService: SurveyService) {}

  /**
   * Pays du visiteur. En local (NODE_ENV ≠ production), `SURVEY_DEV_COUNTRY`
   * (ex. `IR`) force le pays pour tester le flux sans IP réelle. Ignoré en prod.
   */
  private resolveCountry(req: Request): string | null {
    if (process.env.NODE_ENV !== 'production' && process.env.SURVEY_DEV_COUNTRY) {
      return process.env.SURVEY_DEV_COUNTRY;
    }
    return resolveCountry(req);
  }

  /**
   * GET /survey/eligibility?survey=iran
   * Indique si le visiteur (d'après son pays geoip) doit voir le sondage.
   * Aucune donnée stockée.
   */
  @Get('eligibility')
  eligibility(
    @Req() req: Request,
    @Query('survey') survey = 'iran',
  ): { survey: string; country: string | null; eligible: boolean } {
    const country = this.resolveCountry(req);
    const eligible =
      isSurvey(survey) && country === SURVEY_ELIGIBLE_COUNTRY[survey];
    return { survey, country, eligible };
  }

  /**
   * POST /survey/feedback
   * Enregistre une réponse. Refusé (403) si le pays geoip ne correspond pas au
   * pays ciblé par le sondage : seul le public visé peut répondre.
   */
  @Post('feedback')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async feedback(
    @Req() req: Request,
    @Body() dto: CreateSurveyResponseDto,
  ): Promise<void> {
    const country = this.resolveCountry(req);
    if (country !== SURVEY_ELIGIBLE_COUNTRY[dto.survey]) {
      throw new ForbiddenException('Survey not available in your region');
    }
    await this.surveyService.record(dto, country);
  }
}
