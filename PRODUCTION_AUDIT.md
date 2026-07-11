# Instagram Automation Platform: Production Readiness Audit Report

This report presents a thorough, code-level production-readiness audit of the Instagram Automation Platform (Monorepo with NestJS api and Next.js web application). 

---

## 1. Executive Summary
The platform is structurally sound, utilizing a decoupled, strategy-based architecture, proper modular borders, database transactions, robust Redis-based rate limiting, and a robust external Graph Client. However, the system currently contains **critical security vulnerabilities (Spoofing risk via Webhooks)**, **architectural runtime collisions (BullMQ queue processors clash)**, **missing pages**, **state isolation leaks**, and **broken E2E tests** that block production deployment. 

Resolving these identified items is required to achieve a stable, secure, and production-ready release.

---

## 2. Architecture & Module Topography

```
                       +-------------------+
                       |    Next.js Web    |
                       |    (React App)    |
                       +---------+---------+
                                 | Headers (x-instagram-account-id)
                                 v
                       +---------+---------+
                       |    NestJS API     |
                       |    Controllers    |
                       +----+---------+----+
                            |         |
      +---------------------+         +---------------------+
      |                                                     |
      v                                                     v
+-----+---------------+                               +-----+---------------+
|  Automation Module  |                               | MetaPlatform Module |
|  - Trigger Registry |                               | - Long-lived token  |
|  - Sequence Engine  |                               | - Graph API wrapper |
|  - BullMQ Workers    |                               | - Fetch retry & delay|
+-----+---------------+                               +-----+---------------+
      |                                                     ^
      | Dispatch Actions / Send Direct Messages             | API calls
      +-----------------------------------------------------+
```

*   **Modular Isolation:** The platform strictly separates the core orchestration layer (`AutomationModule`) from messaging execution and external connection logic. Direct integration with the Meta Graph API is encapsulated within the `modules/meta-platform` client wrapper, ensuring separation of concerns.
*   **Database Schema & State Transition:** Backed by PostgreSQL (Prisma ORM) and BullMQ (Redis-backed). State transitions on automation logs (`QUEUED` -> `RUNNING` -> `SUCCESS`/`WAITING`) are enforced with database transactions.
*   **Identified Gaps (Dead Code):**
    *   **Dead Providers:** In `apps/api/src/automation/automation.module.ts`, handlers `SendMessageActionHandler`, `WaitActionHandler`, `AddTagActionHandler`, and `CallWebhookActionHandler` are registered as NestJS providers but never imported or called by the execution system. The orchestration instead delegates directly to strategy action classes (`SendMessageActionStrategy` and `WaitActionStrategy`).
    *   **Incomplete Actions:** Actions `ADD_TAG` and `CALL_WEBHOOK` are specified in the Prisma enum but have no strategy handlers registered in `ActionStrategyResolver`. Running these will crash execution with an unhandled `ActionException` exception.

---

## 3. Meta API Integration & Resiliency
*   **GraphClient Capabilities:** Centralizes all Facebook / Instagram Graph requests. Features:
    *   Exponential backoff retries for transient errors.
    *   `AbortController` timeout enforcement (`httpTimeoutMs`).
    *   Structured exception parsing translating Meta GraphQL error codes into domain-specific NestJS exceptions.
*   **Token & Connection Scoping:** Encrypts external access tokens using AES-GCM (via `TOKEN_ENCRYPTION_KEY`) before persisting. Scopes API actions to specific Instagram accounts using headers. 
*   **Verification / Code Exchange Defect:** In `meta.e2e-spec.ts`, the mock fetch doesn't include the response headers object. GraphClient's check `response.headers.get('content-type')` crashes with `Cannot read properties of undefined (reading 'get')` during callbacks, causing test suite failures.

---

## 4. Job Processing & Queues
*   **Worker Collisions (High Alert):** In `automation.module.ts`, two workers are registered on the same queue name (`'automation'`):
    1.  `ActionWorker`: Handles `execute-action`, `delay-action`, and `retry-action` jobs.
    2.  `AutomationWorker`: Intercepts all jobs on the queue and returns `{ status: 'logged', name }` immediately.
    *This creates a race condition where the placeholder worker marks jobs as successful/completed before they are processed by the actual action executor.*
*   **Silent Failures & DLQ Mappings:**
    *   In `ActionWorker.ts`, permanent failures (validation, schema, payload type mismatches) are moved to the DLQ (`automation-dlq`) and marked `FAILED` in the database, but the worker calls `return` instead of `throw`. BullMQ registers this as a **successful completion**, distorting server metrics.
    *   The worker passes `automationId: event.eventId` (the comment/DM webhook event ID) instead of the actual `automationId` when writing key parameters during DLQ enqueuing.
*   **Rate Limits:** Features a robust sliding-window rate limiter in Redis using sorted sets (`ZREMRANGEBYSCORE` / `ZCARD`) limiting outbound triggers to 200 messages/hour.

