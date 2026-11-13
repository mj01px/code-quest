# Mesma versao do .nvmrc (CI e desenvolvimento).
FROM node:24-alpine

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN chown -R node:node /app
USER node

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=600s --retries=5 \
    CMD wget -q -O /dev/null http://127.0.0.1:3000/ || exit 1

# O build roda na subida, nao no `docker build`: o prerender das trilhas
# (generateStaticParams com dynamicParams=false) le o catalogo na API, que so
# existe com o backend no ar. Trilha nova publicada so vira pagina depois de
# reiniciar este container.
CMD ["sh", "-c", "NODE_ENV=production npm run build && NODE_ENV=production npm start -- -H 0.0.0.0 -p 3000"]
