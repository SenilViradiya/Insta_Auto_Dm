# Automation Engine Architecture

This document describes the production-grade, highly reliable, and fault-tolerant architecture of the modular Automation Engine.

---

## 1. Trigger-Driven Architecture (V2)

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
  (e.g., DIRECT_MESSAGE, REEL_COMMENT, etc.)
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

## 2. Trigger Strategy Registry & Resolution

To decouple core execution flow from specific Instagram triggers, candidate automations delegate evaluation to trigger strategy classes.

### The Trigger Framework Flow

1. **TriggerContext**: Contains all metadata required for a strategy to make matching decisions:
   - `automation`: The configuration model instance.
   - `event`: The raw event data payload.
   - `currentTime`: Evaluated timestamp.
   - `workspaceId`: The scope identifier.
2. **TriggerMatchResult**: Contains execution matching findings:
   - `matched`: Boolean indicating if conditions are met.
   - `reason`: Human-readable description of match success or failure.
   - `matchedConditions`: Specific conditions matching (e.g. keywords).
3. **TriggerRegistry**: Registers active strategies during application initialization via NestJS Dependency Injection.
4. **TriggerResolver**: Resolves strategies based on the incoming `TriggerType` in $O(1)$ time containing no switch blocks, throwing an `UnknownTriggerException` if the strategy doesn't exist.

---

## 3. Supported Trigger Strategies

1. **DIRECT_MESSAGE** (`DirectMessageTriggerStrategy`)
   - Matches: Normalizes direct message texts and matches based on mode:
     - `ANY_MESSAGE`: Triggers on all messages.
     - `KEYWORD`: Triggers if text matches a case-insensitive array of keywords.
2. **REEL_COMMENT** (`ReelCommentTriggerStrategy`)
   - Matches:
     - `mediaScope`: `ALL_REELS` or `SPECIFIC_REEL` (matching specific comment event `media_id`).
     - `matchType`: `ANY_COMMENT` or `KEYWORD` (case-insensitive keyword list matching).
3. **POST_COMMENT** (`PostCommentTriggerStrategy`)
   - Matches:
     - `mediaScope`: `ALL_POSTS` or `SPECIFIC_POST` (matching specific comment event `media_id`).
     - `matchType`: `ANY_COMMENT` or `KEYWORD` (case-insensitive keyword list matching).
4. **STORY_REPLY** (`StoryReplyTriggerStrategy`)
   - Matches: Triggered by any story reply matching config scope.
5. **STORY_MENTION** (`StoryMentionTriggerStrategy`)
   - Matches: Triggered by any story mention.

---

## 4. SOLID & Open-Closed Principle Compliance

The Trigger Strategy Framework has been engineered with strict adherence to SOLID design principles:

### A. Open-Closed Principle (OCP)
The system is **open for extension but closed for modification**:
* Adding support for a future trigger (e.g., `WHATSAPP_MESSAGE` or `FACEBOOK_COMMENT`) requires only:
  1. Creating a new strategy class implementing the generic `TriggerStrategy` interface.
  2. Declaring and injecting it as a provider into NestJS.
* Traditional approaches require modifying core dispatchers, switch blocks, and `AutomationService`. Under our strategy framework, the existing `AutomationService` and `TriggerResolver` remain completely untouched.

### B. Single Responsibility Principle (SRP)
* `AutomationService` is only responsible for executing the workflow lifecycle (idempotency checking, locking, enqueuing, and managing status transitions). It knows nothing about keyword parsing, media IDs, or comments.
* Each strategy class is only responsible for declaring and evaluating the match rules for a single trigger type.

### C. Dependency Inversion Principle (DIP)
* `AutomationService` depends on the abstract `TriggerStrategy` interface instead of concrete implementations (`DirectMessageTriggerStrategy`, etc.). All runtime dependencies are inverted and managed via NestJS Dependency Injection.

### D. Liskov Substitution Principle (LSP)
* Any class implementing `TriggerStrategy` can be subbed seamlessly inside the `TriggerResolver` and `AutomationService` without causing unexpected compile errors or runtime failures.

---

## 5. Queue Lifecycle & DLQ Flow

BullMQ coordinates async executions:
- **Attempts**: Dynamic options defaults to 3 attempts with exponential backoff.
- **DLQ**: Transfers permanently failed or unrecoverable items to the `automation-dlq` queue with detailed diagnostics metrics.

---

## 6. Centralized Configuration Layer

Operational parameters (worker concurrency, retry count, slow threshold, etc.) are managed dynamically from the environment.

---

## 7. Database Optimization (Indexes)

To prevent full table scans, structural keys are indexed:
- Autms: `@@index([enabled])`, `@@index([instagramAccountId])`
- Execs: `@@index([eventId])`, `@@index([automationId])`, `@@index([status])`
- Logs: `@@index([executionId])`
- Processed: `@@unique([eventId])`, `@@index([instagramAccountId])`
