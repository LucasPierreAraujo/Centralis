// proxy.js
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// JWT_SECRET é obrigatório - não usar fallback
if (!process.env.JWT_SECRET) {
  console.error('ERRO CRÍTICO: JWT_SECRET não definido');
}

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || '');

/**
 * Proxy de autenticação
 * Protege rotas que requerem autenticação
 */
export async function proxy(req) {
  const { pathname } = req.nextUrl;

  // Rotas públicas (não precisam de autenticação)
  const publicPaths = ['/login', '/api/auth/login'];
  const isPublic = publicPaths.some(path => pathname.startsWith(path));

  if (isPublic) {
    return NextResponse.next();
  }

  // Rotas protegidas (precisa estar logado)
  const protectedPaths = ['/dashboard', '/membros', '/recibo', '/financeiro'];
  const isProtected = protectedPaths.some(path => pathname.startsWith(path));

  if (isProtected) {
    const token = req.cookies.get('auth-token')?.value;

    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // Verifica se o token é válido
    try {
      await jwtVerify(token, SECRET_KEY);
      return NextResponse.next();
    } catch (err) {
      console.error('Token inválido:', err.message);
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
       '/((?!_next/static|_next/image|favicon.ico|logo.jpeg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
