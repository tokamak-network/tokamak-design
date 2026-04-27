# syntax=docker/dockerfile:1.7

# Playwright base image — Chromium + matching system deps preinstalled.
ARG PLAYWRIGHT_VERSION=v1.59.1-jammy
FROM mcr.microsoft.com/playwright:${PLAYWRIGHT_VERSION} AS base
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV PORT=3000 \
    HOSTNAME=0.0.0.0 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Standalone Next.js output bundles only the runtime deps it needs.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Run as the non-root user that the Playwright image already provides.
USER pwuser

EXPOSE 3000
CMD ["node", "server.js"]
