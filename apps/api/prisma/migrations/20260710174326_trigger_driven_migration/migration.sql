-- Step 1: Add new columns to Automation table
ALTER TABLE "Automation" ADD COLUMN IF NOT EXISTS "triggerConfig" JSONB DEFAULT '{}';
ALTER TABLE "Automation" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;

-- Step 2: Temporarily alter 'triggerType' to TEXT to handle conversion easily
ALTER TABLE "Automation" ALTER COLUMN "triggerType" TYPE TEXT USING "triggerType"::text;

-- Step 3: Populate triggerType and triggerConfig from AutomationTrigger records if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'AutomationTrigger') THEN
    UPDATE "Automation" a
    SET 
      "triggerType" = CASE 
        WHEN t."eventType"::text IN ('MESSAGE_RECEIVED', 'KEYWORD_MATCH', 'FIRST_MESSAGE') THEN 'DIRECT_MESSAGE'
        WHEN t."eventType"::text = 'COMMENT_CREATED' THEN 'REEL_COMMENT'
        WHEN t."eventType"::text = 'STORY_MENTION' THEN 'STORY_MENTION'
        ELSE 'DIRECT_MESSAGE'
      END,
      "triggerConfig" = CASE 
        WHEN t."eventType"::text IN ('MESSAGE_RECEIVED', 'KEYWORD_MATCH', 'FIRST_MESSAGE') THEN '{"mode": "ANY_MESSAGE"}'::jsonb
        WHEN t."eventType"::text = 'COMMENT_CREATED' THEN '{"mediaScope": "ALL_REELS", "matchType": "ANY_COMMENT"}'::jsonb
        WHEN t."eventType"::text = 'STORY_MENTION' THEN '{}'::jsonb
        ELSE '{"mode": "ANY_MESSAGE"}'::jsonb
      END
    FROM "AutomationTrigger" t
    WHERE t."automationId" = a.id;
  END IF;
END $$;

-- If there are automations without any AutomationTrigger record
UPDATE "Automation"
SET 
  "triggerType" = COALESCE("triggerType", 'DIRECT_MESSAGE'),
  "triggerConfig" = COALESCE("triggerConfig", '{"mode": "ANY_MESSAGE"}'::jsonb);

-- Step 4: Drop old trigger table and old enum
DROP TABLE IF EXISTS "AutomationTrigger";

-- Step 5: Replace enum TriggerType
ALTER TYPE "TriggerType" RENAME TO "TriggerType_old";

CREATE TYPE "TriggerType" AS ENUM ('DIRECT_MESSAGE', 'REEL_COMMENT', 'POST_COMMENT', 'STORY_REPLY', 'STORY_MENTION');

-- Step 6: Convert triggerType column back from TEXT to TriggerType enum
ALTER TABLE "Automation" ALTER COLUMN "triggerType" TYPE "TriggerType" USING "triggerType"::text::"TriggerType";
ALTER TABLE "Automation" ALTER COLUMN "triggerType" SET DEFAULT 'DIRECT_MESSAGE';

-- Step 7: Clean up old enum
DROP TYPE IF EXISTS "TriggerType_old";
