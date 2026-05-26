import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { withAuth } from '../../../lib/authMiddleware';

async function getHandler(request, { user }) {
  const { searchParams } = new URL(request.url);
  const chave = searchParams.get('chave');
  const lojaId = user.lojaId;
  try {
    if (chave) {
      const config = await prisma.configuracaoGeral.findUnique({
        where: { chave_lojaId: { chave, lojaId } }
      });
      return NextResponse.json({ valor: config?.valor || null });
    }
    const configs = await prisma.configuracaoGeral.findMany({ where: { lojaId } });
    return NextResponse.json(configs);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function postHandler(request, { user }) {
  const { chave, valor } = await request.json();
  const lojaId = user.lojaId;
  try {
    const config = await prisma.configuracaoGeral.upsert({
      where: { chave_lojaId: { chave, lojaId } },
      update: { valor },
      create: { chave, valor, lojaId },
    });
    return NextResponse.json({ success: true, config });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
