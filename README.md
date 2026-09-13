# ByteStore

Next.js digital products shop with guest checkout, Paystack + crypto payments, and an admin dashboard for categories, products, and tools.

## Setup

```bash
npm i
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Admin: [http://localhost:3000/admin](http://localhost:3000/admin) (password from `ADMIN_PASSWORD` in `.env.local`).

## Configure

1. Create a Neon project and copy the connection string into `.env.local` as `DATABASE_URL`.
2. Fill Paystack / crypto / support email / admin password as needed.
3. Restart `npm run dev`. Order tables are created automatically on first order save.

Catalog content (categories, products, tools, images) is managed in `/admin` and stored in `data/catalog.json`. Orders are stored in Neon Postgres and looked up by checkout email.

## Routes

`/`, `/shop`, `/cart`, `/checkout`, `/orders`, `/tools`, `/connect`, `/profile`, `/admin`
