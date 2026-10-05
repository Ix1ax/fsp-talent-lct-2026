FROM node:24-alpine AS deps
WORKDIR /src
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /src
COPY --from=deps /src/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/web apps/web
ENV NEXT_TELEMETRY_DISABLED=1
ENV API_PROXY_TARGET=http://api:8080
RUN npm run build -w apps/web

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV API_PROXY_TARGET=http://api:8080
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=build /src/apps/web/public ./apps/web/public
COPY --from=build --chown=nextjs:nodejs /src/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /src/apps/web/.next/static ./apps/web/.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
