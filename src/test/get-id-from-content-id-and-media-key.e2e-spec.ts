import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { MetaMedia } from '../meta-media/meta-media.entity';
import { DbFixture } from './fixture/db.fixture';
import { createModule } from './fixture/module.fixture';

describe('POST /content/get-audio-content-url-by-id/:key/:contentId', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await createModule();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should return the correct response', async () => {
    const dbFixture = new DbFixture(app);
    const key = 'test';
    const lemondemoderne = new MetaMedia({ id: 4 });

    const content = await dbFixture.createContent({
      metaMedia: lemondemoderne,
      description: ''
    });

    await request(app.getHttpServer())
      .get(`/content/get-id-from-content-id-and-media-key/${key}/${content.contentId}`)
      .expect(response => expect(response.statusCode).toBe(200))
      .expect(response => expect(response.body).toEqual({ id: content.id }));
  });

  afterEach(async done => {
    await app.close();
    done();
  });
});
