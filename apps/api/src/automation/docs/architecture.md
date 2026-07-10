# Automation Engine & Instagram Asset Module Architecture

This document describes the production-grade, highly reliable, and fault-tolerant architecture of the modular Automation Engine and the Instagram Asset Management Module.

---

## 1. Modular Registry Architecture Overview

Our platform is separated into distinct, decoupled domains:
1. **Automation Engine Module**: Manages execution state transitions, trigger strategies, distributed locking, idempotency, and action execution workers.
2. **Instagram Asset Module**: Acts as the single source of truth for all Meta page profile metrics, feed media, carousel items, standard videos, and reels syncing.

```
+------------------+     +-------------------+
|  Workspace Root  |     | Instagram Account |
+------------------+     +-------------------+
        │                          │
        ▼                          ▼
+────────────────────────────────────────────+
|          Instagram Asset Module            |
|                                            |
|   Profile Data       /      Media Sync     |
|   (Followers etc.)   /      (Reels etc.)   |
+────────────────────────────────────────────+
        │
        ▼
+────────────────────────────────────────────+
|             Automation Engine              |
|                                            |
|   Trigger Resolvers  /   Condition Engine  |
|   (DM / Reels etc.)  /   (Queue & actions) |
+────────────────────────────────────────────+
```

---

## 2. Instagram Asset Management Module

The Instagram Asset Module tracks Instagram-specific media and profiles. 

### Synchronization Flow:
```
[ Instagram Account ] 
        │
        ▼ (Decrypt access token using crypto.utils)
[ MetaAssetClient.fetchProfile ]
        │
        ▼ (Upsert InstagramProfile details)
[ MetaAssetClient.fetchMediaList (Cursor page loop) ]
        │
        ▼ (Normalize Graph JSON response structure)
[ Compare & Bulk Upsert into database ]
        │
        ▼ (Archive Missing: mark old syncVersion items isArchived = true)
[ Completed Profile & Asset Sync ]
```

### Database Models

- **InstagramAsset**
  - Unique index: `[instagramAccountId, instagramMediaId]`
  - Fields: `instagramMediaId` (Meta ID), `assetType` (Enum: `REEL`, `POST`, `CAROUSEL`, `VIDEO`, `IMAGE`, `UNKNOWN`), `caption`, `mediaType`, `thumbnailUrl`, `mediaUrl`, `permalink`, `shortCode`, `timestamp` (time posted), `isArchived`, `syncVersion`.
  - Indexes: `[instagramAccountId]`, `[instagramMediaId]`, `[assetType]`, `[timestamp]`
- **InstagramProfile**
  - Unique field: `instagramAccountId`
  - Fields: `username`, `name`, `profilePictureUrl`, `followers`, `following`, `mediaCount`, `biography`, `website`, `lastSyncedAt`.

### REST APIs:
- `POST /assets/sync` - Runs profile and media list sync for an Instagram account.
- `GET /profile` - Retrieves the synced profile details.
- `GET /assets` - Retrieves paginated assets with search/filters (caption, mediaType, assetType, createdAfter, createdBefore).
- `GET /assets/reels` - Short hand for fetching reels.
- `GET /assets/posts` - Short hand for fetching standard feed posts.
- `GET /assets/:id` - Retrieves a specific media asset by database GUID.

---

## 3. Trigger-Driven Automation Engine (V2)

The Automation Engine uses a polymorphic trigger-driven strategy framework. This allows the platform to launch automations from various event sources (Reel Comments, Feed Comments, Direct Messages, Story Replies, Story Mentions, etc.) using a clean, pluggable architecture.

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
                   │
                   ▼
  [ Loop through candidate automations ]
                   │
                   ▼
       TriggerResolver.resolve
                   │
                   ▼
      TriggerRegistry Strategy Match
   (Matches event based on Config properties)
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
     [Matched]         [Not Matched]
         │                   │
         ▼                   ▼
 Evaluate Conditions      Skip Automation
         │
         ▼
  Create Execution (QUEUED State)
         │
         ▼
 Execute Action Pipeline
