import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';


describe('ListMetaMediaController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/list-meta-media (GET)', () => {


    console.error(JSON.stringify([
      {
        id: 1,
        title: "Presse écrite",
        metaMedias: [
          {
            id: 1,
            key: "lvsl",
            url: "https://lvsl.fr/",
            title: "Le Vent Se Lève",
            logo: "assets/lvsl_logo.jpg",
            donation: "https://lvsl.fr/faire-un-don/",
            type: "WORDPRESS"
          },
          {
            id: 2,
            key: "mrmondialisation",
            url: "https://mrmondialisation.org/",
            title: "Mr Mondialisation",
            logo: "assets/mrmondialisation_logo.png",
            donation: "https://en.tipeee.com/mr-mondialisation",
            type: "WORDPRESS"
          },
          {
            id: 4,
            key: "lemondemoderne",
            url: "https://www.lemondemoderne.media/",
            title: "Le Monde Moderne",
            logo: "assets/lemondemoderne.jpg",
            donation: null,
            type: "WORDPRESS"
          },
          {
            id: 8,
            key: "laquadrature",
            url: "https://www.laquadrature.net/",
            title: "La quadrature du net",
            logo: "https://www.athena-app.fr/quadrature.png",
            donation: "https://soutien.laquadrature.net/",
            type: "WORDPRESS"
          },
          {
            id: 9,
            key: "relevepeste",
            url: "https://lareleveetlapeste.fr/",
            title: "La relève et La peste",
            logo: "https://www.athena-app.fr/lareleveetlapeste.jpg",
            donation: null,
            type: "WORDPRESS"
          },
          {
            id: 10,
            key: "bonpote",
            url: "https://bonpote.com/",
            title: "Bon Pote",
            logo: "https://www.athena-app.fr/bon-pote.png",
            donation: "https://fr.tipeee.com/bon-pote/",
            type: "WORDPRESS"
          },
          {
            id: 12,
            key: "lesrepliques",
            url: "https://lesrepliques.com/",
            title: "Les Repliques",
            logo: "https://www.athena-app.fr/les-repliques.png",
            donation: "https://fr.tipeee.com/les-repliques",
            type: "WORDPRESS"
          }
        ]
      },
      {
        id: 3,
        title: "Vidéo",
        metaMedias: [
          {
            id: 7,
            key: "osonscauser",
            url: "UCVeMw72tepFl1Zt5fvf9QKQ",
            title: "Osons causer",
            logo: "https://www.athena-app.fr/osonscauser.jpg",
            donation: null,
            type: "YOUTUBE"
          }
        ]
      }
    ]));


    return request(app.getHttpServer())
      .get('/list-meta-media')
      .expect(200)
      .expect([
        {
          id: 1,
          title: "Presse écrite",
          metaMedias: [
            {
              id: 1,
              key: "lvsl",
              url: "https://lvsl.fr/",
              title: "Le Vent Se Lève",
              logo: "assets/lvsl_logo.jpg",
              donation: "https://lvsl.fr/faire-un-don/",
              type: "WORDPRESS"
            },
            {
              id: 2,
              key: "mrmondialisation",
              url: "https://mrmondialisation.org/",
              title: "Mr Mondialisation",
              logo: "assets/mrmondialisation_logo.png",
              donation: "https://en.tipeee.com/mr-mondialisation",
              type: "WORDPRESS"
            },
            {
              id: 4,
              key: "lemondemoderne",
              url: "https://www.lemondemoderne.media/",
              title: "Le Monde Moderne",
              logo: "assets/lemondemoderne.jpg",
              donation: null,
              type: "WORDPRESS"
            },
            {
              id: 8,
              key: "laquadrature",
              url: "https://www.laquadrature.net/",
              title: "La quadrature du net",
              logo: "https://www.athena-app.fr/quadrature.png",
              donation: "https://soutien.laquadrature.net/",
              type: "WORDPRESS"
            },
            {
              id: 9,
              key: "relevepeste",
              url: "https://lareleveetlapeste.fr/",
              title: "La relève et La peste",
              logo: "https://www.athena-app.fr/lareleveetlapeste.jpg",
              donation: null,
              type: "WORDPRESS"
            },
            {
              id: 10,
              key: "bonpote",
              url: "https://bonpote.com/",
              title: "Bon Pote",
              logo: "https://www.athena-app.fr/bon-pote.png",
              donation: "https://fr.tipeee.com/bon-pote/",
              type: "WORDPRESS"
            },
            {
              id: 12,
              key: "lesrepliques",
              url: "https://lesrepliques.com/",
              title: "Les Repliques",
              logo: "https://www.athena-app.fr/les-repliques.png",
              donation: "https://fr.tipeee.com/les-repliques",
              type: "WORDPRESS"
            }
          ]
        },
        {
          id: 3,
          title: "Vidéo",
          metaMedias: [
            {
              id: 7,
              key: "osonscauser",
              url: "UCVeMw72tepFl1Zt5fvf9QKQ",
              title: "Osons causer",
              logo: "https://www.athena-app.fr/osonscauser.jpg",
              donation: null,
              type: "YOUTUBE"
            }
          ]
        }
      ])



  });

  afterEach(async (done) => {
    await app.close();
    done()
  });

});
