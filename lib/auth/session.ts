import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

import {
  SESSION_COOKIE_NAME,
  SESSION_EXPIRY_DAYS,
  SESSION_MAX_AGE_SECONDS,
} from './constants';

export { SESSION_COOKIE_NAME, SESSION_EXPIRY_DAYS, SESSION_MAX_AGE_SECONDS };

/**
 * SHA-256 hash a raw session token to ensure raw tokens are never persisted in the database.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Validates the employee password using timing-safe comparison.
 * Never throws or logs the password.
 */
export function validateEmployeePassword(candidate: string): boolean {
  const configuredPassword = process.env.EMPLOYEE_PANEL_PASSWORD;
  if (!configuredPassword || typeof candidate !== 'string') {
    return false;
  }

  const candidateBuffer = Buffer.from(candidate);
  const targetBuffer = Buffer.from(configuredPassword);

  if (candidateBuffer.length !== targetBuffer.length) {
    // Constant time dummy check to prevent length-based early exit timing attacks
    crypto.timingSafeEqual(candidateBuffer, candidateBuffer);
    return false;
  }

  return crypto.timingSafeEqual(candidateBuffer, targetBuffer);
}

/**
 * Creates a cryptographically random session token, stores its hash in PostgreSQL,
 * and returns the raw token to set in the cookie.
 */
export async function createSession(): Promise<{ token: string; expiresAt: Date }> {
  // 32 cryptographically random bytes = 64 hex characters
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  // Periodically clean expired sessions
  try {
    await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  } catch {
    // Non-fatal cleanup failure
  }

  await prisma.session.create({
    data: {
      tokenHash,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

/**
 * Verifies if the session token is valid and not expired.
 */
export async function verifySessionToken(token: string | null | undefined): Promise<boolean> {
  if (!token || typeof token !== 'string' || token.length < 32) {
    return false;
  }

  try {
    const tokenHash = hashToken(token);
    const session = await prisma.session.findUnique({
      where: { tokenHash },
    });

    if (!session) {
      return false;
    }

    if (session.expiresAt < new Date()) {
      // Remove expired session asynchronously
      prisma.session.delete({ where: { tokenHash } }).catch(() => {});
      return false;
    }

    return true;
  } catch (err) {
    console.error('Session verification database error:', err);
    return false;
  }
}

/**
 * Revokes a session by deleting it from the database.
 */
export async function revokeSessionToken(token: string | null | undefined): Promise<void> {
  if (!token) return;
  try {
    const tokenHash = hashToken(token);
    await prisma.session.deleteMany({
      where: { tokenHash },
    });
  } catch (err) {
    console.error('Session revocation error:', err);
  }
}

/**
 * Helper to check current session from cookies in Route Handlers or Server Components.
 */
export async function getSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    return await verifySessionToken(token);
  } catch {
    return false;
  }
}

/**
 * Validates request origin to protect cookie-authenticated write endpoints from CSRF.
 */
export function validateCsrfOrigin(req: Request): boolean {
  // Only state-changing methods require CSRF validation
  const method = req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true;
  }

  const origin = req.headers.get('origin');
  const host = req.headers.get('host');

  // If no origin header is present (e.g. some same-origin non-browser requests),
  // check sec-fetch-site or referer
  if (!origin) {
    const referer = req.headers.get('referer');
    if (!referer) {
      // Direct API calls or tools without origin; allow if same host or strictly check
      return true;
    }
    try {
      const refUrl = new URL(referer);
      return refUrl.host === host;
    } catch {
      return false;
    }
  }

  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}

/**
 * Server-side guard for protected Route Handlers.
 * Checks both CSRF origin and valid session token.
 */
export async function authenticateEmployee(req: Request): Promise<{ authorized: boolean; response?: NextResponse }> {
  // 1. CSRF validation for write operations
  if (!validateCsrfOrigin(req)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Forbidden: Invalid request origin' },
        { status: 403 }
      ),
    };
  }

  // 2. Extract session token from cookie
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|; )${SESSION_COOKIE_NAME}=([^;]*)`));
  const token = match ? decodeURIComponent(match[1]) : null;

  const valid = await verifySessionToken(token);
  if (!valid) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized: Employee session required' },
        { status: 401 }
      ),
    };
  }

  return { authorized: true };
}
