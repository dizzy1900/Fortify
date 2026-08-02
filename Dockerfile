FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install --yes --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
# The standalone server invokes Node directly; package-manager tooling is build-stage only.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
RUN groupadd --system --gid 1001 fortify && useradd --system --uid 1001 --gid fortify fortify
COPY --from=builder --chown=fortify:fortify /app/.next/standalone ./
COPY --from=builder --chown=fortify:fortify /app/.next/static ./.next/static
COPY --from=builder --chown=fortify:fortify /app/public ./public
COPY --from=builder --chown=fortify:fortify /app/drizzle ./drizzle
COPY --from=builder --chown=fortify:fortify /app/drizzle-production ./drizzle-production
RUN mkdir -p data storage/evidence output/pdf output/packets && chown -R fortify:fortify data storage output
USER fortify
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