```

---

## 4. SOLID & Framework Extensibility

* **Open-Closed Principle (OCP)**: Adding new triggers or support for future platform integrations (e.g. WhatsApp / Facebook) requires no modification of existing code. You write a self-contained strategy class conforming to the registry contracts.
* **Single Responsibility Principle (SRP)**: The Asset Module only manages synchronization and asset mapping. The Automation Engine manages processing lifecycles, and webhook events only parse core payload identifiers, avoiding mixed scopes.
* **Liskov Substitution Principle (LSP)**: Any subclass of `TriggerStrategy` integrates cleanly without altering resolution behaviors.
* **Dependency Inversion Principle (DIP)**: Abstract contracts (like `TriggerStrategy`) completely isolate database models from API routing and domain logic orchestration.

---

## 5. Automation Execution Engine & Action Strategy Framework (V2)

With the completion of **Execution Engine V2**, we have established a fully decoupled, production-grade staging pipeline that completely separates **Triggers matching**, **Conditions testing**, and **Actions pipeline execution**.

### Architectural Flow

```
   [ Domain Event ]
          │
          ▼
   [ Trigger Match? ]
          │
          ├──► (Yes) ──► [ Condition Engine ] ──► [ Matched? ]
          │                                            │
          └──► (No) ──► Skip                           ├──► (Yes) ──► Compile ExecutionContext
                                                       │              & Queue to BullMQ (QUEUED)
                                                       └──► (No) ──► Skip
                                                                           │
                                                                           ▼
                                                                  [ Action Worker ]
                                                                           │
                                                                           ▼
                                                                [ ExecutionEngine ]
                                                                           │
                                                                           ▼
                                                                 Resolve ActionStrategy
                                                             (e.g., WAIT, SEND_MESSAGE)
                                                                           │
                                                                           ▼
                                                                  Apply Variable System
                                                                           │
                                                                           ▼
                                                                   Execute Action Step
                                                                  & Transition Logs
```

### Decoupled Sub-Engines

1. **ExecutionContext**: A central data context object holding execution parameters (`executionId`, `workspaceId`, `instagramAccountId`, sender/recipient, resolved templates, metadata), preventing method signatures from passing loose primitives.
2. **Condition Engine**: Functions separately from the triggers. Matches AND and OR logic groups recursively, setting the foundation for future nested criteria groups.
3. **Variable Resolver**: Dynamically compiles templates like `{{user.username}}`, `{{comment.text}}`, `{{reel.caption}}`, and `{{current_time}}` at runtime using context parameters.
4. **Action Strategies**: Each action type implements `ActionStrategy`. Adding other strategies (e.g., `WebhookActionStrategy`, `AddTagActionStrategy`) fits seamlessly into the resolver with zero edits to the core runner.

---

## 6. Planning Future Integrations Without Redesigning the Engine

### A. AI Actions
* To add an `AI_REPLY` action, construct `AiReplyActionStrategy` fulfilling `ActionStrategy`.
* The strategy queries models (e.g. OpenAI / Gemini) using the resolved variable data (e.g., `{{comment.text}}`), and generates a response dynamically before calling `MessagingService`.

### B. Parallel Execution
* Currently, execution steps execute sequentially (`currentIndex + 1`).
* To support parallel forks, the pipeline scheduler in `ExecutionEngine` can inspect step lists to find nodes grouped by a parallel block identifier.
* Instead of enqueuing a single action, the engine compiles a list and enqueues multiple distinct `execute-action` BullMQ jobs for all parallel nodes simultaneously.

### C. Branching & Decision Nodes
* Introduce conditional decision actions that route based on logic outcomes.
* If a step executes a branch action, `ExecutionEngine` evaluates the group condition parameters and determines whether to schedule `nextIndex` or jump path sequences to a specified branch target node.

### D. Human Handoff
* A human handoff request creates a pending wait transition. By mapping status to `WAITING` under a manual lock state (e.g., `PAUSED_FOR_HUMAN`), webhook triggers are temporarily paused.
* When the human resolves the thread, the workspace dashboard triggers an API update that unlocks the execution back to `RUNNING` or `SUCCESS` state.

### E. CRM Integrations
* Integrate CRM events (such as adding leads to Salesforce / HubSpot) using `CrmWebhookActionStrategy`.
* It calls CRM connector modules passing normalized user and tag metadata computed by the Variable system.

### F. Visual Workflow Nodes
* By mapping visual builder nodes directly to `ActionType` and edges to the order database records index list, any flowchart layout compiles straight to the DB schema. No changes to execution runner or queue loaders are required!

