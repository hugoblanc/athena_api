import { NestApplication, NestFactory } from '@nestjs/core';
import * as express from 'express';
import * as admin from 'firebase-admin';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestApplication>(AppModule);
  app.enableCors();
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
