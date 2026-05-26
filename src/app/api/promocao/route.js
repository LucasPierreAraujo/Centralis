import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { withAuth } from '../../../lib/authMiddleware';

async function getHandler(request, { user }) {
  try {
    const registros = await prisma.promocaoElevacao.findMany({
      where: { lojaId: user.lojaId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(registros);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar registros', details: error.message }, { status: 500 });
  }
}

async function postHandler(request, { user }) {
  try {
    const { membroId, tipo } = await request.json();
    if (!membroId || !tipo) return NextResponse.json({ error: 'membroId e tipo são obrigatórios' }, { status: 400 });

    const registro = await prisma.promocaoElevacao.create({
      data: { lojaId: user.lojaId, membroId, tipo, status: 'EM_ANDAMENTO', etapas: {} },
    });
    return NextResponse.json({ success: true, registro });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar registro', details: error.message }, { status: 500 });
  }
}

async function putHandler(request, { user }) {
  try {
    const { id, etapas, status } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });

    const registro = await prisma.promocaoElevacao.update({
      where: { id, lojaId: user.lojaId },
      data: {
        ...(etapas !== undefined && { etapas }),
        ...(status !== undefined && { status }),
      },
    });
    return NextResponse.json({ success: true, registro });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar registro', details: error.message }, { status: 500 });
  }
}

async function deleteHandler(request, { user }) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    await prisma.promocaoElevacao.delete({ where: { id, lojaId: user.lojaId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir registro', details: error.message }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
export const PUT = withAuth(putHandler);
export const DELETE = withAuth(deleteHandler);
