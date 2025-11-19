## Backend Setup

1. Copy `.env.example` to `.env` (or set variables in your hosting platform).
2. Provide the following at minimum:

   | Variable | Description |
   | --- | --- |
   | `DATABASE_URL` | Prisma connection string |
   | `EXTERNAL_PLACES_API_KEY` | Google Places (Nearby Search) API key |
   | `RECO_RADIUS_METERS` *(optional)* | Override default 5000m radius for nearby searches |
   | `FALLBACK_TO_SEEDED` *(optional)* | Set to `true` to fall back to cached DB rows when Google fails |

3. Install dependencies and run migrations:

   ```bash
   pnpm install
   pnpm prisma migrate deploy
   ```

4. Start the dev server:

   ```bash
   pnpm dev
   ```

## How restaurant data works

- `POST /api/restaurants` and `GET /api/restaurants` map directly to Google Places Nearby Search.
- Room candidate generation (`POST /api/rooms/:id/candidates`) now calls Google directly through the provider (`providers/localProvider.ts`). The provider upserts results into Prisma so votes/decisions still reference local IDs.
- The legacy seed script (`scripts/seedLocalRestaurants.ts`) can still be used for demos/tests, but production traffic requires a valid `EXTERNAL_PLACES_API_KEY`.

## Troubleshooting

- *Missing EXTERNAL_PLACES_API_KEY*: API routes return HTTP 500 and the provider throws `CENTER_REQUIRED` or `Missing EXTERNAL_PLACES_API_KEY`. Add the key to `.env` and restart.
- *Google quota exhausted*: provider logs will show the Google status; we recommend setting `FALLBACK_TO_SEEDED=true` temporarily while fixing quota issues.
- *Slow candidate fetch*: ensure the client sends `center.lat` and `center.lng` in `/api/rooms/:id/candidates` requests so the provider can query the correct coordinates and avoid unnecessary fallbacks.
