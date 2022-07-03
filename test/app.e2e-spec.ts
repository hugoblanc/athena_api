import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Test, TestingModule } from '@nestjs/testing';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', (done) => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect("Content-type", /html/)
      .end(function (err, res) {
        expect(res.text).toContain('<title>Athena</title>')
        done()
      })
  });

  it('/privacy (GET)', (done) => {
    return request(app.getHttpServer())
      .get('/privacy')
      .expect(200)
      .expect("Content-type", /html/)
      .end(function (err, res) {
        expect(res.text).toContain('<title>Document</title>')
        done()
      })
  });

  afterEach(async (done) => {
    await app.close();
    done()
  });
});
