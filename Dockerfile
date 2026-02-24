FROM node:14-alpine

WORKDIR /app

COPY ["package.json", "/app/"]

RUN npm install --production

ENV NPM_CONFIG_LOGLEVEL warn
ENV NODE_ENV=production

COPY src /app/src

CMD ["npm","run","start"]