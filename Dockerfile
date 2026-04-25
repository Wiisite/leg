# Estágio de Build
FROM node:20-alpine AS builder

WORKDIR /app

# Instala o pnpm
RUN npm install -g pnpm

# Copia os arquivos de dependências e patches
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches/

# Instala todas as dependências
RUN pnpm install --frozen-lockfile

# Copia o restante do código
COPY . .

# Executa o build (Client + Server)
RUN pnpm run build

# Estágio de Execução (Runtime)
FROM node:20-alpine AS runner

WORKDIR /app

# Define ambiente como produção
ENV NODE_ENV=production
ENV PORT=3000

# Copia apenas o necessário do estágio de build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Expõe a porta padrão
EXPOSE 3000

# Comando para rodar migrações e iniciar o servidor
CMD npx drizzle-kit migrate && node server/index.js
