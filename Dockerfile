FROM node:8

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
COPY tsconfig.json ./

COPY ./src ./src
COPY ./config ./config

RUN npm install
# If you are building your code for production
# RUN npm install --only=production
RUN npm run build-ts


# Bundle app source
COPY . .

EXPOSE 3000
CMD [ "npm", "start" ]