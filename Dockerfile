FROM node:22-alpine3.20
WORKDIR /usr/src/app

# ─── Couche dépendances ──────────────────────────────────────────────────────
# Copiée et installée AVANT le code source, et sans aucune instruction variable
# au-dessus (l'ancien `ARG/ENV DATABASE_URL` en tête pouvait invalider ce cache
# à chaque build si CapRover passait une valeur changeante). Résultat : `npm ci`
# n'est rejoué QUE si package.json / package-lock.json changent.
COPY package*.json ./
RUN npm ci

# ─── Code source ─────────────────────────────────────────────────────────────
COPY . .

ENV NODE_ENV=production
ENV PORT=80
EXPOSE 80 3001

# DATABASE_URL factice : requis uniquement pour charger prisma.config.ts pendant
# `prisma generate` (qui ne se connecte pas à la base). La vraie valeur est
# fournie au runtime par les App Configs CapRover (et override toute valeur
# d'image). Inliné ici pour ne pas persister dans l'image ni casser le cache.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npm run generate \
  && npm run build

CMD [ "npm", "run", "start:prod" ]
