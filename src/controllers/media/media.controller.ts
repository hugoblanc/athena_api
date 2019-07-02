import { Controller, Get } from '@nestjs/common';
import { MetaMedia } from '../../models/meta-media';
import { MediaService } from '../../providers/media/media.service';

@Controller('media')
export class MediaController {

  @Get()
  getAll(): MetaMedia[] {
    return MediaService.MEDIAS;
  }

}
