import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(
  process.env.MYNUMBER_ENCRYPTION_KEY || 'default-32-char-key-replace-prod!!',
  'utf8'
).slice(0, 32);

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${authTag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decrypt(encryptedText: string): string {
  const [ivB64, authTagB64, dataB64] = encryptedText.split('.');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
