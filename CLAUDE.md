- Always use prisma migration system when it's possible
- Ne fait jamais de --create-only, a la place demande a l'utilisatuer de générer la migration
- **Push sur `master` = déploiement auto en prod (CapRover).** Ne jamais push sans OK explicite.

## Consommé par la PWA Next.js (`../athena-pwa`)

L'API sert maintenant aussi la nouvelle PWA (refonte de l'app mobile). API publique sauf
`/auth/*` et `/push/*` (Bearer Firebase). Endpoints clés : `/content/*`, `/podcast/*`, `/qa/*`
(SSE), `/law-proposal/*`, `/list-meta-media`, `/issues`, `/push/*`.

## Module Push (Web Push VAPID) — `src/push/`

Remplace le modèle FCM-topics du natif (non transposable au web). `PushController`
(`POST /push/subscribe|unsubscribe` authentifiés, `GET /push/vapid-public-key` public),
`PushService` (web-push, fan-out, purge des abonnements 404/410), modèle Prisma
`PushSubscription` (lié à `User`).

⚠️ **Migration à générer** (modèle ajouté au schéma mais migration absente) :
```bash
npx prisma migrate dev --name add_push_subscription
```
Les endpoints `/push/subscribe|unsubscribe` renvoient 500 tant que la table `push_subscription`
n'existe pas (sans danger pour l'existant : aucun accès DB au boot, push désactivé proprement
si VAPID absent).

⚠️ **Variables d'env à définir** (CapRover) : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`VAPID_SUBJECT` (mailto ou URL https).

Reste à faire : brancher le **ciblage fin** du `broadcast` push sur `UserPreference.notificationTopics`
(actuellement `broadcast` envoie à tous les abonnés). Modèle opt-out (tout activé par défaut).
