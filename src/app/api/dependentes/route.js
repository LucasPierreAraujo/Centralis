// app/api/dependentes/route.js

import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { withAuth, withPermission } from '../../../lib/authMiddleware';

// ====================================================================
// GET - Listar dependentes (pode filtrar por membroId)
// ====================================================================
async function getHandler(request, { user }) {
  const { searchParams } = new URL(request.url);
  const membroId = searchParams.get('membroId');

  try {
    const whereClause = membroId ? { membroId } : {};

    const dependentes = await prisma.dependente.findMany({
      where: whereClause,
      include: {
        membro: {
          select: {
            id: true,
            nome: true,
            grau: true
          }
        }
      },
      orderBy: [
        { membroId: 'asc' },
        { tipoDependente: 'asc' },
        { nome: 'asc' }
      ]
    });

    return NextResponse.json(dependentes);

  } catch (error) {
    console.error('Erro ao buscar dependentes:', error);
    return NextResponse.json({ error: 'Erro ao buscar dependentes' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);


// ====================================================================
// POST - Criar novo dependente (requer permissão 'membros')
// ====================================================================
async function postHandler(request, { user }) {
  try {
    const body = await request.json();

    if (!body.membroId || !body.tipoDependente || !body.nome) {
      return NextResponse.json(
        { error: 'Campos obrigatórios (membroId, tipoDependente, nome) estão faltando.' },
        { status: 400 }
      );
    }

    // Validar tipo de dependente
    const tiposValidos = ['ESPOSA', 'MARIDO', 'FILHO', 'FILHA'];
    if (!tiposValidos.includes(body.tipoDependente)) {
      return NextResponse.json(
        { error: 'Tipo de dependente inválido. Use: ESPOSA, MARIDO, FILHO ou FILHA.' },
        { status: 400 }
      );
    }

    // Verificar se o membro existe
    const membro = await prisma.membro.findUnique({
      where: { id: body.membroId }
    });

    if (!membro) {
      return NextResponse.json(
        { error: 'Membro não encontrado.' },
        { status: 404 }
      );
    }

    // Verificar se já existe cônjuge para este membro (apenas um permitido)
    if (['ESPOSA', 'MARIDO'].includes(body.tipoDependente)) {
      const conjugeExistente = await prisma.dependente.findFirst({
        where: {
          membroId: body.membroId,
          tipoDependente: { in: ['ESPOSA', 'MARIDO'] }
        }
      });

      if (conjugeExistente) {
        return NextResponse.json(
          { error: 'Este membro já possui um cônjuge cadastrado.' },
          { status: 400 }
        );
      }
    }

    const novoDependente = await prisma.dependente.create({
      data: {
        membroId: body.membroId,
        tipoDependente: body.tipoDependente,
        nome: body.nome,
        dataNascimento: body.dataNascimento || null,
        dataCasamento: body.dataCasamento || null
      },
      include: {
        membro: {
          select: {
            id: true,
            nome: true,
            grau: true
          }
        }
      }
    });

    return NextResponse.json({ success: true, dependente: novoDependente }, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar dependente:', error);
    return NextResponse.json(
      { error: 'Erro ao criar dependente', details: error.message },
      { status: 500 }
    );
  }
}

export const POST = withPermission('membros')(postHandler);


// ====================================================================
// PUT - Atualizar dependente (requer permissão 'membros')
// ====================================================================
async function putHandler(request, { user }) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID do dependente é obrigatório para atualização' },
        { status: 400 }
      );
    }

    // Validar tipo de dependente se fornecido
    if (updateData.tipoDependente) {
      const tiposValidos = ['ESPOSA', 'MARIDO', 'FILHO', 'FILHA'];
      if (!tiposValidos.includes(updateData.tipoDependente)) {
        return NextResponse.json(
          { error: 'Tipo de dependente inválido. Use: ESPOSA, MARIDO, FILHO ou FILHA.' },
          { status: 400 }
        );
      }
    }

    const dependenteAtualizado = await prisma.dependente.update({
      where: { id },
      data: {
        tipoDependente: updateData.tipoDependente,
        nome: updateData.nome,
        dataNascimento: updateData.dataNascimento || null,
        dataCasamento: updateData.dataCasamento || null
      },
      include: {
        membro: {
          select: {
            id: true,
            nome: true,
            grau: true
          }
        }
      }
    });

    return NextResponse.json({ success: true, dependente: dependenteAtualizado });

  } catch (error) {
    console.error('Erro ao atualizar dependente:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar dependente', details: error.message },
      { status: 500 }
    );
  }
}

export const PUT = withPermission('membros')(putHandler);


// ====================================================================
// DELETE - Excluir dependente (requer permissão 'membros')
// ====================================================================
async function deleteHandler(request, { user }) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID do dependente é obrigatório para exclusão' },
        { status: 400 }
      );
    }

    await prisma.dependente.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Dependente excluído com sucesso' });

  } catch (error) {
    console.error('Erro ao excluir dependente:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir dependente', details: error.message },
      { status: 500 }
    );
  }
}

export const DELETE = withPermission('membros')(deleteHandler);
