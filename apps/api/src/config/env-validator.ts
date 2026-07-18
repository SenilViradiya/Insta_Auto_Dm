import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

export function loadEnvFiles() {
  const possiblePaths = [
    // from dist/config/env-validator.js up to root
    path.join(__dirname, '../../../../.env.local'),
    path.join(__dirname, '../../../../.env'),
    // from src/config/env-validator.ts up to root
    path.join(__dirname, '../../../.env.local'),
    path.join(__dirname, '../../../.env'),
    // from api folder
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../../.env.local'),
    path.resolve(process.cwd(), '../../.env'),
  ];

  const loadedFiles = new Set<string>();
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath) && !loadedFiles.has(envPath)) {
      loadedFiles.add(envPath);
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

const envSchema = z
  .object({
    DATABASE_URL: z
      .string()
      .url('DATABASE_URL must be a valid PostgreSQL connection URL'),
    TOKEN_ENCRYPTION_KEY: z
      .string()
      .length(
        32,
        'TOKEN_ENCRYPTION_KEY must be exactly 32 characters long for AES-256',
      ),
    META_APP_ID: z.string().min(1, 'META_APP_ID is required'),
    META_APP_SECRET: z.string().min(1, 'META_APP_SECRET is required'),
    INSTAGRAM_APP_ID: z.string().min(1, 'INSTAGRAM_APP_ID is required'),
    INSTAGRAM_APP_SECRET: z.string().min(1, 'INSTAGRAM_APP_SECRET is required'),
    META_REDIRECT_URI: z.string().url('META_REDIRECT_URI must be a valid URL'),
    META_VERIFY_TOKEN: z.string().min(1, 'META_VERIFY_TOKEN is required'),
  })
  .and(
    z.union([
      z.object({
        REDIS_URL: z
          .string()
          .url(
            'REDIS_URL must be a valid Redis connection URL (e.g. redis:// or rediss://)',
          ),
      }),
      z.object({
        REDIS_HOST: z
          .string()
          .min(1, 'REDIS_HOST is required when REDIS_URL is not provided'),
        REDIS_PORT: z.preprocess(
          (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
          z
            .number({ invalid_type_error: 'REDIS_PORT must be a valid number' })
            .int()
            .positive(),
        ),
      }),
    ]),
  );

export function validateConfig() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error(
      '\n==========================================================',
    );
    console.error(
      'CONFIGURATION ERROR: INVALID OR MISSING ENVIRONMENT VARIABLES',
    );
    console.error('==========================================================');
    result.error.errors.forEach((err) => {
      console.error(`- ${err.path.join('.') || 'Global'}: ${err.message}`);
    });
    console.error(
      '==========================================================\n',
    );
    process.exit(1);
  }
}
