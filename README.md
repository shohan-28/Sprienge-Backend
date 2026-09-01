# BDMart Backend

Node/Express + MongoDB API for the BDMart admin panel — orders, Steadfast
courier automation (parcel creation, live webhook tracking, fraud check),
and everything the admin panel's frontend calls.

This is the **complete, mergeed version** of everything previously handed
over as `backend-reference/` snippets in the frontend project — all in one
runnable project now.

## Local setup

```bash
npm install
cp .env.example .env   # fill in MONGO_URI and Steadfast credentials
npm run dev             # nodemon, auto-restarts on changes
# or: npm start
```

Server runs on `http://localhost:5000` by default. Health check:
`GET /` → `{ status: "ok", service: "bdmart-backend" }`.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB Atlas or self-hosted connection string |
| `PORT` | No | Defaults to 5000 locally; Render sets this itself in production |
| `STEADFAST_API_KEY` | For courier features | From Steadfast merchant panel → Settings → API |
| `STEADFAST_SECRET_KEY` | For courier features | Same place |
| `STEADFAST_BASE_URL` | No | Defaults to `https://portal.packzy.com/api/v1` |

The server starts and the plain order CRUD works even without the
Steadfast variables set — only parcel creation, the webhook, and fraud
check need them (those calls will fail with a clear error if the
credentials are missing, rather than crashing the server).

## API routes

All under `/api/orders`:

| Method | Path | Purpose |
|---|---|---|
| POST | `/` | Create an order (storefront checkout or admin's Create Order) |
| GET | `/` | List all orders |
| GET | `/fraud-check/:phone` | Steadfast courier-wide delivery history for a phone number |
| GET | `/steadfast-balance` | Current Steadfast account balance |
| GET | `/:id` | Get one order |
| PUT | `/:id` | Update an order (status change or full edit) |
| DELETE | `/:id` | Delete an order |
| POST | `/:id/confirm` | Confirm an order; optionally create the Steadfast parcel in the same call |
| POST | `/:id/create-parcel` | Create/retry/re-create a Steadfast parcel (duplicate-protected) |
| POST | `/steadfast/webhook` | Receiver for Steadfast's status-update webhook |

## Deploying to Render (or similar)

1. Push this folder to its own GitHub repo (separate from the frontend).
2. On Render: **New → Web Service**, connect the repo.
   - Build command: `npm install`
   - Start command: `npm start`
3. Add the environment variables from `.env.example` under **Environment**.
4. Deploy. Note the resulting URL, e.g. `https://bdmart-backend.onrender.com`.
5. In the **admin panel's** `.env`, set:
   ```
   VITE_API_URL=https://bdmart-backend.onrender.com/api
   ```
   (root `/api`, not ending in `/orders` — see the frontend's `axios.js`
   for why either form actually works, but this is the clean one.)

## Steadfast setup (for courier automation to actually work)

1. Get your **Api Key** and **Secret Key**: Steadfast merchant panel →
   Settings → API. Put them in Render's environment variables.
2. Register the webhook so live tracking updates flow in: Steadfast
   merchant panel → Settings → Webhook →
   ```
   https://<your-backend-domain>/api/orders/steadfast/webhook
   ```
3. **Test with one real order** after deploying — Steadfast's exact
   response/webhook field names can vary by API version. If something
   doesn't match, the only file that needs adjusting is
   `services/steadfastService.js` (for API responses) or the
   `/steadfast/webhook` route in `routes/orderRoutes.js` (for webhook
   payload field names) — nothing else in the stack depends on those
   exact names.

## Notes on what's intentionally NOT here

- **Authentication** — the admin panel handles its own admin login
  entirely client-side (see the frontend's `src/config/admins.js`); these
  routes have no auth middleware. If you deploy this publicly, consider
  adding an API key check or JWT auth in front of the `/api/orders` routes
  so random internet traffic can't create/delete orders.
- **Product catalog, tenants, assignments, comments, audit log** — these
  currently live in the admin panel's browser localStorage, not this
  backend (see the frontend README for why, and how to move them here
  later if you want them shared across devices).
