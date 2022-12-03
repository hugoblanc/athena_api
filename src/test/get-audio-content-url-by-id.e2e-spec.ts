import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { createModule } from './fixture/module.fixture';
import { DbFixture } from './fixture/db.fixture';
import { Audio } from '../content/domain/audio.entity';

describe('POST /content/get-id-from-content-id-and-media-key/:id', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await createModule();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should return the correct response', async () => {
    const dbFixture = new DbFixture(app);
    const audio = new Audio();
    audio.url = "http://audiocontent";

    const content = await dbFixture.createContent({
      description: '',
      audio
    });

    await request(app.getHttpServer())
      .get(`/content/get-audio-content-url-by-id/${content.id}`)
      .expect(response => expect(response.statusCode).toBe(200))
      .expect(response => expect(response.body).toEqual({ id: content.audio.id, url: "http://audiocontent" }));
  });

  afterEach(async done => {
    await app.close();
    done();
  });
});
