import { Controller, Get } from '@nestjs/common';
import { ListMetaMedia } from './list-meta-media.entity';
import { ListMetaMediaService } from './list-meta-media.service';

@Controller('list-meta-media')
export class ListMetaMediaController {

  constructor(private service: ListMetaMediaService) { }

  @Get()
  getAll(): Promise<ListMetaMedia[]> {
    return this.service.findAll();
  }

}
