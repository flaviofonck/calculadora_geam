FROM node:20-bullseye-slim AS builder
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/tsconfig.json ./
COPY backend/prisma ./prisma/
COPY backend/src ./src/
RUN npx prisma generate && npm run build

FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm install prisma@^5.22.0
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY js/data.json ./js/data.json
EXPOSE 3000
CMD ["node", "dist/src/server.js"]
