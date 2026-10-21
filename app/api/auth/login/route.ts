import { NextRequest, NextResponse } from 'next/server';
import {
  createSession,
  validateEmployeePassword,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from '@/lib/auth/session';
import {
  getClientIpKey,
  checkLoginRateLimit,
  recordFailedLoginAttempt,
  resetLoginAttempts,
} from '@/lib/auth/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ipKey = getClientIpKey(req);

    // 1. Check rate limit
    const rateLimit = await checkLoginRateLimit(ipKey);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        {
          status: 429,
          headers: rateLimit.retryAfterSeconds
            ? { 'Retry-After': String(rateLimit.retryAfterSeconds) }
            : undefined,
        }
      );
    }

    // 2. Parse request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const password =
      body && typeof body === 'object' && 'password' in body
        ? String((body as { password: unknown }).password)
        : '';

    // 3. Validate password using constant-time check
    const isValid = validateEmployeePassword(password);
    if (!isValid) {
      await recordFailedLoginAttempt(ipKey);
      // Generic error message without revealing whether password was partially correct
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // 4. Successful login: clear failed attempts
    await resetLoginAttempts(ipKey);

    // 5. Create new session token and store hash in DB
    const { token, expiresAt } = await createSession();

    // 6. Set secure HttpOnly cookie
    const isProduction = process.env.NODE_ENV === 'production';
    const response = NextResponse.json(
      { ok: true, message: 'Authenticated successfully' },
      { status: 200 }
    );

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
