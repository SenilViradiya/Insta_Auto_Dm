# Monorepo Production Data Readiness & Mock Data Audit Report

This document reports the findings of a comprehensive code-level audit conducted across the monorepo to identify, categorize, and document all remaining mock data, hardcoded placeholders, simulated API responses, and transient state tracking. It provides a detailed rating of production readiness and defines a corrective checklist to prepare the platform for a stable, live release.

---

## 1. Audit Classification Taxonomy

Each identified mock trace is categorized using the following severity level mapping:

- **VULNERABLE (High Criticality):** Simulated behavior that intercepts or completely bypasses backend connectivity, masking structural integration issues, schema mismatches, or security gaps.
- **DEMO FALLBACK (Medium Criticality):** Hardcoded objects or static mock lists injected to simulate enterprise features/metrics when the database is empty or connection fails.
- **UI PLACEHOLDER (Low Criticality):** Visual placeholders or seeded helpers used to calculate dummy indicators (like social metrics) that are not natively supported by backend models or database columns.

---

## 2. Identified Frontend Mock Data & Simulated State

### A. Execution Logs Dashboard

- **File Path:** `apps/web/src/app/executions/page.tsx`
- **Audit Scope:** Verification of simulated timelines, status badges, and direct execution event grids.
- **Identified Mock Items:**
  1.  **`MOCK_EXECUTIONS` Array (Lines 77–181):** A collection of four elaborate mock execution payloads covering different triggers (`REEL_COMMENT`, `POST_COMMENT`, `DIRECT_MESSAGE`, `STORY_REPLY`), timelines, variable arrays, logs, and simulated authorization errors.
  2.  **`showSimulated` State Control (Line 192):** React state variable initialized to `true` with no visible toggler in the header, keeping the GUI locked into simulated visualization.
  3.  **Logs Resolver Interception (Line 273):** The query function `execution-logs` checks if `selectedExecutionId` matches a mock execution. If true, it returns the mock's static logs instead of hitting `GET /executions/:id/logs`.
  4.  **`renderedExecutions` Fallback (Line 296):** Logic that merges live API data with local mocks. If the database response is empty (`items.length === 0`), it automatically falls back to rendering simulated events.
- **Production Readiness Rating:** **❌ 20% (Not Ready)**
- **Impact:** Mask backend controller and network communication issues. An empty database shows populated mock events, misleading operators on execution sync status.

### B. Analytics Dashboard

- **File Path:** `apps/web/src/app/analytics/page.tsx`
- **Audit Scope:** Graph mapping, metric calculation summaries, and performance telemetry plots.
- **Identified Mock Items:**
  1.  **`SIMULATED_METRICS` Object (Lines 119–163):** Hardcoded dashboard metrics, weekly trends, success distributions, and recent timeline records.
  2.  **`showSimulated` Override (Line 167):** Initiates a dashboard demo toggle (defaults to `true`) forcing the UI to display simulated values.
  3.  **Hashed Creator Studio Performance (Lines 320–326 & Lines 377–382):** Top reels views, comments, and engagement totals are generated procedurally by computing a hash value from `instagramMediaId.charCodeAt(i)`.
  4.  **Database Empty Fallback (Line 259):** Falls back to full mock representation when `liveExecs.length === 0`, hiding connection failures under fake data plots.
- **Production Readiness Rating:** **❌ 35% (Not Ready)**
- **Impact:** System telemetry shows fake curves instead of live telemetry, hiding empty production tables. Hashing ids for views/likes restricts live metric collection.

### C. Asset Media Library

- **File Path:** `apps/web/src/components/assets/AssetLibrary.tsx`
- **Audit Scope:** Search features, type tab categorizations, and grid sorting.
- **Identified Mock Items:**
  1.  **`getSeededStats` Helper (Lines 51–60):** Calculates mock `likes`, `comments`, and `views` procedurally using character code offsets from `instagramMediaId`.
  2.  **Mock Sorting (Lines 157–162):** Sorting media by LIKES or COMMENTS sorts them using procedural `getSeededStats` averages, as the database model `InstagramAsset` lacks fields to store likes/comments counts.
- **Production Readiness Rating:** **⚠️ 70% (Partially Ready)**
- **Impact:** Social telemetry indexes (likes, comments, views) on Reels/Posts are estimated procedurally. The database doesn't track these, preventing real-time popularity sorting.

### D. Workspace Health Checks

- **File Path:** `apps/web/src/components/workspace/WorkspaceComponents.tsx`
- **Audit Scope:** Connection status widgets, permission guards, and sync timestamps.
- **Identified Mock Items:**
  1.  **`scopes` Mock Array (Line 243):** Hardcodes five specific Facebook/Instagram Graph API scopes as approved/active:
      - `instagram_manage_messages`
      - `instagram_manage_comments`
      - `instagram_basic`
      - `pages_messaging`
      - `pages_read_engagement`
  2.  **Mock Checkmarks (Line 282 & Line 382):** Displays a green "Active Token" and "All Sync'd" badge statically without querying Meta's token validation endpoint `/debug_token`.
  3.  **Static Rate Limit Indicator (Line 487):** Hardcodes `0% / 100% Rate Used` without hitting Meta headers or backend cache pools.
