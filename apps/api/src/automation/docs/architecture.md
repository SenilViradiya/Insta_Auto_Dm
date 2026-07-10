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
