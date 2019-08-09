

![Logo athena](http://athena-api.caprover.athena-app.fr/menu.jpg "Logo Title Text 1")

## Description
L'api athena a été réalisé avec NestJS
[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

Elle est en charge:
- de l'envoi des notifications
- de l'envoi des données structurante à l'application mobile (MetaMedia)
- de l'affichage de certaines pages légales (privacy policy, page de présentation, assistance)

Elle a pour vocation à fournir des fonctionnalités d'interaction
- Poste d'idées
- Votes
- ...

## Prérequis

### Environnement
- [Node JS](https://nodejs.org/fr/download/)

### Variable d'environnement

Ces valeurs sont a titre d'exemple et ne permettront pas une connexion si vous les utilisez pour démarrer l'api

Pour la youtube et firebase api il faudra vous créer un projet gratuitement au préalable:
Youtube => https://console.cloud.google.com/getting-started (ignorer les essaie gratuit et autre, rien de ce que l'on fait n'est payant)

Firebase => https://console.firebase.google.com

ENsuite dans les url que j'ai copié ici, la section noir sera l'id du projet à remplacer 

| Variables     | Type           | Value  | Création |
| ------------- |:-------------:| -----:| -----:|
| ATHENA_YOUTUBE_KEY    | YOUTUBE_API | AlsaXXXXXXXXXXXXXXXXXXXXXXXXXlkslOJ  | https://console.cloud.google.com/apis/api/youtube.googleapis.com/overview?project=***open-athena***&hl=fr |
| ATHENA_GITHUB_TOKEN    | GITHUB_API | 8165XXXXXXX98c4d9848 | https://github.com/settings/tokens/new cocher [x]repo puis générer |
| ATHENA_DB_USER    | DATABASE | admin | Monter un mysql en local |
| ATHENA_DB_PORT    | DATABASE | 3306 | Monter un mysql en local |
| ATHENA_DB_PASSWORD    | DATABASE | password | Monter un mysql en local |
| ATHENA_DB_HOST    | DATABASE | localhost | Monter un mysql en local |
| ATHENA_PROJECT_ID    | FIREBASE_NOTIF | open-athena | https://console.firebase.google.com/project/**open-athena**/settings/serviceaccounts/adminsdk?hl=fr puis générer une nouvelle clé privé, ouvrir le fichier et attribuer la bonne valeur aux bon champs|
| ATHENA_PRIVATE_KEY    | FIREBASE_NOTIF | -BEGIN PRIVATE KEY-\  \n-END PRIVATE KEY-----\n | Voir ci-dessus |
| ATHENA_CLIENT_EMAIL    | FIREBASE_NOTIF | firebasexxxw@opxxxxxxxxeaccount.com |  Voir ci-dessus |

### Données base de données

NestJS génèrera automatique le schéma SQL, vous n'avez donc pas de soucis de ce côté, cependant les tables seront vide.

Voici les valeurs actuelle 09/08/2019
```sql

SET NAMES utf8mb4;

INSERT INTO `list_meta_media` (`id`, `title`) VALUES
(1,	'Presse écrite'),
(3,	'Vidéo');


SET NAMES utf8mb4;

INSERT INTO `meta_media` (`id`, `donation`, `type`, `key`, `url`, `title`, `logo`, `listMetaMediaId`) VALUES
(1,	'https://lvsl.fr/faire-un-don/',	'WORDPRESS',	'lvsl',	'https://lvsl.fr/',	'Le Vent Se Lève',	'assets/lvsl_logo.jpg',	1),
(2,	'https://en.tipeee.com/mr-mondialisation',	'WORDPRESS',	'mrmondialisation',	'https://mrmondialisation.org/',	'Mr Mondialisation',	'assets/mrmondialisation_logo.png',	1),
(3,	'https://www.helloasso.com/associations/le-4eme-singe/formulaires/1/fr',	'WORDPRESS',	'emesinge',	'https://www.4emesinge.com/',	'Le 4eme Singe',	'assets/4emesinge_logo.jpg',	1),
(4,	NULL,	'WORDPRESS',	'lemondemoderne',	'https://www.lemondemoderne.media/',	'Le Monde Moderne',	'assets/lemondemoderne.jpg',	1),
(7,	NULL,	'YOUTUBE',	'osonscauser',	'UCVeMw72tepFl1Zt5fvf9QKQ',	'Osons causer',	'https://yt3.ggpht.com/a/AGF-l79-QM7NkYV3TVJZK8Jssrj0odFlAOnxsHsD=s288-c-k-c0xffffffff-no-rj-mo',	3);
```

## Installation en local

#### Récupération du projet

```
git clone https://github.com/hugoblanc/athena_api.git
cd athena_api
```

#### Initialisation projet

```bash
$ npm install
```

## Running the app

```bash
# démarrage
$ npm run start

# actualisation à chaque modification de fichiers
$ npm run start:dev

# actualisation à chaque modification de fichiers + debug activé
# Pour debugger dans visual studio code => activer Auto attach: ON  CTRL + SHIFT + P: "auto attach"
$ npm run start:debug


# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Support

Athena est un projet open source qui a pour objectif de permettre à chacun de s'impliquer dans le projet.
Si vous jugez qu'il manque des fonctionnalités vous pouvez proposer une pull request que j'ajouterai au projet

## Stay in touch

- Auteur - Hugo Blanc - hugoblanc.blend@gmail.com


## License

  athena_api est sous licence [LGPL-3.0](LICENSE).
