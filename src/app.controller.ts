import { Controller, Get, Param, Render, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { CronService } from './providers/cron-service';
import { join } from 'path';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private cronService: CronService) { }

  @Get('/')
  index(@Res() res) {
    res.sendFile(join(__dirname, '../public/index.html'));
  }

  @Get('/privacy')
  privacy(@Res() res) {
    res.sendFile(join(__dirname, '../public/privacy.html'));
  }

}
