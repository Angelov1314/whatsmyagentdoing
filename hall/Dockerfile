FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787 DB_PATH=/data/hall.sqlite
COPY src/achievement-protocol.js ./src/achievement-protocol.js
COPY hall/ ./hall/
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8787
CMD ["node", "hall/server.js"]