- **Production Readiness Rating:** **⚠️ 60% (Partially Ready)**
- **Impact:** Visual confirmation of platform scopes is not real. If an administrator revokes a token permission, the panel keeps showing a healthy green checkmark, causing silent webhook handler failures.

---

## 3. Identified Backend Mock Data & Transient Services

### A. Messaging Metrics Service

- **File Path:** `apps/api/src/modules/messaging/metrics/messaging-metrics.service.ts`
- **Audit Scope:** Tracking telemetry and average message delivery times.
- **Identified Mock Items:**
  1.  **Transient In-Memory Registry (Lines 5–12):** Metrics like `sentCount`, `failedCount`, `retryCount`, `rateLimitHits`, and `durations` are held in memory.
- **Production Readiness Rating:** **⚠️ 55% (Partially Ready)**
- **Impact:** Pod crashes, container recycles, or server scale-downs (common on Render free tiers) reset all telemetry and latency calculations back to 0. Distributed multi-instance setups will show inconsistent metrics.

---

## 4. API Contract & Database Readiness

| Entity                       | DB Backed?                          | Live API Exists?          | Mock Dependency in API Controller? | Status               |
| ---------------------------- | ----------------------------------- | ------------------------- | ---------------------------------- | -------------------- |
| **Instagram Accounts**       | Yes (`InstagramAccount`)            | `GET /meta/status`        | No                                 | **Ready**            |
| **Profile Sync**             | Yes (`InstagramProfile`)            | `GET /profile`            | No                                 | **Ready**            |
| **Asset Metadata**           | Yes (`InstagramAsset`)              | `GET /assets`             | No                                 | **Ready**            |
| **Asset Engagement Stats**   | No                                  | No                        | procedurally generated on frontend | **Gap**              |
| **Automations (CRUD)**       | Yes (`Automation`)                  | `GET /automations`        | No                                 | **Ready**            |
| **Execution Logs**           | Yes (`AutomationExecution` / `Log`) | `GET /executions`         | Yes (intercepted by frontend)      | **Ready**            |
| **Outbound Message History** | Yes (`OutboundMessage`)             | `GET /messaging/messages` | No                                 | **Ready**            |
| **Messaging Metrics**        | Transient                           | `GET /messaging/metrics`  | In-memory only                     | **Rebuild Required** |

---

## 5. Live Stabilization Backlog & Action Plan

To transition the Instagram Automation monorepo into a stable production state, the following implementation plan must be executed:

```
[Phase 1: API Integration] -> [Phase 2: Database Aggregations] -> [Phase 3: Scope Validation] -> [Phase 4: Cleanup & Verification]
```

### Phase 1: Establish Strict Web App Backend Sourcing

1.  **Executions Page (`apps/web/src/app/executions/page.tsx`):**
    - Disable the default simulated state: set `showSimulated` to `false`.
    - Delete the `MOCK_EXECUTIONS` code blocks.
    - Replace timeline and log render functions to consume the response from `GET /executions` and `GET /executions/:id/logs` without fallback mocks.
2.  **Analytics Page (`apps/web/src/app/analytics/page.tsx`):**
    - Set `showSimulated` to `false` by default.
    - Remove `SIMULATED_METRICS`.
    - If database tables are empty, display a clean Empty UI instead of showing mock metrics.

### Phase 2: Compute Live Metrics using Database Aggregations

1.  **Backend Metrics Service (`apps/api/src/modules/messaging/metrics/messaging-metrics.service.ts`):**
    - Replace in-memory variables with database queries.
    - Aggregate metrics using Prisma on the `OutboundMessage` table:
      - `messagesSent` = count where status is `SENT` or `DELIVERED`.
      - `messagesFailed` = count where status is `FAILED`.
      - `averageSendTimeMs` = average duration computed from message lifecycle logs or completion fields.
2.  **Asset Engagement Statistics:**
    - Update `InstagramAsset` Prisma model to store metrics: `likesCount`, `commentsCount`, and `viewsCount`.
    - Revise the asset synchronizer `AssetService` to parse these fields from Meta's `/media` API node during asset sync.
    - Delete the local `getSeededStats` helper on the frontend and sort records by the new database fields.

### Phase 3: Implement Live Authentication & Scope Verification

1.  **Workspace Health Checks (`apps/web/src/components/workspace/WorkspaceComponents.tsx`):**
    - Remove the hardcoded `scopes` checklist.
    - Introduce a backend controller endpoint `/meta/permissions` that queries the Meta Graph API `/me/permissions` node using the decrypted access token.
    - Dynamically render active checks in the workspace UI based on the response.
    - Query/expose actual API rate-limit headers to display true usage status.

### Phase 4: Verification

1.  Verify end-to-end integration by running the NestJS test suite.
2.  Seed the DB with demo records using `pnpm prisma db seed` to test the UI under clean data states.
