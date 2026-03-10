FROM node:22-slim AS build-web
WORKDIR /app
COPY qfc-chain-sdk/ ./qfc-chain-sdk/
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ .
RUN npm run build

FROM node:22-slim AS build-web3d
WORKDIR /app/web3d
COPY web3d/package*.json ./
RUN npm ci
COPY web3d/ .
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY --from=build-web /app/web/dist ./web/dist
COPY --from=build-web3d /app/web3d/dist ./web3d/dist
COPY web/server ./web/server
COPY web/package*.json ./web/
WORKDIR /app/web
RUN npm ci --omit=dev
EXPOSE 3210
CMD ["npx", "tsx", "server/index.ts"]
