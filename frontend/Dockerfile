# Build context: ./frontend
FROM node:22-alpine AS build
WORKDIR /app

# Install first so the dependency layer is cached until the lockfile changes.
COPY package.json package-lock.json ./
RUN npm ci --no-fund --no-audit

COPY . .
RUN npm run build

FROM nginx:1.29-alpine AS final
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
