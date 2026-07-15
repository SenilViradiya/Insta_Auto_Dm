import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const possiblePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '../../.env'),
    path.resolve(process.cwd(), '../../.env.local'),
  ];
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const index = trimmed.indexOf('=');
        if (index > 0) {
          const key = trimmed.substring(0, index).trim();
          let val = trimmed.substring(index + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.substring(1, val.length - 1);
          }
          if (process.env[key] === undefined) {
            process.env[key] = val;
          }
        }
      });
    }
  }
}

async function run() {
  loadEnv();
  const prisma = new PrismaClient();

  console.log('--- Migration: publicReply to Explicit Actions ---');

  const automations = await prisma.automation.findMany({
    include: {
      actions: true,
    },
  });

  let migratedCount = 0;
  for (const auto of automations) {
    const config = auto.triggerConfig as any;
    if (config && config.publicReply) {
      // Check if it already has a REPLY_COMMENT action
      const hasReplyComment = auto.actions.some(
        (act) => act.actionType === 'REPLY_COMMENT',
      );
      if (!hasReplyComment) {
        // Create a new Reply Comment action
        await prisma.automationAction.create({
          data: {
            automationId: auto.id,
            actionType: 'REPLY_COMMENT',
            payload: {
              data: {
                text: config.publicReply,
              },
            },
          },
        });
        migratedCount++;
        console.log(
          `Migrated automation ${auto.id} (${auto.name}): set REPLY_COMMENT action to "${config.publicReply}"`,
        );
      }
    }
  }

  console.log(
    `Migration finished. Total automations updated: ${migratedCount}`,
  );
  await prisma.$disconnect();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
