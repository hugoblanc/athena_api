import { Controller, Get, Res } from '@nestjs/common';
import { Public } from './auth/infrastructure/decorators';
import { join } from 'path';

@Controller('/')
@Public()
export class AppController {
  @Get('/')
  index(@Res() res) {
    res.sendFile(join(__dirname, '../public/index.html'));
  }

  @Get('/privacy')
  privacy(@Res() res) {
    res.sendFile(join(__dirname, '../public/privacy.html'));
  }
}
