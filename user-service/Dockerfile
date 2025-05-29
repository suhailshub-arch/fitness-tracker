FROM node:18-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./

RUN npx prisma generate
RUN npm run build 

# Production Stage

FROM node:18-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production 

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

EXPOSE 3001
CMD ["node", "dist/index.js"]