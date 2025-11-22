**Backend API / Interface Documentation**

This document summarises the primary backend HTTP API endpoints, request/response shapes, authentication requirements, and integration points. For implementation details, see the route files under `src/app/api/`.

**Common**
- **Base URL**: `http://localhost:4001` (when running locally)
- **Auth**: Cookie-based session stored in `session` cookie (see `src/lib/session.ts`). Use `getSession` for optional auth and `requireAuth` for required auth.
- **CORS**: Endpoints return CORS headers via `withCORS` and support `OPTIONS` preflight handlers.
- **Error format**: `{ error: string, details?: any }` with appropriate HTTP status codes.

**Environment / Integration**
- **Database**: Prisma (`src/lib/db.ts`) — models accessed via `prisma`.
- **External Places API**: Google Places (controlled by env `EXTERNAL_PLACES_API_KEY`) used by `/api/restaurants`.
- **Storage**: File storage via `src/lib/storage` (local disk or configured provider). Public file URLs served from `/api/files/:key`.

**Endpoints**

**/api/rooms**
- **Method**: `POST`
- **Description**: Create a new room. Generates a unique `code` and creates a `roomParticipant` for the creator.
- **Auth Required**: Optional (guests allowed). Uses `getSession` — `hostId` may be `null` for guests.
- **Request Body**: JSON `{ displayName: string, expiresAt?: string(ISO) }`
- **Success Response**: `201` `{ room: { id, code, hostId, status, expiresAt, createdAt } }`
- **Errors**: `400 INVALID_BODY`, `500 ROOM_CREATE_FAILED`
- **Integration**: Persists to DB via `prisma.room` and `prisma.roomParticipant`.
- **Source**: `src/app/api/rooms/route.ts`

**/api/rooms/:roomId/join**
- **Method**: `POST`
- **Description**: Join an existing open room. Adds a `roomParticipant`. If user already member, returns `200`.
- **Auth Required**: Optional (guests allowed). `getSession` used to attach `userId` if present.
- **Request Body**: JSON `{ displayName: string }`
- **Success Response**: `201` or `200` `{ ok: true, roomId }`
- **Errors**: `400 INVALID_BODY`, `404 ROOM_NOT_FOUND_OR_CLOSED`, `500 ROOM_JOIN_FAILED`
- **Integration**: `prisma.room`, `prisma.roomParticipant`.
- **Source**: `src/app/api/rooms/[roomId]/join/route.ts`

**/api/rooms/:roomId/votes**
- **Method**: `POST` (create/update), `DELETE` (remove own vote)
- **Description**: Create or update a user's vote for a restaurant in a room (POST). Delete cancels the user's vote.
- **Auth Required**: Yes — `requireAuth`. Also checks membership in the room (participant required).
- **POST Body**: JSON `{ restaurantId: string, value: "ACCEPT" | "REJECT" }`
- **POST Success Response**: `200` `{ ok: true, vote: { id, value, createdAt }, tally: { accept, reject, netScore, total } }`
- **DELETE Body**: JSON `{ restaurantId: string }`
- **DELETE Success Response**: `200` `{ ok: true }`
- **Errors**: `400 INVALID_BODY`, `401 UNAUTHENTICATED`, `403 FORBIDDEN_NOT_MEMBER`, `500 VOTE_FAILED` / `VOTE_DELETE_FAILED`
- **Integration**: `prisma.vote` operations and `prisma.vote.groupBy` for tally.
- **Source**: `src/app/api/rooms/[roomId]/votes/route.ts` and `src/app/api/votes/route.ts`

**/api/votes**
- **Method**: `POST`
- **Description**: Alternate entry for saving an individual vote (roomId + restaurantId + value). Performs an upsert per user+room+restaurant.
- **Auth Required**: Yes (`requireAuth`).
- **Request Body**: JSON `{ roomId: string, restaurantId: string, value: "ACCEPT" | "REJECT" }`
- **Success Response**: `200` `{ vote }`
- **Source**: `src/app/api/votes/route.ts`

**/api/restaurants**
- **Method**: `GET`, `POST`
- **Description (GET)**: Query nearby restaurants using Google Places, filter and cache them in DB. Returns internal IDs and location info. Requires `EXTERNAL_PLACES_API_KEY` (except in test env).
- **GET Query Params**: `lat` (number), `lng` (number), `radius` (meters), `budgetMax` (number), `keyword` (string)
- **GET Success Response**: `200` `{ count: number, items: [{ id, placeId, name, address, rating, price, location: { lat, lng }, userRatingsTotal }] }`
- **Description (POST)**: Bulk upsert of restaurant records into internal DB cache.
- **POST Body**: `{ items: [ { placeId, name, address?, lat, lng, rating?, priceLevel?, userRatingsTotal?, source?, fetchedAt? } ] }`
- **POST Success Response**: `200` `{ upserted: number }`
- **Integration**: Google Places API, `RestaurantService` upserts via Prisma.
- **Source**: `src/app/api/restaurants/route.ts`, `src/services/RestaurantService.ts`

**/api/me/history**
- **Method**: `GET`
- **Description**: Retrieve current user's meal history (paginated). Filters by `from` and `to` datetimes and supports `limit`+`cursor` pagination.
- **Auth Required**: Yes (`requireAuth`).
- **Query Params**: `from` (ISO datetime), `to` (ISO datetime), `limit` (number), `cursor` (mealHistory id)
- **Success Response**: `200` `{ items: [ { id, decidedAt, roomId, restaurant: { id, name, address, lat, lng, rating } } ], nextCursor: string | null }`
- **Errors**: `400 INVALID_QUERY`, `401 UNAUTHENTICATED`, `500 HISTORY_GET_FAILED`
- **Source**: `src/app/api/me/history/route.ts`

**/api/files/:key**
- **Method**: `GET`
- **Description**: Serve stored files (images) by key. Returns binary content with appropriate `Content-Type`.
- **Auth Required**: No (public read).
- **Success Response**: `200` binary body and headers `Content-Type`, `Cache-Control`.
- **Errors**: `404 NOT_FOUND`, `404 FILE_NOT_FOUND`
- **Integration**: `src/lib/storage` (storage provider), `src/app/api/files/[key]/route.ts`

**Notes & Other Endpoints**
- There are additional room lifecycle endpoints and utilities under `src/app/api/rooms/[roomId]/...` such as `start`, `leave`, `share`, `view-results`, `decide/final`, `decide/score`, `candidates` and more. See route files under `src/app/api/rooms/` for specifics.
- Authentication/Session endpoints and user management are implemented under `src/app/api/me` and `src/services/*` — check `src/lib/session.ts` for cookie/session handling.

**Quick local run**
1. Start DB and services with Docker Compose (recommended):
```bash
docker-compose up --build
```
2. Or run backend locally from `backend/`:
```bash
cd backend
npm install
npm run dev
```
3. Test an endpoint:
```bash
curl -i "http://localhost:4001/api/restaurants?lat=13.7&lng=100.5"
```

**Where to look in source**
- Main API routes: `src/app/api/` (look for `route.ts` files)
- DB: `src/lib/db.ts`
- Sessions: `src/lib/session.ts`
- Storage: `src/lib/storage.ts`
- Services: `src/services/` (business logic like `RestaurantService`, `RoomService`, `voteService`)
