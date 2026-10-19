import 'server-only';
import { cookies } from 'next/headers';
import { getSessionFromToken, sessionCookieName } from './auth';

export async function getBuyerSession() {
  const cookieStore = await cookies();
  const session = getSessionFromToken(cookieStore.get(sessionCookieName)?.value);
  return session?.role === 'buyer' ? session : null;
}
