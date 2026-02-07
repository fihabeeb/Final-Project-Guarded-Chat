# syntax=docker/dockerfile:1
ARG NODE_VERSION=22.12.0
FROM node:${NODE_VERSION}-alpine

WORKDIR /usr/src/app

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

# Comment out USER node for development
# USER node

COPY --chown=node:node . .

EXPOSE 3000
CMD ["npm", "start"]