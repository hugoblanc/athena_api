import { NestApplication, NestFactory } from '@nestjs/core';
import * as express from 'express';
import * as admin from 'firebase-admin';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  // Initialisation de l'applicaiton Nest
  const app = await NestFactory.create<NestApplication>(AppModule);
  // On active les authorisation de cross origin ressources sharing
  app.enableCors();
  // on expose des ressources en static grace à epress
  app.use(express.static(join(__dirname, '../public')));
  // On démarrer le serveur en écoutant sur le port 3000 ou présent dans l'env
  await app.listen(process.env.PORT || 3000);

  // On initialise les service firebase
  admin.initializeApp({
    // On charge les valeurs d'initialisation présente dans les variable d'enviornnement
    credential: admin.credential.cert({
      private_key: process.env.ATHENA_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.ATHENA_CLIENT_EMAIL,
      project_id: process.env.ATHENA_PROJECT_ID,
    } as admin.ServiceAccount),
    databaseURL: 'https://open-athena.firebaseio.com',
  });

  // On termine l'init
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
