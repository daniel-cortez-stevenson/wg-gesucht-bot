FROM ghcr.io/puppeteer/puppeteer:latest

ENV NODE_ENV=production

ENV NODE_OPTIONS="--max_old_space_size=30000 --max-http-header-size=80000"

COPY package.json ./

RUN npm i

COPY app.js .env ./
COPY src ./src

VOLUME $HOME/db

CMD npm start
