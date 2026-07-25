import { IsArray, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

/**
 * MAJ partielle des préférences (PUT /auth/preferences). Bornée explicitement :
 * le corps part directement dans un upsert Prisma.
 */
export class UpdatePreferencesDto {
  @IsOptional()
  @IsIn(['light', 'dark', 'system'])
  theme?: string;

  @IsOptional()
  @IsObject()
  notificationTopics?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  favoriteMedias?: string[];
}
