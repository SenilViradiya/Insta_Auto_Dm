import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const prisma = new PrismaClient();
  const apiRoot = path.resolve(__dirname, '../..');
  const schemaPath = path.resolve(apiRoot, 'prisma/schema.prisma');
  const migrationsDir = path.resolve(apiRoot, 'prisma/migrations');

  console.log('[deploy-prepare] Checking database health and migrations...');
  console.log(`[deploy-prepare] schemaPath: ${schemaPath}`);
  console.log(`[deploy-prepare] migrationsDir: ${migrationsDir}`);

  try {
    // 1. Check if the _prisma_migrations table exists
    const checkMigrationsTable = (await prisma.$queryRawUnsafe(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = '_prisma_migrations';
    `).catch(() => [])) as any[];
    
    const prismaMigrationsExist = checkMigrationsTable.length > 0;

    // 2. Check if the User table exists
    const checkUserTable = (await prisma.$queryRawUnsafe(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'User';
    `).catch(() => [])) as any[];
    
    const userTableExists = checkUserTable.length > 0;

    // Read all migration directories from filesystem
    const allMigrationNames = fs.existsSync(migrationsDir)
      ? fs.readdirSync(migrationsDir)
          .filter(file => fs.lstatSync(path.join(migrationsDir, file)).isDirectory())
          .sort()
      : [];

    console.log(`[deploy-prepare] Detected filesystem migrations:`, allMigrationNames);

    if (!prismaMigrationsExist && userTableExists) {
      console.log('[deploy-prepare] DATABASE DRIFT DETECTED: "User" table exists but "_prisma_migrations" is missing.');
      console.log('[deploy-prepare] Baselining database by marking all existing migrations as applied...');
      
      // Run prisma migrate resolve for each migration
      for (const migrationName of allMigrationNames) {
        console.log(`[deploy-prepare] Baselining migration: ${migrationName}`);
        try {
          execSync(
            `pnpm exec prisma migrate resolve --applied ${migrationName} --schema="${schemaPath}"`,
            { cwd: apiRoot, stdio: 'inherit' }
          );
        } catch (err: any) {
          console.warn(`[deploy-prepare] Resolve warning for ${migrationName}: ${err.message}`);
        }
      }
    } else if (prismaMigrationsExist) {
      // Find failed migrations (finished_at is null)
      const failedMigrations = (await prisma.$queryRawUnsafe(`
        SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL;
      `).catch(() => [])) as any[];

      if (failedMigrations.length > 0) {
        console.log(`[deploy-prepare] Found ${failedMigrations.length} failed migration(s) in database.`);
        for (const m of failedMigrations) {
          const name = m.migration_name;
          console.log(`[deploy-prepare] Fixing failed migration: ${name}`);
          try {
            execSync(
              `pnpm exec prisma migrate resolve --applied ${name} --schema="${schemaPath}"`,
              { cwd: apiRoot, stdio: 'inherit' }
            );
          } catch (err: any) {
            console.warn(`[deploy-prepare] Resolve warning for ${name}: ${err.message}`);
          }
        }
      } else {
        console.log('[deploy-prepare] No failed migrations found in database.');
      }
    } else {
      console.log('[deploy-prepare] Fresh database environment detected. No baselining needed.');
    }
  } catch (error: any) {
    console.error('[deploy-prepare] Error during database pre-deployment preparation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
