# User-based Todo List API (LuckyBeard Technical Challenge)

Backend implementation of a **user-based Todo List API** built with **Node.js, TypeScript, Express, Prisma, and PostgreSQL**.

It covers:

- User registration, login, and authentication (JWT)
- Per-user Todo CRUD (Create, Read, Update, Delete)
- Soft-delete user accounts (no hard delete)
- Bulk upload of Todos via **JSON or CSV**
- Basic API versioning (`/api/v1/...`)
- Experimental AI integration for Todo categorisation (kept in, but may require extra work to function with external APIs)

> The AI integration is intentionally left as-is. Due to changes in HuggingFace's inference API and free-tier limitations, it may not function fully without additional configuration. This is acceptable for the interview: you can explain how it is wired and why it currently fails.

---

## Tech Stack

- **Runtime:** Node.js (TypeScript)
- **Framework:** Express
- **ORM:** Prisma (with PostgreSQL)
- **Database:** PostgreSQL (local)
- **Auth:** JWT (JSON Web Tokens)
- **Dev tooling:** ts-node-dev
- **Optional AI:** HuggingFace + HTTP client (axios) / local AI-style tagger

---

## Requirements & Prerequisites

Before cloning/running this repo, ensure you have:

1. **Node.js**  
   - Version: **18.x or later** (recommended 18 LTS or 20 LTS).  
   - Check with:
     ```bash
     node -v
     ```

2. **npm**
   - Comes with Node.
   - Check with:
     ```bash
     npm -v
     ```

3. **Git**
   - To clone the repository.

4. **PostgreSQL**
   - Running locally (default host/port assumed: `localhost:5432`)
   - You can manage it with **pgAdmin** or `psql`.
   - A database named: `todo_list_api`

5. (Optional) **HuggingFace account + API token**
   - Only needed if you want to try to make the experimental AI endpoint actually call HuggingFace.
   - Not required to run the core API.

---

## Project Structure (High-level)

```text
Todo-list-API/
  prisma/
    schema.prisma
    migrations/
  src/
    server.ts
    config/
      prisma.ts
      huggingface.ts (optional, if AI is wired)
    middleware/
      authMiddleware.ts
    routes/
      auth.routes.ts
      todo.routes.ts
      user.routes.ts
      ai.routes.ts (AI categorisation endpoint)
  .env
  package.json
  tsconfig.json
  prisma.config.ts
```

---

## Getting Started (Step-by-Step)

### 1. Clone the repository

```bash
git clone https://github.com/Jose-IDO/Todo-List-api
cd Todo-list-API
```

---

### 2. Install dependencies

```bash
npm install
```

This installs all required packages, including Express, TypeScript, Prisma, JWT, bcrypt, multer, csv-parse, dotenv, etc.

---

### 3. Set up PostgreSQL database

Make sure PostgreSQL is running on your machine.

1. Create a database named `todo_list_api`.

   Using psql:

   ```sql
   CREATE DATABASE todo_list_api;
   ```

   Or via pgAdmin UI.

2. Ensure you know your PostgreSQL credentials:
   - **User:** e.g. `postgres`
   - **Password:** e.g. `your_password`
   - **Host:** `localhost`
   - **Port:** `5432`

You will use these in your `DATABASE_URL` in `.env`.

---

### 4. Create `.env` file

Create a `.env` file at the **root** of the project (same level as `package.json`).

```env
# --- DATABASE CONNECTION ---
DATABASE_URL="postgresql://postgres:<YOUR_PASSWORD>@localhost:5432/todo_list_api?schema=public"

# --- SERVER PORT ---
PORT=3000

# --- JWT SECRET FOR AUTH ---
# Use a long, random string here (at least 32–64 chars)
JWT_SECRET="your-long-random-jwt-secret"

# --- HUGGINGFACE API KEY (OPTIONAL / FOR AI) ---
# Only required if you try to hook up HuggingFace again.
HF_API_KEY="hf_your_huggingface_api_key_here"
```

Replace:

- `<YOUR_PASSWORD>` with your real PostgreSQL password.
- `your-long-random-jwt-secret` with a secure value (you can generate one via `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`).
- `hf_your_huggingface_api_key_here` with your real HF token (if you use it).

---

### 5. Prisma configuration and database migration

These steps ensure your PostgreSQL database schema matches the `schema.prisma`.

#### 5.1 Check `prisma.config.ts`

You should have something like:

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

This tells Prisma to use `DATABASE_URL` from `.env`.

#### 5.2 Run migrations

From the project root:

```bash
npx prisma migrate dev --name init
```

This will:

