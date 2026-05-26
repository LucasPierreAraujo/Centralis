// app/api/usuarios/route.js
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * Middleware de permissão para ADMIN e VENERAVEL
 * Somente ADMIN e VENERAVEL podem gerenciar usuários
 */
async function checkAdminPermission() {
  const { cookies } = await import('next/headers');
  const { verifyToken } = await import('../../../lib/auth');

  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    return { authorized: false, error: 'Não autenticado' };
  }

  const payload = await verifyToken(token);

  if (!payload || (payload.role !== 'ADMIN' && payload.role !== 'VENERAVEL')) {
    return { authorized: false, error: 'Apenas administradores e veneráveis podem gerenciar usuários' };
  }

  return { authorized: true, user: payload };
}

// Permissões válidas
const VALID_PERMISSIONS = ['membros', 'atas', 'presencas', 'recibo', 'financeiro', 'mensalidades', 'alertas'];

// GET - Listar todos os usuários
export async function GET() {
  try {
    const authCheck = await checkAdminPermission();

    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 });
    }

    const lojaId = authCheck.user.lojaId || null;
    const usuarios = await prisma.user.findMany({
      where: {
        lojaId,
        username: { not: 'AdminSabedoria' }
      },
      select: {
        id: true,
        username: true,
        role: true,
        permissions: true,
        grau: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(usuarios);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 });
  }
}

// POST - Criar novo usuário
export async function POST(request) {
  try {
    const authCheck = await checkAdminPermission();

    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 });
    }

    const { username, password, permissions, grau } = await request.json();

    // Validações
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username e senha são obrigatórios' },
        { status: 400 }
      );
    }

    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
      return NextResponse.json(
        { error: 'Selecione pelo menos uma permissão' },
        { status: 400 }
      );
    }

    // Validar permissões
    const invalidPermissions = permissions.filter(p => !VALID_PERMISSIONS.includes(p));
    if (invalidPermissions.length > 0) {
      return NextResponse.json(
        { error: `Permissões inválidas: ${invalidPermissions.join(', ')}` },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Senha deve ter no mínimo 8 caracteres' },
        { status: 400 }
      );
    }

    // Verificar se username já existe
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Nome de usuário já existe' },
        { status: 400 }
      );
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12);

    // Determinar role baseado nas permissões (para compatibilidade)
    const temSecretaria = permissions.some(p => ['membros', 'atas', 'presencas'].includes(p));
    const temTesouraria = permissions.some(p => ['recibo', 'financeiro', 'mensalidades'].includes(p));

    let role = 'SECRETARIO'; // Default
    if (temTesouraria && !temSecretaria) {
      role = 'TESOUREIRO';
    } else if (temSecretaria && temTesouraria) {
      role = 'SECRETARIO'; // Ambos = usa secretario como base
    }

    const lojaId = authCheck.user.lojaId || null;

    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role,
        permissions,
        grau: grau || null,
        lojaId,
      },
      select: {
        id: true,
        username: true,
        role: true,
        permissions: true,
        grau: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Usuário criado com sucesso',
      user: newUser
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 });
  }
}

// PUT - Atualizar usuário
export async function PUT(request) {
  try {
    const authCheck = await checkAdminPermission();

    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 });
    }

    const { id, username, password, permissions, grau } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 });
    }

    // Verificar se está tentando editar o AdminSabedoria ou Veneravel
    const userToEdit = await prisma.user.findUnique({
      where: { id }
    });

    // Não permitir editar o AdminSabedoria
    if (userToEdit?.username === 'AdminSabedoria') {
      return NextResponse.json(
        { error: 'Este usuário não pode ser editado' },
        { status: 403 }
      );
    }

    // VENERAVEL não pode editar usuários ADMIN
    if (authCheck.user.role === 'VENERAVEL' && userToEdit?.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Você não tem permissão para editar este usuário' },
        { status: 403 }
      );
    }

    // Dados para atualizar
    const updateData = {};

    if (username) {
      // Verificar se novo username já existe (em outro usuário)
      const existingUser = await prisma.user.findUnique({
        where: { username }
      });

      if (existingUser && existingUser.id !== id) {
        return NextResponse.json(
          { error: 'Nome de usuário já existe' },
          { status: 400 }
        );
      }

      updateData.username = username;
    }

    if (password) {
      if (password.length < 8) {
        return NextResponse.json(
          { error: 'Senha deve ter no mínimo 8 caracteres' },
          { status: 400 }
        );
      }
      updateData.password = await bcrypt.hash(password, 12);
    }

    if (permissions && Array.isArray(permissions)) {
      if (permissions.length === 0) {
        return NextResponse.json(
          { error: 'Selecione pelo menos uma permissão' },
          { status: 400 }
        );
      }

      // Validar permissões
      const invalidPermissions = permissions.filter(p => !VALID_PERMISSIONS.includes(p));
      if (invalidPermissions.length > 0) {
        return NextResponse.json(
          { error: `Permissões inválidas: ${invalidPermissions.join(', ')}` },
          { status: 400 }
        );
      }

      updateData.permissions = permissions;

      // Atualizar role baseado nas permissões
      const temSecretaria = permissions.some(p => ['membros', 'atas', 'presencas'].includes(p));
      const temTesouraria = permissions.some(p => ['recibo', 'financeiro', 'mensalidades'].includes(p));

      if (temTesouraria && !temSecretaria) {
        updateData.role = 'TESOUREIRO';
      } else {
        updateData.role = 'SECRETARIO';
      }
    }

    // Atualizar grau se fornecido
    if (grau !== undefined) {
      updateData.grau = grau || null;
    }

    // Atualizar usuário
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        role: true,
        permissions: true,
        grau: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      user: updatedUser
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json({ error: 'Erro ao atualizar usuário' }, { status: 500 });
  }
}

// DELETE - Excluir usuário
export async function DELETE(request) {
  try {
    const authCheck = await checkAdminPermission();

    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 });
    }

    // Verificar usuário a ser excluído
    const userToDelete = await prisma.user.findUnique({
      where: { id }
    });

    // Não permitir excluir o AdminSabedoria
    if (userToDelete?.username === 'AdminSabedoria') {
      return NextResponse.json(
        { error: 'Este usuário não pode ser excluído' },
        { status: 403 }
      );
    }

    // VENERAVEL não pode excluir usuários ADMIN
    if (authCheck.user.role === 'VENERAVEL' && userToDelete?.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Você não tem permissão para excluir este usuário' },
        { status: 403 }
      );
    }

    // Não permitir excluir a si mesmo
    if (userToDelete?.username === authCheck.user.username) {
      return NextResponse.json(
        { error: 'Você não pode excluir sua própria conta' },
        { status: 400 }
      );
    }

    // Excluir usuário
    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Usuário excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    return NextResponse.json({ error: 'Erro ao excluir usuário' }, { status: 500 });
  }
}
