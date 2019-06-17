// IMPORT
import axios from 'axios';
import express from 'express';

import cron from 'cron';

import config from 'config';
import { Post } from './models/post';
const expressConfig: any = config.get('express');

// DÉCLARATION
const app = express();
let posts = new Array<Post>();

/**********************
 **CORS/CACHE PART*****
**********************/
app.use((req, res, next) => {
  // CORS
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  // CACHE
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  next();
});

// ÉCOUTE DU PORT
app.listen(expressConfig.port);
console.log('Listening on port ' + expressConfig.port);

/**
 * Cette methode se charge de séparer l'id groupe du reste de l'url ics
 * @param oriUrl l'url complet de la requete initiale
 */
function getParamsFromUrl(oriUrl: string): any {
  try {
    const url = oriUrl.split(expressConfig.proxyRoute, 2)[1];
    return url;
  } catch (error) {
    throw new Error('L\'url n\'est pas correct' + oriUrl);
  }
}

function callWpAPI() {
  axios.get('https://lvsl.fr/wp-json/wp/v2/posts?_embed')
    .then((response) => {
      const porstsFromServ = response.data.map((post: Post) => new Post(post));

      if (posts[0] && !posts[0].isIdEqual(porstsFromServ[0].id)) {
        console.log('On a détécté une modification');
      } else {
        console.log('RIen de neuf deso ');

      }
      posts = porstsFromServ;

    })
    .catch((error) => {
      console.log(error);
    });
}

const cronJob = new cron.CronJob('*/1 * * * *', () => {

  console.log('Il est' + new Date().toISOString());

  callWpAPI();

});

cronJob.start();

console.log(`
██████╗ ██╗███████╗██████╗  ██████╗ ███████╗████████╗
██╔══██╗██║██╔════╝██╔══██╗██╔═══██╗██╔════╝╚══██╔══╝
██████╔╝██║█████╗  ██████╔╝██║   ██║███████╗   ██║
██╔══██╗██║██╔══╝  ██╔══██╗██║   ██║╚════██║   ██║
██████╔╝██║██║     ██║  ██║╚██████╔╝███████║   ██║
╚═════╝ ╚═╝╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝

 █████╗ ██████╗ ██╗
██╔══██╗██╔══██╗██║
███████║██████╔╝██║
██╔══██║██╔═══╝ ██║
██║  ██║██║     ██║
╚═╝  ╚═╝╚═╝     ╚═╝

`);
