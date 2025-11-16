import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Content } from '../content/domain/content.entity';
import { TextFormatter } from '../content/application/providers/text-formatter.service';
import { TextCheeriosFormatter } from '../content/infrastructure/text-cheerios-formatter.service';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';

@Module({
  imports: [TypeOrmModule.forFeature([Content])],
  controllers: [MaintenanceController],
  providers: [
    MaintenanceService,
    { provide: TextFormatter, useClass: TextCheeriosFormatter },
  ],
})
export class MaintenanceModule {}
