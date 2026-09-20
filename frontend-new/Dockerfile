# syntax=docker/dockerfile:1
#
# Smart Mid-Day Meal Management System - Web UI
#
# Builds the Vite bundle, then serves it from nginx. nginx also reverse-proxies
# /api and /uploads to the backend, so the browser only ever talks to one
# origin: no CORS, and no API hostname baked into the JavaScript.

# ------------------------------------------------------------------ build ---
FROM node:22-alpine AS build

WORKDIR /app

# Copy manifests first so `npm ci` is cached until the dependencies change.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Relative base URL -> requests go to the same origin nginx is serving from.
# Override at build time for a split deployment:
#   docker build --build-arg VITE_API_URL=https://api.example.com/api/v1 .
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ------------------------------------------------------------------ serve ---
FROM nginx:1.27-alpine AS runtime

RUN apk add --no-cache curl

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://localhost/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
