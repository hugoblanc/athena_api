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
  // on expose des ressources en static grace à express
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


  const message = {
    "notification": {
      "title": "Nouvel article par Mr Mondialisation",
      "body": "Fin de l’abondance: sauf à la table des privilèges"
    },
    "data": {
      "title": "Nouvel article par Mr Mondialisation",
      "body": "Fin de l’abondance: sauf à la table des privilèges",
      "key": "mrmondialisation",
      "id": "548623"
    },
    token: 'fJ2HwSevRkqqe-d60qaXoV:APA91bGmZhfCxNrscphSJmbkM_jy3WlCSIYHCsaXy-FFmueCcse63W3OXu2QicQQ_EQy2I2HXbXG4ccKM38iWfAvewdQbDQPDZn119BzHJ-0xNLPXDwJeXzEiAe_ED4n9R7B1dsTTU26',
    // token: 'fkEB1OgczkOigLu808oC_D:APA91bESfP5F3yAIJZtKD1kdmxTfNrob19KDKgbDUUk-HFozMB9JsmRC1I1yr_KWokiq1m2RzI7e0seJwXIk-DHdQw2rf4NdKG9MPcOWlb1JvC1NruWlbaEYEmcbS5_GxPdzeyNf6DrK',
    // "condition": "'mrmondialisation' in topics"
  }


  // const message = {
  //   notification: {
  //     body: "super body",
  //     title: 'super title',
  //   },
  //   data: {
  //     "id": "19047",
  //     "body": "Doit-on interdire les jets privés ?",
  //     "key": "bonpote",
  //     "title": "Nouvel article par Bon Pote"
  //   },
  //   token: 'c0LT6FyjRxaLizKaT2RJwK:APA91bG6vD32NZtBUvasKxE6Zgfmm49kLKS4AXAWbLm2yhAMktav-sTiGz0xzJKs-z99owvqC5NYDaZl0zGW_nTIz-Ikf7tgVZAQq35Sw03StbJhrOlFFrI9bui6hK59c3WF1yCVhZK7',
  // };

  // Send a message to the device corresponding to the provided
  // registration token.
  admin.messaging().send(message)
    .then((response) => {
      // Response is a message ID string.
      console.log('Successfully sent message:', response);
    })
    .catch((error) => {
      console.log('Error sending message:', error);
    });


  // On termine l'init
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
