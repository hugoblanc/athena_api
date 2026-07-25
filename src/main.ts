import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import * as admin from 'firebase-admin';
import { join } from 'path';
import { AppModule } from './app.module';

/**
 * Origines autorisées. Le natif Capacitor sert le WebView depuis
 * `https://localhost` (Android) et `capacitor://localhost` (iOS).
 */
const ALLOWED_ORIGINS = [
  'https://athena-app.xyz',
  'https://www.athena-app.xyz',
  'https://athena-app.fr',
  'https://www.athena-app.fr',
  'https://localhost',
  'capacitor://localhost',
  'http://localhost:4200',
  'http://localhost:3000',
  'http://localhost:3001',
];

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Derrière le reverse proxy CapRover : sans ça, l'IP vue est celle du proxy
  // et un client peut forger X-Forwarded-For.
  app.set('trust proxy', 1);

  app.enableCors({ origin: ALLOWED_ORIGINS, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.use(express.static(join(__dirname, '../public')));
  await app.listen(process.env.PORT || 3000);

  admin.initializeApp({
    credential: admin.credential.cert({
      private_key: process.env.ATHENA_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.ATHENA_CLIENT_EMAIL,
      project_id: process.env.ATHENA_PROJECT_ID,
    } as admin.ServiceAccount),
    databaseURL: 'https://open-athena.firebaseio.com',
  });


  displayMessage();
}
bootstrap();

function displayMessage() {
  // tslint:disable-next-line: no-console
  console.log(`

       ((((((######.
    *((((((((#########
   ((((((((((###########
  (.........(#,,,,,,,,,,#
 ...       ..,,,      ,,,#
 ..    %    .,,   %%   ,,,
 ..    %.   .,,   &&   ,,,
 ..         .,,        ,,,
 #..        .,.       ,,,.                                @@@@
 ##...               ,,,..            @@@@@       @@@@    @@@@
 ###....          ,,,,....           @@@@@@@      @@@@    @@@@
 ######......,,,,,,,......          /@@@ @@@@   @@@@@@@@  @@@@@@@@@@@    @@@@@@@@@   @@@@@@@@@@@    @@@@@@@@@
 ############.............          @@@@ @@@@     @@@@    @@@@   @@@@@  @@@@   @@@@  @@@@@  @@@@@  @@@@   @@@@
 ############.............         @@@@   @@@@    @@@@    @@@@    @@@@  @@@@@@@@@@@  @@@@    @@@@         @@@@
 ############............         ,@@@@@@@@@@@@   @@@@    @@@@    @@@@  @@@@@@@@@@@  @@@@    @@@@  @@@@@@@@@@@
 ############............         @@@@@@@@@@@@@   @@@@    @@@@    @@@@  @@@@         @@@@    @@@@ @@@@    @@@@
 ############...........         @@@@/      @@@@  %@@@@@  @@@@    @@@@   @@@@@@@@@@  @@@@    @@@@  @@@@@@@@@@@
 ###########..........
 ##########  .......
 ########(   .....
 #####*      .
`);
}
