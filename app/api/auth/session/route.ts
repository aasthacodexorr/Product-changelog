import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const authenticated = await verifySessionToken(token);

    // Return only authenticated status, never credentials, tokens, or hashes
    return NextResponse.json({ authenticated }, { status: 200 });
  } catch (error) {
    console.error('Error checking session:', error);
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
}
