import { Controller, Get, Res } from '@nestjs/common';
import { join } from 'path';

@Controller()
export class AppController {
  constructor() { }

  @Get('/')
  index(@Res() res) {
    res.sendFile(join(__dirname, '../public/index.html'));
  }

  @Get('/privacy')
  privacy(@Res() res) {
    res.sendFile(join(__dirname, '../public/privacy.html'));
  }

}
