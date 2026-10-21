import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { PanelClient } from './PanelClient';

export const dynamic = 'force-dynamic';

export default async function PanelPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = await verifySessionToken(token);

  if (!isAuthenticated) {
    redirect('/panel/login');
  }

  return <PanelClient />;
}
