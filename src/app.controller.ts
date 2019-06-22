import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { CronService } from './providers/cron-service';

@Controller('hello')
export class AppController {
  constructor(private readonly appService: AppService, private cronService: CronService) {}

  @Get()
  getHello(): string {
      console.log("On est dans le get ");
    return this.appService.getHello();
  }

}


