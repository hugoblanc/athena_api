import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { createModule } from './fixture/module.fixture';
import assert = require('assert');

describe('GET /content/last?page=1&size=4 ', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await createModule();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should return the correct', () => {
    return request(app.getHttpServer())
      .get('/content/last?page=1&size=4')
      .expect(response => {
        expect(response.body).toEqual({
          objects: [
            {
              id: 74,
              contentId: '60362',
              title: 'Boom un nouvel article',
              publishedAt: '2022-07-21T09:43:24.000Z',
              metaMedia: {
                id: 2,
                key: 'mrmondialisation',
                url: 'https://mrmondialisation.org/',
                title: 'Mr Mondialisation',
                logo: 'assets/mrmondialisation_logo.png',
                donation: 'https://en.tipeee.com/mr-mondialisation',
                type: 'WORDPRESS',
              },
              image: null,
            },
            {
              id: 75,
              contentId: '60363',
              title: 'Boom un dernier article',
              publishedAt: '2022-07-21T09:43:24.000Z',
              metaMedia: {
                id: 2,
                key: 'mrmondialisation',
                url: 'https://mrmondialisation.org/',
                title: 'Mr Mondialisation',
                logo: 'assets/mrmondialisation_logo.png',
                donation: 'https://en.tipeee.com/mr-mondialisation',
                type: 'WORDPRESS',
              },
              image: null,
            },
            {
              id: 73,
              contentId: '60361',
              title: 'Geoinformatique',
              publishedAt: '2022-07-19T09:43:24.000Z',
              metaMedia: {
                id: 2,
                key: 'mrmondialisation',
                url: 'https://mrmondialisation.org/',
                title: 'Mr Mondialisation',
                logo: 'assets/mrmondialisation_logo.png',
                donation: 'https://en.tipeee.com/mr-mondialisation',
                type: 'WORDPRESS',
              },
              image: null,
            },
            {
              id: 71,
              contentId: '60639',
              title: 'Internet une si longue depossession',
              publishedAt: '2022-06-24T16:20:07.000Z',
              metaMedia: {
                id: 1,
                key: 'lvsl',
                url: 'https://lvsl.fr/',
                title: 'Le Vent Se Lève',
                logo: 'assets/lvsl_logo.jpg',
                donation: 'https://lvsl.fr/faire-un-don/',
                type: 'WORDPRESS',
              },
              image: null,
            },
          ],
          totalCount: 5,
          count: 4,
          page: 1,
        });
      });
  });

  it('should return a correct page 2', () => {
    return request(app.getHttpServer())
      .get('/content/last?page=2&size=2')
      .expect(response => {
        expect(response.body.objects).toContainEqual(
          {
            id: 73,
            contentId: '60361',
            title: 'Geoinformatique',
            publishedAt: '2022-07-19T09:43:24.000Z',
            metaMedia: {
              id: 2,
              key: 'mrmondialisation',
              url: 'https://mrmondialisation.org/',
              title: 'Mr Mondialisation',
              logo: 'assets/mrmondialisation_logo.png',
              donation: 'https://en.tipeee.com/mr-mondialisation',
              type: 'WORDPRESS',
            },
            image: null,
          });
      });
  });

  it('should filter by text find in title', () => {
    return request(app.getHttpServer())
      .get('/content/last?page=1&size=10&terms=depossession')
      .expect({
        objects: [
          {
            id: 71,
            contentId: '60639',
            title: 'Internet une si longue depossession',
            publishedAt: '2022-06-24T16:20:07.000Z',
            metaMedia: {
              id: 1,
              key: 'lvsl',
              url: 'https://lvsl.fr/',
              title: 'Le Vent Se Lève',
              logo: 'assets/lvsl_logo.jpg',
              donation: 'https://lvsl.fr/faire-un-don/',
              type: 'WORDPRESS',
            },
            image: null,
          },
        ],
        totalCount: 1,
        count: 1,
        page: 1,
      });
  });

  afterEach(async done => {
    await app.close();
    done();
  });
});
