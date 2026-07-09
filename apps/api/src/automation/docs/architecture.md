# Automation Engine Architecture

This document describes the production-grade, highly reliable, and fault-tolerant architecture of the modular Automation Engine.

---

## 1. Execution Lifecycle

An event transitions through distinct phases with strict validation to prevent invalid state jumps:

```
[ DomainEvent ] ──> Idempotency Check & Lock ──> Register QUEUED
                                                      │
             ┌────────────────────────────────────────┘
             ▼
      [ RUNNING State ] ──> Action Handlers
             │
             ├───── Wait Action ─────────> [ WAITING State ] ──> Enqueue delay
             │
             ├───── Processing Success ──> [ SUCCESS State ] (Final)
             │
             └───── Permanent Failure ───> [ FAILED State ] (Final) ──> DLQ
```

- **Status Values**:
  - `QUEUED`: Allocated for dispatching.
  - `RUNNING`: Actively executing an action strategy.
  - `WAITING`: Delayed by a `WAIT` operation step.
  - `SUCCESS`: Completed all actions without blocking errors.
  - `FAILED`: Stopped due to non-retryable errors or exhausted retries.
  - `CANCELLED`: Aborted processing.

---

## 2. Queue Lifecycle & DLQ Flow

BullMQ coordinates async executions:

1. **Job Enqueue**: Initial steps generate `execute-action` tasks with a retry configuration defined in the dynamic configuration component (defaults: **3 attempts**, utilizing **exponential backoff with a 5s base delay**).
2. **Delayed Steps**: A delay action schedules `delay-action` using BullMQ's native timer capability.
3. **Dead Letter Queue (DLQ)**: If a job fails permanently (i.e. validation faults, non-retryable exceptions, or exhausted retries):
   - An action worker transfers task details (`automationId`, `executionId`, `eventId`, `failureReason`, `retryCount`, `lastAttemptAt`, and the related `correlationId`) into the **`automation-dlq`** queue.
   - Execution status transitions to `FAILED`.
   - Internal failure and DLQ metrics increments.

---

## 3. Configuration Layer & Worker Concurrency

A centralized `AutomationConfig` service manages operational parameters:

- **Worker Concurrency**: Set via `AUTOMATION_CONCURRENCY` environments or derived dynamically from `NODE_ENV` parameters (Production default: `50`, Staging: `20`, Dev/Local: `5`).
- **Retry Limits**: Configurable attempts threshold (`AUTOMATION_RETRY_ATTEMPTS`).
- **Backoff Delays**: Configurable exponential delays (`AUTOMATION_RETRY_BACKOFF_DELAY`).
- **Performance Warnings**: Detects slow actions exceeding `AUTOMATION_SLOW_THRESHOLD` (Default: `1000`ms) and raises warning details.

---

## 4. Idempotency & Distributed Locking

To prevent race conditions, duplicate processing, and multiple dispatches in clustered worker replicas:

- **Locking Strategy**:
  - Key format: `automation:{eventId}`.
  - The lock is acquired atomically via Redis (`SET ... PX ttlms NX`) inside `LockService`.
  - Lock automatically expires after timeout protection limits (15 seconds) to avoid deadlocks.
  - Released inside a `finally` block immediately when event handler processing completes.
- **Idempotency Strategy**:
  - Dedicated `ProcessedEvent` repository using unique database indexes on `eventId`.
  - Checked before execution matches.
  - Handled inside the distributed lock via database writes. Database unique constraint violation (error code `P2002`) guarantees atomic exclusion.

---

## 5. Observability (Correlation IDs & Metrics)

- **Correlation IDs**:
  - Unique ID created on event reception and propagated through domains, queues, database logs, and services.
  - Included in structured log contexts along with execution, tenant, and timing details.
- **Metrics Service**:
  - Calculates average execution latency, rolling P95, and P99 metrics window distributions.
  - Groups execution counters from database entries to ensure consistency across multiple clustering instances.
- **Health Checks**:
  - Provides operational endpoints: `/health`, `/health/database`, `/health/redis`, and `/health/queue`.

---

## 6. Database Optimization (Indexes)

To prevent full table scans and build blazing fast Lookups, the schema has explicit index parameters:

- `Automation`:
  - `@@index([enabled])`
  - `@@index([instagramAccountId])`
- `AutomationTrigger`:
  - `@@index([eventType])`
  - `@@index([automationId])`
- `AutomationExecution`:
  - `@@index([eventId])`
  - `@@index([automationId])`
  - `@@index([status])`
- `AutomationLog`:
  - `@@index([executionId])`
- `ProcessedEvent`:
  - `@@unique([eventId])` (Unique index)
  - `@@index([instagramAccountId])`
