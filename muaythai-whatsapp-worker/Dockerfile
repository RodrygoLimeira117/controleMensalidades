# whatsapp-web.js precisa de um Chromium de verdade rodando (via Puppeteer).
# Em vez de deixar o Puppeteer baixar seu próprio Chromium (pesado e às vezes
# incompatível com a imagem base), instalamos o Chromium do Debian e apontamos
# o Puppeteer pra ele.
FROM node:20-bookworm-slim

# Dependências do Chromium headless + fontes (para renderizar corretamente o
# WhatsApp Web durante a geração/leitura do QR code e sessão)
RUN apt-get update && apt-get install -y --no-install-recommends \
        chromium \
        fonts-liberation \
        fonts-noto-color-emoji \
        ca-certificates \
        dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Evita que o Puppeteer tente baixar o próprio Chromium (já temos um instalado acima)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
# --omit=dev: não precisamos de nada de devDependencies em produção
RUN npm ci --omit=dev

COPY . .

# Usuário não-root por segurança (o Chromium precisa do --no-sandbox no index.js
# justamente porque não roda como root aqui dentro)
RUN groupadd -r node-app && useradd -r -g node-app node-app \
    && mkdir -p /app/.wwebjs_auth /app/.wwebjs_cache \
    && chown -R node-app:node-app /app
USER node-app

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
    CMD node -e "fetch('http://localhost:3000/api/whatsapp/status').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# dumb-init evita processos zumbis do Chromium quando o container é encerrado
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]
