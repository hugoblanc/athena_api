import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { CronService } from './providers/cron-service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private cronService: CronService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get()
  getHellos(): string {
    return this.appService.getHello();
  }

  @Get()
  getHelloss(): string {
    return this.appService.getHello();
  }
}
