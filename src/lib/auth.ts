import { cookies, headers } from 'next/headers';
import { verifyToken } from './jwt';
import { db } from './db';

export type SessionUser = {
  id: string;
  role: string;
  email: string;
  name: string;
};

export async function getAuthSession(): Promise<SessionUser | null> {
  let token: string | undefined;

  // 1. Try to get from cookies (Web)
  const cookieStore = await cookies();
  token = cookieStore.get('auth_token')?.value;

  // 2. Try to get from Authorization header (Mobile/API)
  if (!token) {
    const headerList = await headers();
    const authHeader = headerList.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    console.log("getAuthSession: No token found in cookies or headers");
    return null;
  }
  
  try {
    const decoded = verifyToken(token) as any;
    if (!decoded || !decoded.id) {
      console.log("getAuthSession: Token verification failed or ID missing");
      return null;
    }

    // Optional: Verify user still exists and is ACTIVE in DB
    const user = await db.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, email: true, name: true, status: true }
    });

    if (!user) {
      console.log("getAuthSession: User not found in DB for ID:", decoded.id);
      return null;
    }
    
    if (user.status === 'BLOCKED') {
      console.log("getAuthSession: User is BLOCKED:", decoded.id);
      return null;
    }

    return {
      id: user.id,
      role: user.role,
      email: user.email || '',
      name: user.name || '',
    };
  } catch (error) {
    console.error("getAuthSession Catch Error:", error);
    return null;
  }
}

export async function isAdmin() {
  const session = await getAuthSession();
  return session?.role === 'ADMIN';
}

export async function isAgent() {
  const session = await getAuthSession();
  return session?.role === 'AGENT' || session?.role === 'ADMIN';
}

export async function isAuth() {
  const session = await getAuthSession();
  return !!session;
}