---

## 5. Security Audit
*   **Critical Vulnerability (Meta Webhooks Spoofing):** In `apps/api/src/meta/webhook.controller.ts`, incoming webhook events via `POST /webhook` are processed directly without verifying the `X-Hub-Signature-256` header. Anyone can spoof comments or direct messages to trigger executions.
*   **Lack of Tenant Authentication/Authorization:** The controller operations in `AutomationController` and `ExecutionController` only verify tenant headers (`x-instagram-account-id`) but do not validate user context or permissions. A user can fetch, update, or delete automations on any account by changing headers.
*   **Lock Release Leak:** In `lock.service.ts`, `releaseLock` deletes the lock key via `redis.del(key)`. If the lock has timed out and another process has acquired it, this process will delete the other process's lock.

---

## 6. Frontend Architecture & API Contracts
*   **Page Gap:** The Next.js Web App router does not implement pages for:
    *   `/dashboard` (statistics, active states)
    *   `/executions` (running/completed logs UI)
    *   `/settings` (credentials, rate limits)
    *   `/assets` (synced profiles, reels, visual content media grid)
*   **Local Storage Scoping Issue:** The `builder-draft-store` in Zustand uses a global key without isolation. Drafts from Account A will leak to Account B.
*   **Legacy Triggers Payload:** The App router maps automations using legacy shapes, sending `triggers: [...]` instead of the required `triggerType` and `triggerConfig` fields defined in `CreateAutomationSchema`. This triggers payload schema mismatches (400 Bad Request) on the backend API.

---

## 7. Audit Checklist & Production Readiness Status
| Category | Checkpoint | Status | Severity | Notes |
|---|---|---|---|---|
| **Security** | Webhook verification via SHA256 HMAC | ❌ Fail | **Critical** | Missing validation header checks. |
| **Security** | API Tenant Authorization Guards | ❌ Fail | **High** | No session validation for account access. |
| **Infrastructure**| Idempotency Cache TTL / DB Size Limit | ⚠️ Risk | **Medium** | Processed keys are stored forever in SQL. |
| **Infrastructure**| Lock Expiration Safety | ⚠️ Risk | **Medium** | Simple key deletions can free active locks. |
| **Queue** | Worker Concurrency & Coexistence | ❌ Fail | **Critical** | Concurrency conflicts on `'automation'` queue. |
| **Queue** | Job Failure Reporting | ❌ Fail | **High** | Returns success instead of failing job on DLQ moves. |
| **API** | End-to-End Test Reliability | ❌ Fail | **High** | Failures on `automation.e2e-spec` and `meta.e2e-spec`. |
| **Frontend** | Screen Coverage | ⚠️ Risk | **High** | Missing Settings, Log details, and Assets screens. |

---

## 8. Stabilization Backlog & Action Plan

### Sprint 1: Security & Queue Architecture Hardening (Immediate)
1.  **Enforce HMAC Webhook Validation:**
    *   Modify `WebhookController` to verify `X-Hub-Signature-256` using the SHA-256 HMAC with the `META_APP_SECRET`.
2.  **Resolve BullMQ Worker Collision:**
    *   Remove `AutomationWorker` from the provider registry or migrate it to its own queue (e.g. `'automation-monitor'`) to prevent intercepting worker actions.
3.  **Fix Worker Failure Classification:**
    *   Modify `ActionWorker` to throw errors on permanent failures so BullMQ registers them as failed.
    *   Map `automationId` correctly to the automation ID instead of `event.eventId`.
4.  **Secure Lock Operations:**
    *   Update `LockService.releaseLock` to use a Lua script for safe unlocking, ensuring a process only releases its own lock.

### Sprint 2: API Alignment, Database Performance, & Testing (Short-term)
1.  **Add Idempotency Pruning:**
    *   Introduce an SQL partition, clean script, or Redisson TTL to remove processed event IDs older than 48 hours to save DB space.
2.  **Fix Mock Fetch Headers in spec suite:**
    *   Update test suite `test/meta.e2e-spec.ts` mocks to return a dummy `Headers` class mapping to prevent `get` crashes on page configuration calls.
3.  **Fix E2E Schemas:**
    *   Update `automation.e2e-spec.ts` payloads to match the new DTO scheme, replacing `triggers` with `triggerType` and `triggerConfig`.
4.  **Register Missing Actions:**
    *   Implement action strategies for `ADD_TAG` and `CALL_WEBHOOK` and register them in `ActionStrategyResolver`.

### Sprint 3: Frontend Refinement & Metrics (Medium-term)
1.  **Implement Route Isolation:**
    *   Scope state management keys in Zustand dynamically (e.g., `builder-draft-store-${instagramAccountId}`).
2.  **Implement Missing Web Pages:**
    *   Build out routes `/dashboard`, `/executions`, `/settings`, and `/assets` in `apps/web/src/app`.
