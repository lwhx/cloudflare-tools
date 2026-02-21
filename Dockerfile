FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend

COPY Frontend/package*.json ./
RUN npm install

COPY Frontend/ ./
RUN npm run build

FROM golang:1.25-bookworm AS backend-builder

WORKDIR /app

COPY Server/go.mod Server/go.sum ./
RUN go mod download

COPY Server/ ./
COPY --from=frontend-builder /app/frontend/dist ./dist

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o cloudflare-tools main.go

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    cron \
    socat \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=backend-builder /app/cloudflare-tools /app/cloudflare-tools

RUN curl https://get.acme.sh | sh -s email=acme@example.com

ENV PATH="/root/.acme.sh:${PATH}"

WORKDIR /data

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/ || exit 1

CMD ["/app/cloudflare-tools"]
