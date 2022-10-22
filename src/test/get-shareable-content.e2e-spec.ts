import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import assert = require('assert');
import { createModule } from './fixture/module.fixture';

describe('GET /content/get-shareable-content', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await createModule();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should return the correct response', () => {
    return request(app.getHttpServer())
      .get('/content/get-shareable-content/lvsl/60639')
      .expect(response => {
        expect(response.body).toEqual({
          title: 'Internet une si longue depossession',
          originalUrl: 'https://lvsl.fr/internet-une-si-longue-depossession/',
          image: null,
        });
      });
  });

  it('should return a 404 if content not found', () => {
    return request(app.getHttpServer())
      .get('/content/get-shareable-content/lvsl/8484848484')
      .expect(response => expect(response.statusCode).toBe(404));
  });

  afterEach(async done => {
    await app.close();
    done();
  });
});
