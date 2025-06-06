Thought for a second

```markdown
# Workout Tracker Microservices

A small two-service workout tracker app built to experiment with microservices, Docker, and Prisma. It includes:

- **User Service** (Node, Express, Prisma, PostgreSQL)  
  Handles registration, login (JWT auth), and basic user data.

- **Workout Service** (Node, Express, Prisma, PostgreSQL)  
  Manages workout sessions, exercise progress, and comments on workouts.

Both services run in their own Docker containers, with an Nginx reverse proxy in front to route requests. Below is a quick rundown of what’s here, what I did, and how to try it out.

---

## What I Built & Why

- **Separate services**: “User” and “Workout” each have their own codebase and Prisma schema.
- **Dockerized everything**: Each service, Postgres, and Nginx run in their own container via Docker Compose.
- **Prisma + PostgreSQL**: Used to define data models, run migrations, and handle all database interactions.
- **JWT Auth**: User Service issues tokens; Workout Service checks tokens on each request.
- **Nginx Reverse Proxy**: Listens on port 80, routes `/auth/*` → User Service (3001) and `/workouts/*` → Workout Service (3002).
- **Integration tests**: Jest + Supertest cover key endpoints (e.g., creating workouts, posting comments).

This project helped me practice microservices architecture, containerized deployment, and database migrations in Docker.

---

## Tech Stack

- **Node.js & Express** (TypeScript)
- **Prisma ORM**
- **PostgreSQL**
- **Docker & Docker Compose**
- **Nginx** (Alpine)
- **JWT (jsonwebtoken)**
- **bcrypt** (password hashing)
- **Jest + Supertest** (integration tests)

---

## Repo Structure
```

.
├── docker-compose.yml
├── nginx/
│ ├── nginx.conf
│ └── mime.types
├── user-service/
│ ├── Dockerfile
│ ├── prisma/
│ │ ├── migrations/
│ │ └── schema.prisma
│ ├── src/
│ │ ├── controllers/
│ │ ├── middleware/
│ │ ├── routes/
│ │ ├── services/
│ │ └── utils/
│ ├── tsconfig.build.json
│ ├── package.json
│ └── .env.production
├── workout-service/
│ ├── Dockerfile
│ ├── prisma/
│ │ ├── migrations/
│ │ └── schema.prisma
│ ├── src/
│ │ ├── controllers/
│ │ ├── middleware/
│ │ ├── routes/
│ │ ├── services/
│ │ └── utils/
│ ├── tsconfig.build.json
│ ├── package.json
│ └── .env.production
└── README.md

````

---

## How to Run It

1. **Clone the repo**
   ```bash
   git clone https://github.com/suhailshub-arch/workout-tracker.git
   cd workout-tracker
````

2. **Add `.env.production` files**  
   Copy or create the following in each service folder:

   **`user-service/.env.production`**

   ```env
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=your_db_password
   POSTGRES_DB=fitness
   DATABASE_URL="postgresql://postgres:your_db_password@db:5432/fitness?schema=public"
   JWT_SECRET=your_jwt_secret
   BCRYPT_SALT_ROUNDS=10
   ```

   **`workout-service/.env.production`**

   ```env
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=your_db_password
   POSTGRES_DB=fitness
   DATABASE_URL="postgresql://postgres:your_db_password@db:5432/fitness?schema=public"
   JWT_SECRET=your_jwt_secret
   ```

3. **Build & start all services**

   ```bash
   docker-compose up --build -d
   ```

   This spins up:

   - `db` (Postgres) on 5432
   - `user_service` on 3001
   - `workout_service` on 3002
   - `nginx-proxy` on 80

4. **Check that containers are running**

   ```bash
   docker ps
   ```

5. **Test endpoints**
   - **User health check**:
     ```bash
     curl http://localhost/auth/health
     # → { "status": "ok" }
     ```
   - **Register**:
     ```bash
     curl -X POST http://localhost/auth/register \
       -H "Content-Type: application/json" \
       -d '{ "email": "alice@example.com", "password": "password123", "name": "Alice" }'
     ```
   - **Login (get JWT)**:
     ```bash
     curl -X POST http://localhost/auth/login \
       -H "Content-Type: application/json" \
       -d '{ "email": "alice@example.com", "password": "password123" }'
     ```
   - **Workout health check**:
     ```bash
     curl http://localhost/workouts/health
     # → { "status": "ok" }
     ```
   - **Create a workout** (replace `<TOKEN>` with JWT):
     ```bash
     curl -X POST http://localhost/workouts \
       -H "Content-Type: application/json" \
       -H "Authorization: Bearer <TOKEN>" \
       -d '{
         "date": "2025-07-01",
         "time": "07:30",
         "exercises": [
           { "exerciseId": "ex1", "order": 1, "targetReps": 10, "targetSets": 3 },
           { "exerciseId": "ex2", "order": 2, "targetReps": 8,  "targetSets": 4 }
         ]
       }'
     ```
   - **List workouts**:
     ```bash
     curl http://localhost/workouts?status=all \
       -H "Authorization: Bearer <TOKEN>"
     ```
   - **Add a comment**:
     ```bash
     curl -X POST http://localhost/workouts/<WORKOUT_ID>/comments \
       -H "Content-Type: application/json" \
       -H "Authorization: Bearer <TOKEN>" \
       -d '{ "text": "Felt strong today!" }'
     ```
   - **List comments**:
     ```bash
     curl http://localhost/workouts/<WORKOUT_ID>/comments \
       -H "Authorization: Bearer <TOKEN>"
     ```
   - **List exercises**:
     ```bash
     curl http://localhost/exercises \
       -H "Authorization: Bearer <TOKEN>"
     ```

---

## Testing

Each service has Jest + Supertest tests. To run a service’s tests:

1. **Start a test Postgres** (using `docker-compose.test.yml`)
   ```bash
   cd user-service
   npm run test:db          # spins up test database
   npm run test:prepare     # applies Prisma schema to test DB
   npm test                 # runs Jest
   npm run test:db:down     # tears down test DB
   ```
2. **Similarly for workout-service**.

---

## What I Learned / Highlights

- **Microservices** split logic cleanly: User Service handles auth, Workout Service handles workout data.
- **Prisma migrations**: `migrate dev` locally → commit migrations → `migrate deploy` in Docker.
- **Docker multi-stage builds**: Generate Prisma Client and compile TS in a builder stage, copy only needed artifacts into a slimmer runtime image.
- **Nginx reverse proxy**: Simple config to route two backends on the same Docker network.
- **JWT authentication**: Tokens issued in one service, verified in the other.

---

### TL;DR

1. **Clone & add `.env.production`** files.
2. **Run**:
   ```bash
   docker-compose up --build -d
   ```
3. **Register & login** at `/auth`, grab JWT.
4. **Hit `/workouts`** endpoints with `Authorization: Bearer <TOKEN>`.
5. **See tables** in Postgres (`docker exec -it db psql -U postgres -d fitness; \dt`).

---

Feel free to browse the code, tweak endpoints, or add new features. This was a personal project to learn microservices, Docker, and Prisma!

```

```
