import { NextRequest, NextResponse } from 'next/server';
import {
  revokeSessionToken,
  SESSION_COOKIE_NAME,
} from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      await revokeSessionToken(token);
    }

    const response = NextResponse.json({ ok: true, message: 'Logged out successfully' });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  } catch (error) {
    console.error('Error during logout:', error);
    const response = NextResponse.json({ ok: true, message: 'Logged out' });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }
}
