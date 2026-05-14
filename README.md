# E-Commerce Web Application

A basic full-stack online store that includes:

- Product catalog browsing
- Add to cart and checkout flow
- User login with role-based access (`admin` / `user`)
- Backend APIs for product and order management
- Database integration with MongoDB (plus in-memory mode for local quick start)
- API rate limiting on auth and protected endpoints

## Tech Stack

- Node.js + Express
- JWT authentication
- MongoDB integration via Mongoose (`DATA_SOURCE=mongo`)
- Vanilla HTML/CSS/JS frontend (`public/index.html`)
- Jest + Supertest API tests

## Quick Start

```bash
npm install
npm start
```

Open: `http://localhost:3000`

By default the app runs with `DATA_SOURCE=memory` so it works immediately.

## MongoDB Mode

Set environment variables to use MongoDB:

```bash
export DATA_SOURCE=mongo
export MONGODB_URI="mongodb://127.0.0.1:27017/ecommerce_app"
export JWT_SECRET="replace-with-a-secure-secret"
npm start
```

Optional seeded admin user:

```bash
export DEFAULT_ADMIN_EMAIL="admin@example.com"
export DEFAULT_ADMIN_PASSWORD="AdminPass123!"
export DEFAULT_ADMIN_NAME="Admin"
```

## Role Behavior

- First registered account becomes `admin`.
- Later registrations become `user`.
- `admin` can create products and update order status.
- `user` can browse products, manage cart, checkout, and track own orders.

## API Overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/products`
- `POST /api/products` (admin)
- `GET /api/cart` (auth)
- `POST /api/cart/items` (auth)
- `POST /api/cart/checkout` (auth)
- `GET /api/orders` (auth)
- `GET /api/orders/:orderId` (auth)
- `PATCH /api/orders/:orderId/status` (admin)

## Tests

```bash
npm test
```
