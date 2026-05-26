// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { verifyPassword, createToken } from '../../../../lib/auth';

// Rate limiting simples (em produção, use Redis ou similar)
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutos

function checkRateLimit(ip) {
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || { count: 0, firstAttempt: now };

  // Reset se passou o tempo de lockout
  if (now - attempts.firstAttempt > LOCKOUT_TIME) {
    loginAttempts.delete(ip);
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }

  // Bloqueado se excedeu tentativas
  if (attempts.count >= MAX_ATTEMPTS) {
    const timeLeft = Math.ceil((LOCKOUT_TIME - (now - attempts.firstAttempt)) / 1000 / 60);
    return { allowed: false, timeLeft };
  }

  return { allowed: true, remaining: MAX_ATTEMPTS - attempts.count };
}

function recordAttempt(ip) {
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || { count: 0, firstAttempt: now };
  loginAttempts.set(ip, {
    count: attempts.count + 1,
    firstAttempt: attempts.firstAttempt
  });
}

export async function POST(request) {
  try {
    // Rate limiting baseado em IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimit = checkRateLimit(ip);

    if (!rateLimit.allowed) {
      return NextResponse.json({
        success: false,
        message: `Muitas tentativas de login. Tente novamente em ${rateLimit.timeLeft} minutos.`
      }, { status: 429 });
    }

    const { username, password } = await request.json();

    // Busca usuário no banco
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      recordAttempt(ip);
      return NextResponse.json({
        success: false,
        message: 'Usuário ou senha incorretos'
      }, { status: 401 });
    }
    
    // Verifica a senha
    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      recordAttempt(ip);
      return NextResponse.json({
        success: false,
        message: 'Usuário ou senha incorretos'
      }, { status: 401 });
    }

    // Verificar status da loja (se o usuário pertence a uma loja)
    if (user.lojaId) {
      const loja = await prisma.loja.findUnique({ where: { id: user.lojaId } });
      if (loja) {
        if (loja.status === 'SUSPENSA') {
          return NextResponse.json({ success: false, message: 'Esta loja está suspensa. Entre em contato com o suporte.' }, { status: 403 });
        }
        if (loja.status === 'EXPIRADA') {
          return NextResponse.json({ success: false, message: 'A assinatura desta loja expirou. Entre em contato com o suporte.' }, { status: 403 });
        }
        if (loja.status === 'TRIAL') {
          const horasDecorridas = (Date.now() - new Date(loja.trialAtivadoEm).getTime()) / (1000 * 60 * 60);
          if (horasDecorridas > 48) {
            // Marcar como expirada automaticamente
            await prisma.loja.update({ where: { id: loja.id }, data: { status: 'EXPIRADA' } });
            return NextResponse.json({ success: false, message: 'O período de avaliação de 48 horas expirou. Entre em contato com o suporte para ativar sua loja.' }, { status: 403 });
          }
        }
        if (loja.status === 'ATIVA' && loja.planoExpiraEm && new Date() > loja.planoExpiraEm) {
          await prisma.loja.update({ where: { id: loja.id }, data: { status: 'EXPIRADA' } });
          return NextResponse.json({ success: false, message: 'A assinatura desta loja expirou. Entre em contato com o suporte.' }, { status: 403 });
        }
      }
    }

    // Login bem-sucedido - limpar tentativas
    loginAttempts.delete(ip);

    // Cria token JWT com role, permissões, grau e lojaId
    const token = await createToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions || [],
      grau: user.grau || null,
      lojaId: user.lojaId || null,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso',
      user: {
        username: user.username,
        role: user.role,
        permissions: user.permissions || [],
        grau: user.grau || null,
        lojaId: user.lojaId || null,
      }
    });

    // Define cookie seguro
    response.cookies.set('auth-token', token, {
      httpOnly: true,      // Não acessível via JavaScript
      secure: process.env.NODE_ENV === 'production', // HTTPS em produção
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: '/'
    });

    return response;
    
  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Erro no servidor' 
    }, { status: 500 });
  }
}