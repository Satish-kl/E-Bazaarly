# Bazaarly

A microservices e-commerce app: register / log in, browse products, view details, place orders, view order history.

```
Browser ──:80──▶ Nginx gateway ──▶ React frontend
                    │ /api/users/*    ──▶ user-service    :3001  register, login (JWT)
                    │ /api/products*  ──▶ product-service :3002  list, details
                    └ /api/orders*    ──▶ order-service   :3003  place order, history (JWT)
order-service ──▶ product-service  (prices are looked up server-side)
```

## Run

```bash
cp .env.example .env        # set JWT_SECRET to any long random string
docker compose up -d --build
docker compose ps           # wait for all containers to be "healthy"
```

Open http://localhost. Stop with `docker compose down` (add `-v` to delete stored users/orders).

## Endpoints

| Service | Endpoints |
|---|---|
| user-service | `POST /api/users/register`, `POST /api/users/login`, `GET /api/users/me` |
| product-service | `GET /api/products?category=&q=`, `GET /api/products/:id` |
| order-service | `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id` (Bearer token) |

Each service also has `GET /health` and `GET /metrics` (Prometheus format). Through the gateway:
`/health/user`, `/health/product`, `/health/order`.

## Tests

```bash
cd services/user-service && npm ci && npm test     # same for product-service and order-service
```

## Notes

- Users and orders are stored as JSON files on Docker volumes (`user_data`, `order_data`), so no database is needed.
- Only port 80 is published. Change `"80:80"` in `docker-compose.yml` if it is already in use (e.g. `"8081:80"`).
- ECR naming: set `REGISTRY` and `TAG` in `.env` to name images `$REGISTRY/bazaarly-user:$TAG`, `-product`, `-order`.
