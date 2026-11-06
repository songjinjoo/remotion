import {timingSafeEqual} from 'crypto';

/** Admin password via `Authorization: Bearer <ADMIN_PASSWORD>`. Disabled (always false) if unset. */
export function isAdmin(req: Request): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const got = (req.headers.get('authorization') ?? '').replace(/^Bearer /, '');
  const a = Buffer.from(got);
  const b = Buffer.from(pw);
  return a.length === b.length && timingSafeEqual(a, b);
}
