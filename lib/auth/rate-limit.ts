import prisma from '@/lib/db/prisma';
import crypto from 'node:crypto';

const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function getClientIpKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || '127.0.0.1';
  // Hash the IP to create a fixed-length key
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

export interface RateLimitCheckResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export async function checkLoginRateLimit(ipKey: string): Promise<RateLimitCheckResult> {
  try {
    const record = await prisma.loginAttempt.findUnique({
      where: { ipKey },
    });

    if (!record) {
      return { allowed: true };
    }

    const now = new Date();

    if (record.lockedUntil && record.lockedUntil > now) {
      const retryAfter = Math.ceil((record.lockedUntil.getTime() - now.getTime()) / 1000);
      return { allowed: false, retryAfterSeconds: retryAfter };
    }

    // If lockout window passed since last attempt, reset
    if (now.getTime() - record.lastAttempt.getTime() > LOCKOUT_WINDOW_MS) {
      await prisma.loginAttempt.update({
        where: { ipKey },
        data: {
          attempts: 0,
          lockedUntil: null,
          lastAttempt: now,
        },
      });
      return { allowed: true };
    }

    return { allowed: true };
  } catch (err) {
    console.error('Error checking rate limit in DB:', err);
    // In case of DB connectivity issue during rate limit check, allow to proceed so auth handles it
    return { allowed: true };
  }
}

export async function recordFailedLoginAttempt(ipKey: string): Promise<void> {
  try {
    const now = new Date();
    const record = await prisma.loginAttempt.findUnique({
      where: { ipKey },
    });

    if (!record) {
      await prisma.loginAttempt.create({
        data: {
          ipKey,
          attempts: 1,
          lastAttempt: now,
        },
      });
      return;
    }

    const isWindowExpired = now.getTime() - record.lastAttempt.getTime() > LOCKOUT_WINDOW_MS;
    const currentAttempts = isWindowExpired ? 1 : record.attempts + 1;
    const lockedUntil =
      currentAttempts >= MAX_ATTEMPTS
        ? new Date(now.getTime() + LOCKOUT_WINDOW_MS)
        : null;

    await prisma.loginAttempt.update({
      where: { ipKey },
      data: {
        attempts: currentAttempts,
        lockedUntil,
        lastAttempt: now,
      },
    });
  } catch (err) {
    console.error('Error recording failed login attempt:', err);
  }
}

export async function resetLoginAttempts(ipKey: string): Promise<void> {
  try {
    await prisma.loginAttempt.deleteMany({
      where: { ipKey },
    });
  } catch (err) {
    console.error('Error resetting login attempts:', err);
  }
}
