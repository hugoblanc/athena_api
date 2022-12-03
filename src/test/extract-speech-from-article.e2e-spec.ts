import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { createModule } from './fixture/module.fixture';
import { DbFixture } from './fixture/db.fixture';

describe('POST /content/extract-speech', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await createModule();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should return the correct response', async () => {
    const dbFixture = new DbFixture(app);
    const content = await dbFixture.createContent({
      description: 'Salut ça va ? ',
    });
    await request(app.getHttpServer())
      .post(`/content/extract-speech/${content.id}`)
      .expect(response => expect(response.statusCode).toBe(201));
  });
  it('should return the correct response', async () => {
    return request(app.getHttpServer())
      .post('/content/extract-speech/74')
      .expect(response => expect(response.statusCode).toBe(409));
  });

  it('should return a 404 if content not found', () => {
    return request(app.getHttpServer())
      .post('/content/extract-speech/1')
      .expect(response => expect(response.statusCode).toBe(404));
  });

  it('should return a 400 if id is not well formatted', () => {
    return request(app.getHttpServer())
      .post('/content/extract-speech/1_wrong_id')
      .expect(response => expect(response.statusCode).toBe(400));
  });

  afterEach(async done => {
    await app.close();
    done();
  });
});
