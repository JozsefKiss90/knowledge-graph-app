FROM alpine:3.20
RUN apk add --no-cache curl ca-certificates
CMD ["sh", "-c", "curl -fsS https://knowledge-graph-backend-production.up.railway.app/health/db"]
