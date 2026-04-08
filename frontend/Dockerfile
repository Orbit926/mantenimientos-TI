# Stage 1: Build
FROM node:24-bookworm-slim AS builder

WORKDIR /app

COPY package.json ./
RUN npm install --frozen-lockfile=false

COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:1.29.8 AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
