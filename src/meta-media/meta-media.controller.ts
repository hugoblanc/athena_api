import { Controller, Get } from '@nestjs/common';
import { MetaMediaService } from './meta-media.service';
import { MetaMedia } from './meta-media.entity';

@Controller('meta-media')
export class MetaMediaController {

  constructor(private service: MetaMediaService) {}

  @Get()
  async getAll(): Promise<MetaMedia[]> {
    return await this.service.findAll();
  }

}
