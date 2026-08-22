FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY evals ./evals

ENTRYPOINT ["node", "evals/run.mjs"]
