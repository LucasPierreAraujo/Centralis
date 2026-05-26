// app/api/auth/me/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '../../../../lib/auth';

export async function GET() {
  try {
    // Next.js 16: cookies() agora retorna uma Promise!
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        username: payload.username,
        role: payload.role || 'ADMIN',
        permissions: payload.permissions || [],
        grau: payload.grau || null
      }
    });
  } catch (err) {
    console.error('Erro ao verificar autenticação:', err);
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
