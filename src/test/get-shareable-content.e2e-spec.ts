import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import assert = require('assert');
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('GET /content/last?page=1&size=4 ', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should return the correct response', () => {
    return request(app.getHttpServer())
      .get('/get-shareable-content/74')
      .expect(response => {
        assert(response.body.count === 4);
        assert(response.body.totalCount === 5);
        expect(response.body).toEqual({
          title: 'Boom un nouvel article',
          originalUrl: 'https://',
          image: null,
        });
      });
  });

  afterEach(async done => {
    await app.close();
    done();
  });
});
