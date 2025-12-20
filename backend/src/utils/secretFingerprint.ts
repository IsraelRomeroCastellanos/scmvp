import crypto from 'crypto';

export function secretFingerprint(secret: string) {
  return crypto.createHash('sha256').update(secret).digest('hex').slice(0, 8);
}
