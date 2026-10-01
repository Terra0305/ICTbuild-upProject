FROM node:20-alpine AS builder
WORKDIR /app
# NEXT_PUBLIC_* values are inlined into the client bundle at build time.
# Production uses a same-origin path because nginx routes /api/ to the backend.
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build \
  # Keep the runtime image small on the 20 GiB EC2 disk: drop dev deps and the build cache.
  && npm prune --omit=dev \
  && rm -rf .next/cache

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
# Run next directly (not via npm) so SIGTERM reaches the server and no extra npm process stays resident.
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
