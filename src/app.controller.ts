import { Controller, Get, Param, Render, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { CronService } from './providers/cron-service';
import { join } from 'path';

@Controller('privacy')
export class AppController {
  constructor(private readonly appService: AppService, private cronService: CronService) { }

  @Get()
  root(@Res() res) {
    res.sendFile(join(__dirname, '../public/privacy.html'));
  }

}
