import { NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET);
const ADMIN_USER = 'pierre';
const ADMIN_PASS = '69239632';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (username !== ADMIN_USER || password !== ADMIN_PASS) {
      return NextResponse.json({ success: false, message: 'Credenciais inválidas.' }, { status: 401 });
    }

    const token = await new SignJWT({ isAdmin: true, username: ADMIN_USER })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(SECRET_KEY);

    const response = NextResponse.json({ success: true });
    response.cookies.set('admin-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('[ADMIN/AUTH]', error);
    return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('admin-token', '', { maxAge: 0, path: '/' });
  return response;
}

// Helper exportado para uso nas outras rotas de admin
export async function verificarAdmin(request) {
  const token = request.cookies.get('admin-token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload.isAdmin ? payload : null;
  } catch {
    return null;
  }
}
