# Interview Preparation Guide — Support Ticket Management System

Use these talking points to explain your architecture and engineering decisions confidently during the technical interview.

---

## 1. Architecture & Clean Separation of Concerns
**Pattern:** `Route -> Middleware (Auth, RBAC, Zod Validation) -> Controller -> Service -> Repository -> Prisma/PostgreSQL` + `DomainEventBus`.

- **Why not put Prisma calls directly in controllers?**
  - **Testability:** Mocking the repository layer lets us run all 14 API & Event tests in milliseconds without needing a live database for unit/integration CI checks.
  - **Maintainability:** HTTP concerns (`req`/`res`, status codes) stay in controllers; business rules (status state machine, ownership checks) stay in services; SQL/Prisma queries stay in repositories.

---

## 2. Event-Driven Workflow (`DomainEventBus`)
- **How it works:** Services emit strongly typed domain events (`TICKET_CREATED`, `TICKET_UPDATED`, `TICKET_STATUS_CHANGED`, `COMMENT_ADDED`, `TICKET_RESOLVED`) onto a central `DomainEventBus` (Observer / Pub-Sub pattern).
- **Subscribers:**
  1. `activityLog.subscriber.ts` persists an immutable audit trail (`ActivityLog` table) for every ticket action.
  2. `notification.subscriber.ts` generates targeted notifications (`Notification` table) — notifying Admins when users raise tickets or reply, and notifying Users when Admins update, comment, or resolve tickets, and triggers `notification:new` over WebSockets.
  3. `realtime.subscriber.ts` pushes instant Socket.IO updates (`ticket:event`) to authorized `user:<id>`, `role:ADMIN`, and `ticket:<id>` rooms so dashboards, ticket lists, comments, and timelines sync live without polling.
- **Error Isolation:** Every listener execution is wrapped in a `Promise.resolve(...).catch(...)` boundary so a failing side-effect (e.g., email/notification service outage) never crashes the primary HTTP request.
- **How to scale it:** Because the `eventBus` interface is decoupled from services, swapping Node's `EventEmitter` for **Redis Pub/Sub**, **BullMQ**, or **Kafka** requires changing only `eventBus.ts` and subscriber registration — zero changes to business services.

---

## 3. Security & Authorization Decisions
1. **Privilege Escalation Prevention:** Public `POST /api/v1/auth/register` ignores any `role` field in the request body via Zod validation and hardcodes `Role.USER`.
2. **RBAC + Resource Ownership:**
   - `authenticate` verifies the JWT signature and checks the user still exists in PostgreSQL.
   - `authorize(Role.ADMIN)` protects admin triage routes (`PATCH /tickets/:id/admin`, `GET /auth/admins`).
   - Ownership checks in `TicketService` & `CommentService` ensure a `USER` can never read, edit, delete, or comment on another user's ticket (`403 Forbidden`).
3. **"Edit and Delete Where Appropriate":**
   - Users can edit or delete their ticket **only while it is `OPEN`**. Once an Admin picks it up (`IN_PROGRESS`, `RESOLVED`, `CLOSED`), requester mutation is blocked (`400 Bad Request`) to preserve audit integrity.
4. **Status Transition State Machine:**
   - `ALLOWED_STATUS_TRANSITIONS` prevents invalid transitions (e.g., jumping directly from `CLOSED` to `RESOLVED` without reopening).
5. **Defense in Depth:** `helmet` security headers, strict `cors` origin allowlist, `express-rate-limit` on `/auth/*` and `/api/v1/*`, bcrypt with 12 salt rounds, Zod schema validation (returning structured `422` errors), and production-safe global error handler (hiding stack traces and mapping Prisma error codes `P2002` -> `409`, `P2025` -> `404`).

---

## 4. Common Interview Questions & Strong Answers

**Q: Why did you choose PostgreSQL over MongoDB?**
> Tickets, users, comments, activity logs, and notifications are deeply relational. PostgreSQL enforces foreign key integrity, supports atomic sequential ticket numbers (`ticket_number`), native enums, and composite indexes for fast filtering and analytics `GROUP BY` aggregations.

**Q: What happens if a listener fails in your event-driven workflow?**
> Right now, errors are caught and logged without breaking the user's HTTP response. In a production multi-instance setup, I would move to an **Outbox Pattern** (writing the domain event inside the same DB transaction as the ticket) and have a background worker (BullMQ / Kafka) process events with retries and dead-letter queues for guaranteed at-least-once delivery.

**Q: How would you handle 100k+ tickets in `GET /api/v1/tickets`?**
> Currently we use indexed offset pagination (`skip`/`take`) with `limit` capped at 50 and indexes on `status`, `priority`, `category`, `created_by_id`, and `created_at`. For very deep pages, I would switch to **keyset (cursor-based) pagination** on `(createdAt, id)` and add a PostgreSQL `GIN` trigram index (`pg_trgm`) for full-text search.
