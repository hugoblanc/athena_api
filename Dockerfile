FROM node:22-alpine3.20
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci


COPY ./ .

ENV NODE_ENV production
ENV PORT 80
EXPOSE 80 3001

RUN npm run generate
RUN npm run build

CMD [ "npm","run", "start:prod" ]
