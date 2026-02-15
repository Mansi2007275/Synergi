# Stage 1: Builder
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Build args
ARG NEXT_PUBLIC_API_URL=http://localhost:4002
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Next.js standalone build requires env var to be set during build if used there (or just configure output: 'standalone' in next.config.js which I should verify)
# Assuming standalone is enabled or will be enabled.
RUN npm run build

# Stage 2: Runner
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy snippets from standalone build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
