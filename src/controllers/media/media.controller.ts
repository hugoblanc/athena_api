import { Controller, Get } from '@nestjs/common';
import { MetaMedia } from '../../models/meta-media';

@Controller('media')
export class MediaController {

  public static MEDIAS: MetaMedia[] = [
    {
      url: 'https://lvsl.fr/',
      title: 'Le Vent Se Lève',
      color: 'tertiary',
      donation: 'https://lvsl.fr/faire-un-don/',
      logo: 'assets/lvsl_logo.png',
    },
    {
      url: 'https://mrmondialisation.org/',
      title: 'Mr Mondialisation',
      color: 'secondary',
      donation: 'https://mrmondialisation.org/donation/',
      logo: 'assets/mrmondialisation_logo.png',
    },
    {
      url: 'https://www.4emesinge.com/',
      title: 'Le 4eme Singe',
      color: 'success',
      donation: 'https://www.helloasso.com/associations/le-4eme-singe/formulaires/1/fr',
      logo: 'assets/4emesinge_logo.jpg',
    },
  ];

  @Get()
  getAll(): MetaMedia[] {
    return MediaController.MEDIAS;
  }

}
