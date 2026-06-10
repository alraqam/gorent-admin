# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# VITE_API_URL is a build-time fallback only (used by local `npm run dev`).
# In production the container reads API_URL at runtime via env.sh — no rebuild needed.
ARG VITE_API_URL=http://localhost:3001/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- runtime stage (static files via nginx) ----
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# env.sh runs before nginx and writes /env.js from $API_URL.
COPY env.sh /docker-entrypoint.d/40-env.sh
RUN chmod +x /docker-entrypoint.d/40-env.sh
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
