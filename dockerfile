# -------------------------
# Stage 1: Build
# -------------------------
FROM node:20-alpine AS build
# Crear directorio de trabajo
WORKDIR /usr/src/app
# Copiar package.json y package-lock.json primero
COPY package*.json ./
# Instalar todas las dependencias (prod + dev)
RUN npm install
# Copiar el resto del código
COPY . .
# -------------------------
# Stage 2: Producción
# -------------------------
FROM node:20-alpine AS production
WORKDIR /usr/src/app
# Copiar solo dependencias de producción desde el stage anterior
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app ./
# Exponer el puerto de la app
EXPOSE 3000
# Comando para iniciar la app
CMD ["node", "src/index.js"]
