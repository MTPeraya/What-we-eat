# 🍽️ What We Eat – Group Dining Decision Platform

<p>A fun, fast, and fair way for groups in Thailand to decide where and what to eat.</p>
<hr>

## Installation Guide

### 1. Clone the Repository

First, download the project files to your local machine:

```bash
git clone https://github.com/MTPeraya/What-we-eat.git
```

This creates a folder named `What-we-eat` containing all the project files.

### 2. Navigate into the Project

```bash
cd What-we-eat
```

### 3. Set Up Environment Variables

This project requires `.env` files to configure environment variables. There are `.env.example` files in the **backend**, **frontend**, and at the root. You need to copy them and fill in the required values:

```bash
# Root folder
cp .env.example .env

# Backend
cd backend
cp .env.example .env
# Edit .env to configure your database, ports, and other settings
cd ..

# Frontend
cd frontend
cp .env.example .env
# Edit .env to configure API URLs and other frontend-specific settings
cd ..
```

> Make sure to update the variables such as database credentials, API endpoints, API keys, and any secret keys before running the project.

### 4. Run the Project

You have 2 options: run everything with **Docker** or run services individually.

#### Option A: Run Everything with Docker (Recommended)


1. Make sure **Docker Desktop** is installed and running.

   * If Docker Desktop is not open, open it first and wait for it to be ready.

2. From the project root, run:

    ```bash
    docker-compose up --build
    ```

* `--build` ensures all images are rebuilt, reflecting any changes to the code or configuration.
* If you don’t need a rebuild, you can just run:

    ```bash
    docker-compose up
    ```
---

#### Option B: Run Services Individually

You will need two separate terminal windows:

1. **Frontend:**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

2. **Backend:**

   ```bash
   cd backend
   npm install
   npm run dev
   ```

### 5. Troubleshooting

* **Docker not running:**
    If you see errors like Cannot connect to the Docker daemon or docker-compose: <br>
    * **Open Docker Desktop**
    Wait for it to fully start (green “Docker is running” indicator). Retry docker-compose up.

* **Database not starting / connecting:**
  Make sure the database service is running. If using Docker, run:

  ```bash
  docker-compose up -d db
  ```

  Then create the database if necessary:

  ```bash
  docker exec -it <db_container_name> psql -U <username> -c "CREATE DATABASE <dbname>;"
  ```

* **Docker build fails:**
  Force rebuild images:

  ```bash
  docker-compose build --no-cache
  docker-compose up
  ```

* **Ports already in use:**
  Check which ports are in use and modify the `.env` files or Docker Compose to use free ports.

* If you ever get errors about missing dependencies or outdated images, rerun with `--build`:

    ```bash
    docker-compose down
    docker-compose up --build
    ```
    This **stops and removes the old containers**, rebuilds the images, and starts fresh.



If you follow these steps, you should be able to get the "What-we-eat" project running. The key is to first identify the type of project by looking for the files mentioned above. Good luck! 👍

## Document
For more in-depth information, please visit our GitHub Wiki.

- ([GG Doc](https://docs.google.com/document/d/1lpNJAadCo4cqqWD7-w_K0akjBc4lDBaMn1u7tO5rYpU/edit?usp=sharing))
- ([Jira](https://ku-team-nattanan.atlassian.net/jira/software/projects/WWE/boards/38/backlog?atlOrigin=eyJpIjoiNzM0YjU2NDZlYzJkNDgyY2FmN2QzNGIyMjljZWJlNDEiLCJwIjoiaiJ9))
- ([New Jira Link](https://whatweeat.atlassian.net/jira/software/projects/SCRUM/boards/1/backlog?atlOrigin=eyJpIjoiZjAxM2M3MDRlNDgzNGFiYTkwNTM3ZmFmZjMwMzI3OGEiLCJwIjoiaiJ9))


- Sprint VDO
    - [sprint 1](https://youtu.be/OVbAiq7yjBQ?feature=shared)
    - [sprint 2](https://youtu.be/CaL2scmboik)
    - [sprint 3](https://youtu.be/HSwlEBdlIQ0?si=959Ukg6LlrAV8a6I)
    - [sprint 4](https://youtu.be/ovUweeUERIg?si=9hN5qsMwIIqY5lsN)
    - [sprint 5](https://youtu.be/wVv01Df6Tfk?si=cgTUS_y8mc96Ty0i)

