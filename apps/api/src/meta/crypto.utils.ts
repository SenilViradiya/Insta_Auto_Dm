import * as crypto from 'crypto';

export function encryptToken(token: string, secretKey: string): string {
  if (!secretKey) {
    throw new Error('Encryption key not provided');
  }
  const key = Buffer.alloc(32);
  key.write(secretKey, 'utf-8');

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return `${iv.toString('hex')}:${encrypted}`;
}

export function decryptToken(encryptedData: string, secretKey: string): string {
  if (!secretKey) {
    throw new Error('Encryption key not provided');
  }
  const parts = encryptedData.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted token format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];

  const key = Buffer.alloc(32);
  key.write(secretKey, 'utf-8');

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf-8');

  return decrypted;
}
