import { NestFactory, NestApplication } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import * as admin from 'firebase-admin';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestApplication>(AppModule);
  app.enableCors();
  app.use(express.static(join(__dirname, '../public')));
  await app.listen(process.env.PORT || 3000);

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: 'https://open-athena.firebaseio.com',
  });

  displayMessage();

}
bootstrap();

function displayMessage() {
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
