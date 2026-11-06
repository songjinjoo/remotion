import {createHmac, timingSafeEqual} from 'crypto';

const secret = () => process.env.UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || '';

export const hasUnsubscribeSecret = () => secret().length > 0;

export function unsubscribeToken(email: string): string {
  return createHmac('sha256', secret()).update(email.toLowerCase()).digest('hex').slice(0, 32);
}

export function verifyUnsubscribe(email: string, token: string): boolean {
  if (!hasUnsubscribeSecret()) return false;
  const a = Buffer.from(unsubscribeToken(email));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
