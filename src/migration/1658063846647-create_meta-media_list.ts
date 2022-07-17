import { MigrationInterface, QueryRunner } from "typeorm";
import { ListMetaMedia } from '../list-meta-media/list-meta-media.entity';
import { MetaMediaType } from '../meta-media/meta-media-type.enum';
import { MetaMedia } from '../meta-media/meta-media.entity';

export class createMetaMediaList1658063846647 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    let listRepository = queryRunner.manager.getRepository(ListMetaMedia);

    let listPresse = new ListMetaMedia()
    listPresse.title = "Presse écrite";
    listPresse.id = 1;
    listPresse.metaMedias = [];

    listPresse = await listRepository.save(listPresse);



    const media1 = new MetaMedia({
      id: 1,
      key: "lvsl",
      url: "https://lvsl.fr/",
      title: "Le Vent Se Lève",
      logo: "assets/lvsl_logo.jpg",
      listMetaMedia: listPresse,
      type: MetaMediaType.WORDPRESS,
      donation: "https://lvsl.fr/faire-un-don/",
    })
    const media2 = new MetaMedia({
      id: 2,
      key: "mrmondialisation",
      url: "https://mrmondialisation.org/",
      title: "Mr Mondialisation",
      logo: "assets/mrmondialisation_logo.png",
      listMetaMedia: listPresse,
      type: MetaMediaType.WORDPRESS,
      donation: "https://en.tipeee.com/mr-mondialisation",
    })
    const media4 = new MetaMedia({
      id: 4,
      key: "lemondemoderne",
      url: "https://www.lemondemoderne.media/",
      title: "Le Monde Moderne",
      logo: "assets/lemondemoderne.jpg",
      listMetaMedia: listPresse,
      type: MetaMediaType.WORDPRESS,
      donation: null,
    })
    const media8 = new MetaMedia({
      id: 8,
      key: "laquadrature",
      url: "https://www.laquadrature.net/",
      title: "La quadrature du net",
      logo: "https://www.athena-app.fr/quadrature.png",
      listMetaMedia: listPresse,
      type: MetaMediaType.WORDPRESS,
      donation: "https://soutien.laquadrature.net/",
    })
    const media9 = new MetaMedia({
      id: 9,
      key: "relevepeste",
      url: "https://lareleveetlapeste.fr/",
      title: "La relève et La peste",
      logo: "https://www.athena-app.fr/lareleveetlapeste.jpg",
      listMetaMedia: listPresse,
      type: MetaMediaType.WORDPRESS,
      donation: null,
    })
    const media10 = new MetaMedia({
      id: 10,
      key: "bonpote",
      url: "https://bonpote.com/",
      title: "Bon Pote",
      logo: "https://www.athena-app.fr/bon-pote.png",
      listMetaMedia: listPresse,
      type: MetaMediaType.WORDPRESS,
      donation: "https://fr.tipeee.com/bon-pote/",
    })
    const media12 = new MetaMedia({
      id: 12,
      key: "lesrepliques",
      url: "https://lesrepliques.com/",
      title: "Les Repliques",
      logo: "https://www.athena-app.fr/les-repliques.png",
      listMetaMedia: listPresse,
      type: MetaMediaType.WORDPRESS,
      donation: "https://fr.tipeee.com/les-repliques",
    })

    const metaMediaRepository = queryRunner.manager.getRepository(MetaMedia);

    await metaMediaRepository.save(media1);
    await metaMediaRepository.save(media2);
    await metaMediaRepository.save(media4);
    await metaMediaRepository.save(media8);
    await metaMediaRepository.save(media9);
    await metaMediaRepository.save(media10);
    await metaMediaRepository.save(media12);









    // VIDEO



    let listVideo = new ListMetaMedia()
    listVideo.title = "Vidéo"
    listVideo.metaMedias = []
    listVideo.id = 3;
    listVideo = await listRepository.save(listVideo);

    const media11 = new MetaMedia({
      id: 7,
      key: "osonscauser",
      url: "UCVeMw72tepFl1Zt5fvf9QKQ",
      title: "Osons causer",
      logo: "https://www.athena-app.fr/osonscauser.jpg",
      donation: null,
      type: MetaMediaType.YOUTUBE,
      listMetaMedia: listVideo,
    });


    await metaMediaRepository.save(media11);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // DO NOTHING
  }

}
