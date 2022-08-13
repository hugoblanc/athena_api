import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../app.module';


describe('ListMetaMediaController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/content/last?page=1&size=4 (GET)', () => {
    return request(app.getHttpServer())
      .get('/content/last?page=1&size=4')
      .expect(200).expect({
        "objects": [
          {
            "id": 74,
            "contentId": "60362",
            "title": "Boom un nouvel article",
            "publishedAt": "2022-07-21T09:43:24.000Z",
            "metaMedia": {
              "id": 2,
              "key": "mrmondialisation",
              "url": "https://mrmondialisation.org/",
              "title": "Mr Mondialisation",
              "logo": "assets/mrmondialisation_logo.png",
              "donation": "https://en.tipeee.com/mr-mondialisation",
              "type": "WORDPRESS"
            },
            "image": null
          },
          {
            "id": 75,
            "contentId": "60363",
            "title": "Boom un dernier article",
            "publishedAt": "2022-07-21T09:43:24.000Z",
            "metaMedia": {
              "id": 2,
              "key": "mrmondialisation",
              "url": "https://mrmondialisation.org/",
              "title": "Mr Mondialisation",
              "logo": "assets/mrmondialisation_logo.png",
              "donation": "https://en.tipeee.com/mr-mondialisation",
              "type": "WORDPRESS"
            },
            "image": null
          },
          {
            "id": 73,
            "contentId": "60361",
            "title": "Géoingénierie de la captation : la prochaine grande controverse climat",
            "publishedAt": "2022-07-19T09:43:24.000Z",
            "metaMedia": {
              "id": 2,
              "key": "mrmondialisation",
              "url": "https://mrmondialisation.org/",
              "title": "Mr Mondialisation",
              "logo": "assets/mrmondialisation_logo.png",
              "donation": "https://en.tipeee.com/mr-mondialisation",
              "type": "WORDPRESS"
            },
            "image": null
          },
          {
            "id": 71,
            "contentId": "60639",
            "title": "Internet&nbsp;: une si longue dépossession (1/2)",
            "publishedAt": "2022-06-24T16:20:07.000Z",
            "metaMedia": {
              "id": 1,
              "key": "lvsl",
              "url": "https://lvsl.fr/",
              "title": "Le Vent Se Lève",
              "logo": "assets/lvsl_logo.jpg",
              "donation": "https://lvsl.fr/faire-un-don/",
              "type": "WORDPRESS"
            },
            "image": null
          }
        ],
        "totalCount": 5,
        "count": 4,
        "page": 1
      })
  });

  afterEach(async (done) => {
    await app.close();
    done()
  });
});
