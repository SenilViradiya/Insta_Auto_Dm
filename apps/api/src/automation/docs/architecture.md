# Automation Engine Architecture

This document describes the production-grade, highly reliable, and fault-tolerant architecture of the modular Automation Engine.

---

## 1. Trigger-Driven Architecture (V2)

The Automation Engine has been redesigned to be trigger-driven. This allows the platform to launch automations from various event sources (Reel Comments, Feed Comments, Direct Messages, Story Replies, Story Mentions, etc.) using a unified, extensible schema.

```
       [ Webhook / Event Agent ]
                   │
                   ▼
             [ DomainEvent ]
                   │
                   ▼
       Idempotency Check & Lock
                   │
                   ▼
  Lookup Matching Automations by TriggerType
  (e.g., DIRECT_MESSAGE, REEL_COMMENT, etc.)
                   │
                   ▼
         Evaluate Conditions
                   │
                   ▼
          Create Execution
                   │
                   ▼
            [ QUEUED State ]
                   │
                   ▼
            [ RUNNING State ]
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
    Wait Action        SEND_MESSAGE / etc.
         │                   │
         ▼                   ▼
  [ WAITING State ]   [ SUCCESS State ] (Final)
         │
         ▼
   Enqueue Delay
```

### Trigger Configuration Schema

To avoid creating a new database table for each new trigger type, triggers and their options are stored directly on the `Automation` model:
- `triggerType` (enum): Specifies the trigger event class (e.g. `DIRECT_MESSAGE`, `REEL_COMMENT`, `POST_COMMENT`, `STORY_REPLY`, `STORY_MENTION`).
- `triggerConfig` (JSON): Stores provider-agnostic parameters for the specified trigger. 

#### Schema Structures:

1. **DIRECT_MESSAGE**
   - Mode: `ANY_MESSAGE` or `KEYWORD`
   - Example (Keyword Mode):
     ```json
     {
       "mode": "KEYWORD",
       "keywords": ["price", "catalog"]
     }
     ```

2. **REEL_COMMENT** / **POST_COMMENT**
   - Media Scope: `ALL_REELS` / `ALL_POSTS` or `SPECIFIC_REEL` / `SPECIFIC_POST`
   - Match Type: `ANY_COMMENT` or `KEYWORD`
   - Example:
     ```json
     {
       "mediaScope": "SPECIFIC_REEL",
       "mediaId": "1789...",
       "matchType": "KEYWORD",
       "keywords": ["price", "link"],
       "publicReply": "Check your DM 😊"
     }
     ```

3. **STORY_REPLY**
   - Story Scope: `ANY`
   - Example:
     ```json
     {
       "storyScope": "ANY"
     }
     ```

4. **STORY_MENTION**
   - Empty configuration: `{}`

---

## 2. Validation Registry

To adhere to the Open-Closed Principle, Validation uses a polymorphic registry pattern. Rather than using switch statements, each `TriggerType` maps to a registered `TriggerValidator`:

- `TriggerValidator` interface defines a single `validate(config: any): any` function.
- Multiple validator schemas (using Zod) validate constraints based on the trigger class rules.
- Register functions permit adding future trigger support (e.g., `INSTAGRAM_LIVE_COMMENT`, `FOLLOW_EVENT`, `WHATSAPP_MESSAGE`) list-wide without altering existing validator code.

---

## 3. Execution Lifecycle

An event transitions through distinct phases with strict validation to prevent invalid state jumps:

- **Status Values**:
  - `QUEUED`: Allocated for dispatching.
  - `RUNNING`: Actively executing an action strategy.
  - `WAITING`: Delayed by a `WAIT` operation step.
  - `SUCCESS`: Completed all actions without blocking errors.
  - `FAILED`: Stopped due to non-retryable errors or exhausted retries.
  - `CANCELLED`: Aborted processing.

---

## 4. Queue Lifecycle & DLQ Flow

BullMQ coordinates async executions:

1. **Job Enqueue**: Initial steps generate `execute-action` tasks with a retry configuration defined in the dynamic configuration component (defaults: **3 attempts**, utilizing **exponential backoff with a 5s base delay**).
2. **Delayed Steps**: A delay action schedules `delay-action` using BullMQ's native timer capability.
3. **Dead Letter Queue (DLQ)**: If a job fails permanently (i.e. validation faults, non-retryable exceptions, or exhausted retries):
   - An action worker transfers task details (`automationId`, `executionId`, `eventId`, `failureReason`, `retryCount`, `lastAttemptAt`, and the related `correlationId`) into the **`automation-dlq`** queue.
   - Execution status transitions to `FAILED`.
   - Internal failure and DLQ metrics increments.

---

## 5. Centralized Configuration Layer

A centralized `AutomationConfig` service manages operational parameters:

- **Worker Concurrency**: Set via `AUTOMATION_CONCURRENCY` environments or derived dynamically from `NODE_ENV` parameters (Production default: `50`, Staging: `20`, Dev/Local: `5`).
- **Retry Limits**: Configurable attempts threshold (`AUTOMATION_RETRY_ATTEMPTS`).
- **Backoff Delays**: Configurable exponential delays (`AUTOMATION_RETRY_BACKOFF_DELAY`).
- **Performance Warnings**: Detects slow actions exceeding `AUTOMATION_SLOW_THRESHOLD` (Default: `1000`ms) and raises warning details.

---

## 6. Idempotency & Distributed Locking

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

## 7. Observability (Correlation IDs & Metrics)

- **Correlation IDs**:
  - Unique ID created on event reception and propagated through domains, queues, database logs, and services.
  - Included in structured log contexts along with execution, tenant, and timing details.
- **Metrics Service**:
  - Calculates average execution latency, rolling P95, and P99 metrics window distributions.
  - Groups execution counters from database entries to ensure consistency across multiple clustering instances.
- **Health Checks**:
  - Provides operational endpoints: `/health`, `/health/database`, `/health/redis`, and `/health/queue`.

---

## 8. Database Optimization (Indexes)

To prevent full table scans and build blazing fast Lookups, the schema has explicit index parameters:

- `Automation`:
  - `@@index([enabled])`
  - `@@index([instagramAccountId])`
- `AutomationExecution`:
  - `@@index([eventId])`
  - `@@index([automationId])`
  - `@@index([status])`
- `AutomationLog`:
  - `@@index([executionId])`
- `ProcessedEvent`:
  - `@@unique([eventId])` (Unique index)
  - `@@index([instagramAccountId])`
