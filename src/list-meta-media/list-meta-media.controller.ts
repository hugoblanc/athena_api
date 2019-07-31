import { Controller, Get } from '@nestjs/common';
import { ListMetaMediaService } from './list-meta-media.service';

@Controller('list-meta-media')
export class ListMetaMediaController {

  constructor(private service: ListMetaMediaService) { }

  @Get()
  async getAll() {
    return await this.service.findAll();
  }

}