- Read your `prisma/schema.prisma`
- Create migration SQL files
- Apply them to `todo_list_api` database
- Keep the DB in sync with the schema

#### 5.3 Generate Prisma client (usually done automatically by migrate)

Just to be sure:

```bash
npx prisma generate
```

This generates the Prisma client used in `src/config/prisma.ts`.

---

### 6. Start the development server

Use the `dev` script defined in `package.json`:

```bash
npm run dev
```

This will:

- Use `ts-node-dev` to run `src/server.ts` in watch mode.
- Load environment variables via `dotenv`.
- Start Express on the port defined in `.env` (default 3000).

You should see something like:

```text
Server running on port 3000
```

---

## All API Endpoints

Base URL: `http://localhost:3000/api/v1`

All endpoints (except register and login) require JWT authentication in the Authorization header:

```
Authorization: Bearer <token>
```

### Auth Endpoints

- **Register**

  - **URL:** `/auth/register`
  - **Method:** `POST`
  - **Body (JSON):**

    ```json
    {
      "name": "John",
      "surname": "Doe",
      "email": "john@example.com",
      "password": "password123"
    }
    ```

- **Login**

  - **URL:** `/auth/login`
  - **Method:** `POST`
  - **Body (JSON):**

    ```json
    {
      "email": "john@example.com",
      "password": "password123"
    }
    ```

  Returns a JWT token which must be sent in `Authorization` header:

  ```http
  Authorization: Bearer <token_here>
  ```

### Todo CRUD Endpoints

All Todo routes are **protected** with JWT.

Base path: `/todos`

1. **Create Todo**

   ```http
   POST /api/v1/todos
   Authorization: Bearer <token>
   Content-Type: application/json
   ```

   **Body:**
   ```json
   {
     "title": "My Task",
     "description": "Do something important",
     "status": "PENDING"
   }
   ```

2. **List Todos for current user**

   ```http
   GET /api/v1/todos
   Authorization: Bearer <token>
   ```

3. **Get Single Todo**

   ```http
   GET /api/v1/todos/:id
   Authorization: Bearer <token>
   ```

4. **Update Todo (partial update)**

   ```http
   PATCH /api/v1/todos/:id
   Authorization: Bearer <token>
   Content-Type: application/json
   ```

   Example body:

   ```json
   {
     "title": "Updated title",
     "status": "IN_PROGRESS"
   }
   ```

5. **Delete Todo**

   ```http
   DELETE /api/v1/todos/:id
   Authorization: Bearer <token>
   ```

### Bulk Upload Todos (JSON/CSV)

Endpoint:

```http
POST /api/v1/todos/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form-data key:** `file` (type: File)

#### JSON format supported

```json
[
  { "title": "JSON Task 1", "description": "First bulk todo from JSON", "status": "PENDING" },
  { "title": "JSON Task 2", "description": "Second bulk todo from JSON" }
]
```

or

```json
{
  "todos": [
    { "title": "JSON Task 1", "description": "First bulk todo from JSON" }
  ]
}
```

#### CSV format supported

```csv
title,description,status
"CSV Task 1","First bulk todo from CSV","PENDING"
"CSV Task 2","Second CSV todo","DONE"
```

Rows missing `title` or `description` are skipped.

### Soft Delete User Account

Endpoint:

```http
DELETE /api/v1/users/me
Authorization: Bearer <token>
```

Behavior:

- Sets `isDeleted = true` for the authenticated user in the database.
- Prevents future login for that user (auth checks `isDeleted`).
- Does **not** hard-delete the user row.

### AI Integration (Experimental / Non-Critical)

The project includes an AI-related endpoint:

```http
POST /api/v1/ai/categorise-todos
Authorization: Bearer <token>
```

Intended behavior:

- Fetches the authenticated user's todos.
- Sends their titles/descriptions to an AI model (HuggingFace or local tagger).
- Gets back suggested tags like `["work", "learning", "data"]`.
- Returns todos with `aiTags` in the response.

Due to recent HF API changes and free-tier constraints, the external call may fail or return no tags unless reconfigured to use `https://router.huggingface.co` and a valid model/plan.

---

## Scripts

From `package.json`:

- **Start dev server (watch mode, TypeScript)**
  ```bash
  npm run dev
  ```

---

## Notes for Reviewers / Interviewers

- Uses **TypeScript** for type safety and clearer intent.
- Prisma manages the data model and migrations for `User` and `Todo`.
- JWT-based auth with a dedicated `authMiddleware` ensures per-user isolation.
- Bulk upload is designed to be robust to bad rows and multiple formats.
- AI integration is present as an experimental, discussion-focused feature rather than a production-stable one.
