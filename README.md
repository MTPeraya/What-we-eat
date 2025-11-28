# 🍽️ What We Eat – Group Dining Decision Platform

A fun, fast, and fair way for groups in Thailand to decide where and what to eat.

---

# 🚀 Quick Start

**Recommended for development:**

```bash
git clone https://github.com/MTPeraya/What-we-eat.git
cd What-we-eat
docker compose up --build
```

**Recommended Browser**
For the best experience, please use 
`Google Chrome` to open the application.
Some features, especially those related to cookies or session handling may not work correctly in other browsers.

Local Development URLs:

* Frontend → [http://localhost:5173](http://localhost:5173)
* Backend → [http://localhost:4001](http://localhost:4001)
* Database → internal host: `db:5432`

> Make sure to copy `.env.example` to `.env` and fill in the required variables before running.

---

# 🔧 Installation & Environment Setup

## 1. Clone & Navigate

```bash
git clone https://github.com/MTPeraya/What-we-eat.git
cd What-we-eat
```

## 2. Set Up `.env` Files

Copy `.env.example` files to `.env`:

```bash
# Root
cp .env.example .env

# Frontend
cd frontend
cp .env.example .env
cd ..
```

Edit `.env` to configure:

* Database credentials (`DATABASE_URL`)
* API endpoints
* Secret keys (`JWT_SECRET`, `EXTERNAL_PLACES_API_KEY`)

---

# 🗄️ Database Configuration

This project supports **2 options**:

## **Option 1 — Local Database via Docker Compose**

Docker Compose automatically starts a PostgreSQL container named `db`.

Use this in `.env`:

```text
DATABASE_URL="postgresql://user:password@db:5432/db"
DB_NAME=db
DB_USER=user
DB_PASSWORD=password
```

> **Important:** The database may starts empty. After starting the DB container, run Prisma migrations to create tables:

```bash
docker compose exec backend npx prisma migrate dev --name init
```

**Note:** `db` is the internal Docker service name; do **not** use `localhost` inside Docker.

---

## **Option 2 — Remote PostgreSQL (Cloud/School/Production)**

Use the credentials provided by your external server:

```text
DATABASE_URL="postgresql://<USERNAME>:<PASSWORD>@<HOST>/<DBNAME>?sslmode=require"
```

---

## **Summary Table**

| Scenario                                  | Backend Location | Database Host | DATABASE_URL Example                             |
| ----------------------------------------- | ---------------- | ------------- | ------------------------------------------------ |
| Local DB via Docker Compose  | Docker           | db            | `postgresql://user:password@db:5432/db`         |
| Remote DB                                 | Anywhere         | Remote host   | `postgresql://user:pass@host/db?sslmode=require` |

---

# 🔑 Secrets & API Keys

Some features require keys that must **never** be shared publicly.

## **1. JWT_SECRET**

Used by the backend to sign JWT tokens.

* Must be a **long, random string**.
* Generate using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`.env` example:

```text
JWT_SECRET="your_generated_secret_here"
```

---

## **2. EXTERNAL_PLACES_API_KEY (Google Maps / Places API)**

Used for:

* Searching restaurants
* Getting restaurant details
* Displaying maps

### How to get it:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Navigate to **APIs & Services → Credentials → Create API Key**
4. Copy the generated key

Enable these APIs:

* Places API
* Maps JavaScript API (optional for frontend maps)
* Geocoding API (optional for address lookup)

`.env` example:

```text
EXTERNAL_PLACES_API_KEY="YOUR_GOOGLE_MAPS_API_KEY"
```

> ⚠ Keep this key private. Do not commit to public repos.

---

# ▶️ Running the Project

## Option A — Docker (Recommended)

```bash
docker compose up --build
```

* Use `--build` to rebuild images if you made changes.
* Without rebuild: `docker compose up`

---

## Option B — Run Services Individually

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run dev
```

---

# ⚠ Troubleshooting

* **Docker not running** → Open Docker Desktop and wait until it says "running".
* **Database connection errors** → Ensure DB container is up:

```bash
docker compose up -d db
```

* **Force rebuild**:

```bash
docker compose build --no-cache
docker compose up
```

* **Ports already in use** → Change ports in `.env` and `docker-compose.yml`.

--- 

# 📄 Documentation & Videos

* [GG Doc Link](https://docs.google.com/document/d/1lpNJAadCo4cqqWD7-w_K0akjBc4lDBaMn1u7tO5rYpU/edit?usp=sharing)
* [Jira Link](https://whatweeat.atlassian.net/jira/software/projects/SCRUM/boards/1/backlog?atlOrigin=eyJpIjoiYTNhOGVhZjFmY2E3NDQ0YWEyNjk0MTA4MzMzMzU4OTIiLCJwIjoiaiJ9)

### Software Demonstration
[Demo video Link](https://youtu.be/lyA92GLkeNM?si=_H367hINM2da1Pe7)

### Sprint Videos

* [Sprint 1](https://youtu.be/OVbAiq7yjBQ?feature=shared)
* [Sprint 2](https://youtu.be/CaL2scmboik)
* [Sprint 3](https://youtu.be/HSwlEBdlIQ0?si=959Ukg6LlrAV8a6I)
* [Sprint 4](https://youtu.be/ovUweeUERIg?si=9hN5qsMwIIqY5lsN)
* [Sprint 5](https://youtu.be/wVv01Df6Tfk?si=cgTUS_y8mc96Ty0i)

### Software Development Video
[Video Link](https://youtu.be/LgBe3M6c_2I?si=Cyu-Fi4_BKWMw47e)

---

# 📚 More Information

For detailed setup instructions, advanced configurations, and additional documentation, check out our GitHub Wiki:
[What We Eat Wiki](https://github.com/MTPeraya/What-we-eat/wiki)

---
