import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { withAuth } from '../../../lib/authMiddleware';

async function getHandler(request, { user }) {
  try {
    const config = await prisma.configuracaoEtapas.findFirst({ where: { lojaId: user.lojaId } });
    return NextResponse.json(config ? config.etapas : null);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar configuração', details: error.message }, { status: 500 });
  }
}

async function putHandler(request, { user }) {
  try {
    const { etapas } = await request.json();
    const existing = await prisma.configuracaoEtapas.findFirst({ where: { lojaId: user.lojaId } });
    if (existing) {
      await prisma.configuracaoEtapas.update({ where: { id: existing.id }, data: { etapas } });
    } else {
      await prisma.configuracaoEtapas.create({ data: { etapas, lojaId: user.lojaId } });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao salvar configuração', details: error.message }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const PUT = withAuth(putHandler);
