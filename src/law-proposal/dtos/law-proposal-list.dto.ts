import { IsOptional, IsInt, Min, Max, IsEnum, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export enum SortOrder {
  DATE_DESC = 'dateMiseEnLigne:desc',
  DATE_ASC = 'dateMiseEnLigne:asc',
  TITRE_ASC = 'titre:asc',
  TITRE_DESC = 'titre:desc',
  NUMERO_ASC = 'numero:asc',
  NUMERO_DESC = 'numero:desc',
}

export enum SimplificationStatus {
  COMPLETED = 'completed',
  PENDING = 'pending',
  FAILED = 'failed',
}

export enum TypeProposition {
  ORDINAIRE = 'ordinaire',
  CONSTITUTIONNELLE = 'constitutionnelle',
}

/**
 * DTO pour les query parameters de l'endpoint GET /law-proposals
 */
export class ListLawProposalsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(SortOrder)
  sort?: SortOrder = SortOrder.DATE_DESC;

  @IsOptional()
  @IsString()
  'filter[groupePolitique]'?: string; // Codes séparés par virgule (ex: "RN,LFI_NFP")

  @IsOptional()
  @IsEnum(TypeProposition)
  'filter[typeProposition]'?: TypeProposition;

  @IsOptional()
  @IsDateString()
  'filter[dateDebut]'?: string;

  @IsOptional()
  @IsDateString()
  'filter[dateFin]'?: string;

  @IsOptional()
  @IsEnum(SimplificationStatus)
  'filter[simplificationStatus]'?: SimplificationStatus;

  @IsOptional()
  @IsString()
  include?: string = 'simplified,auteur'; // Relations à inclure séparées par virgule
}

/**
 * DTO pour la pagination dans la réponse
 */
export interface PaginationDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * DTO pour la réponse de l'endpoint GET /law-proposals
 */
export interface ListLawProposalsResponseDto {
  data: any[]; // Sera typé avec LawProposalSummaryDto
  pagination: PaginationDto;
}
