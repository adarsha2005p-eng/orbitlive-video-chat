FROM node:20-alpine AS builder

WORKDIR /app

# Copy server package manifests
COPY server/package*.json ./
COPY prisma ../prisma/

RUN npm install

# Copy server source
COPY server/ ./

# Generate Prisma Client and build TypeScript
RUN npx prisma generate --schema=../prisma/schema.prisma
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY server/package*.json ./
COPY prisma ../prisma/

RUN npm install --omit=dev

# Copy compiled files and generated prisma client from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 5000

CMD ["node", "dist/index.js"]
