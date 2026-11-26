# PulseDesk — Support Ticket Management System

A scalable, full-stack **Mini Helpdesk & Support Ticket Management System** built with **Node.js, Express, TypeScript, PostgreSQL, Prisma ORM, and Next.js (App Router + Tailwind CSS)**.

Designed around clean layered architecture, role-based access control (RBAC), state-machine ticket workflows, and an event-driven domain architecture for audit logs and notifications.

---

## Architecture Overview

```text
Next.js Frontend (App Router + Tailwind)
        │  REST + JWT Bearer Auth
        ▼
Express API (/api/v1)
  ├── Middlewares: Helmet, CORS, Rate Limiter, Zod Validator, JWT Auth, RBAC
  ├── Controllers: Thin HTTP adapters
  ├── Services: Business rules, ownership guards, status state machine
  ├── Repositories: Prisma ORM data access
  └── DomainEventBus (Pub/Sub)
        ├── ActivityLog Subscriber  ──▶ activity_logs table
        └── Notification Subscriber ──▶ notifications table
        │
        ▼
PostgreSQL Database
```

### Key Implemented Features
- **Authentication & RBAC:** JWT auth (`bcryptjs` hashing), `USER` and `ADMIN` roles, privilege-escalation protection on `/register`, and resource-ownership enforcement.
- **User Ticket Lifecycle:** Create, view, search, filter, sort, paginate, comment, and edit/delete own tickets (guarded to `OPEN` status).
- **Admin Triage & Management:** View all tickets across users, filter by status/priority/category, assign admins, update priority, and enforce valid status transitions (`OPEN` → `IN_PROGRESS` → `RESOLVED` → `CLOSED`).
- **Event-Driven Workflow (`DomainEventBus`):** Emits `TICKET_CREATED`, `TICKET_UPDATED`, `TICKET_STATUS_CHANGED`, `COMMENT_ADDED`, and `TICKET_RESOLVED` events, asynchronously persisting audit `ActivityLog` timelines and user/admin `Notification` alerts.
- **Analytics Dashboard:** Real-time KPI cards, resolution rate, status & priority breakdown charts, and recent tickets.
- **API Docs & Tests:** Interactive Swagger/OpenAPI UI at `/api/docs`, Postman collection in `docs/postman_collection.json`, and automated Vitest + Supertest suite.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js, Express.js, TypeScript, Zod, JWT, bcryptjs, Helmet |
| **Database & ORM** | PostgreSQL, Prisma ORM |
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons |
| **Testing & Docs** | Vitest, Supertest, Swagger UI (`openapi 3.0`), Postman Collection |
| **Containers** | Docker & Docker Compose |

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- PostgreSQL database (local PostgreSQL, Docker, or a free cloud DB from [Neon](https://neon.tech) / [Supabase](https://supabase.com))

### Option A: Run with Node.js + PostgreSQL URL

#### 1. Backend Setup
```bash
cd backend
cp .env.example .env
# Update DATABASE_URL in .env to point to your PostgreSQL instance

npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```
Backend runs at `http://localhost:5000` (Swagger UI at `http://localhost:5000/api/docs`).

#### 2. Frontend Setup
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```
Frontend runs at `http://localhost:3000`.

### Option B: Run Everything with Docker Compose
```bash
docker compose up --build
```
*(Run `docker compose exec backend npm run prisma:seed` once to seed demo accounts.)*

---

## Seeded Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@helpdesk.dev` | `Admin@123` |
| **User 1** | `sarah@example.com` | `User@123` |
| **User 2** | `rahul@example.com` | `User@123` |

*(The `/login` page also includes 1-click Demo User and Demo Admin login buttons.)*

---

## Running Automated Tests

```bash
cd backend
npm test
```
Tests verify authentication, privilege-escalation protection, Zod validation, RBAC & ownership guards, ticket status transitions, comment permissions, and `DomainEventBus` subscriber isolation.

---

## API Reference

Base URL: `/api/v1`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register user (`USER` role enforced) |
| `POST` | `/auth/login` | Public | Login and obtain JWT |
| `GET` | `/auth/me` | Auth | Current user profile |
| `GET` | `/auth/admins` | Admin | List admin users for assignment |
| `GET` | `/tickets` | Auth | List tickets (scoped for `USER`, all for `ADMIN`) with `search`, `status`, `priority`, `category`, `sortBy`, `sortOrder`, `page`, `limit` |
| `POST` | `/tickets` | Auth | Create support ticket (emits `TICKET_CREATED`) |
| `GET` | `/tickets/:id` | Owner / Admin | Ticket detail + comments + activity timeline |
| `PATCH` | `/tickets/:id` | Owner (`OPEN` only) / Admin | Update ticket details (emits `TICKET_UPDATED`) |
| `PATCH` | `/tickets/:id/admin` | Admin | Update status, priority, assignee (emits `TICKET_STATUS_CHANGED` / `TICKET_RESOLVED`) |
| `DELETE` | `/tickets/:id` | Owner (`OPEN` only) / Admin | Delete ticket |
| `GET` | `/tickets/:id/comments` | Owner / Admin | List comments |
| `POST` | `/tickets/:id/comments` | Owner / Admin | Add comment (emits `COMMENT_ADDED`) |
| `GET` | `/notifications` | Auth | List user notifications & unread count |
| `PATCH` | `/notifications/:id/read` | Auth | Mark notification read |
| `PATCH` | `/notifications/read-all` | Auth | Mark all notifications read |
| `GET` | `/dashboard/stats` | Auth | Ticket analytics & recent tickets |

---

## Additional Documentation
- [Database Design & ERD](./docs/DATABASE_DESIGN.md)
- [Postman Collection](./docs/postman_collection.json)
- [Interview Prep & Design Decisions](./docs/INTERVIEW_PREP.md)

---

## Deployment Guide (Free Hosting for Submission Link)
1. **PostgreSQL:** Create a free database on **Neon.tech** or **Supabase** and copy the connection string.
2. **Backend (Render / Railway):**
   - Root Directory: `backend`
   - Build Command: `npm install && npx prisma generate && npm run build`
   - Start Command: `npx prisma migrate deploy && npm start`
   - Env vars: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN=https://<your-vercel-domain>`
3. **Frontend (Vercel):**
   - Root Directory: `frontend`
   - Env var: `NEXT_PUBLIC_API_URL=https://<your-backend-domain>/api/v1`
