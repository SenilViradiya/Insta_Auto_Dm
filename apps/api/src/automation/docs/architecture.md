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

* **Status Values**:
  * `QUEUED`: Allocated for dispatching.
  * `RUNNING`: Actively executing an action strategy.
  * `WAITING`: Delayed by a `WAIT` operation step.
  * `SUCCESS`: Completed all actions without blocking errors.
  * `FAILED`: Stopped due to non-retryable errors or exhausted retries.
  * `CANCELLED`: Aborted processing.

---

## 2. Queue Lifecycle & DLQ Flow

BullMQ coordinates async executions:

1. **Job Enqueue**: Initial steps generate `execute-action` tasks with a retry configuration of **3 attempts** utilizing **exponential backoff (5s base delay)**.
2. **Delayed Steps**: A delay action schedules `delay-action` using BullMQ's native timer capability.
3. **Dead Letter Queue (DLQ)**: If a job fails permanently (i.e. validation faults, non-retryable exceptions, or exhausted retries):
   * An action worker transfers task details (`automationId`, `executionId`, `eventId`, `failureReason`, `retryCount`, `lastAttemptAt`) into the **`automation-dlq`** queue.
   * Execution status transitions to `FAILED`.
   * Internal failure and DLQ metrics increments.

---

## 3. Idempotency & Distributed Locking

To prevent race conditions, duplicate processing, and multiple dispatches in clustered worker replicas:

* **Locking Strategy**:
  * Key format: `automation:{eventId}`.
  * The lock is acquired atomically via Redis (`SET ... PX ttlms NX`) inside `LockService`.
  * Lock automatically expires after timeout protection limits (15 seconds) to avoid deadlocks.
  * Released inside a `finally` block immediately when event handler processing completes.
* **Idempotency Strategy**:
  * Dedicated `ProcessedEvent` repository using unique database indexes on `eventId`.
  * Checked before execution matches.
  * Handled inside the distributed lock via database writes. Database unique constraint violation (error code `P2002`) guarantees atomic exclusion.

---

## 4. Database Optimization (Indexes)

To prevent full table scans and build blazing fast Lookups, the schema has explicit index parameters:

* `Automation`:
  - `@@index([enabled])`
  - `@@index([instagramAccountId])`
* `AutomationTrigger`:
  - `@@index([eventType])`
  - `@@index([automationId])`
* `AutomationExecution`:
  - `@@index([eventId])`
  - `@@index([automationId])`
  - `@@index([status])`
* `AutomationLog`:
  - `@@index([executionId])`
* `ProcessedEvent`:
  - `@@unique([eventId])` (Unique index)
  - `@@index([instagramAccountId])`
