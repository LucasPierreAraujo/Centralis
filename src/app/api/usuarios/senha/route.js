// app/api/usuarios/senha/route.js
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * Verifica se o usuário está autenticado e é ADMIN ou VENERAVEL
 */
async function checkAuth() {
  const { cookies } = await import('next/headers');
  const { verifyToken } = await import('../../../../lib/auth');

  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    return { authorized: false, error: 'Não autenticado' };
  }

  const payload = await verifyToken(token);

  if (!payload || (payload.role !== 'ADMIN' && payload.role !== 'VENERAVEL')) {
    return { authorized: false, error: 'Sem permissão' };
  }

  return { authorized: true, user: payload };
}

// PUT - Alterar apenas a senha
export async function PUT(request) {
  try {
    const authCheck = await checkAuth();

    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 });
    }

    const { id, password } = await request.json();

    if (!id || !password) {
      return NextResponse.json({ error: 'ID e senha são obrigatórios' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Senha deve ter no mínimo 8 caracteres' },
        { status: 400 }
      );
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // VENERAVEL só pode alterar a própria senha
    if (authCheck.user.role === 'VENERAVEL' && user.username !== authCheck.user.username) {
      return NextResponse.json(
        { error: 'Você só pode alterar sua própria senha' },
        { status: 403 }
      );
    }

    // Não permitir alterar senha do AdminSabedoria (apenas o próprio ADMIN pode)
    if (user.username === 'AdminSabedoria' && authCheck.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Sem permissão para alterar este usuário' },
        { status: 403 }
      );
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(password, 12);

    // Atualizar senha
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });

    return NextResponse.json({
      success: true,
      message: 'Senha alterada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    return NextResponse.json({ error: 'Erro ao alterar senha' }, { status: 500 });
  }
}
