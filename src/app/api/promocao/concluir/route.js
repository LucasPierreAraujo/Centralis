import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { withAuth } from '../../../../lib/authMiddleware';

async function postHandler(request, { user }) {
  try {
    const { registroId, dataPassagem } = await request.json();

    if (!registroId) {
      return NextResponse.json({ error: 'registroId é obrigatório' }, { status: 400 });
    }

    const registro = await prisma.promocaoElevacao.findFirst({ where: { id: registroId, lojaId: user.lojaId } });
    if (!registro) {
      return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });
    }

    const novoGrau = registro.tipo === 'ELEVACAO' ? 'MESTRE' : 'COMPANHEIRO';
    const campoData = registro.tipo === 'ELEVACAO' ? 'dataElevacao' : 'dataPassagemGrau';

    await prisma.membro.update({
      where: { id: registro.membroId },
      data: {
        grau: novoGrau,
        [campoData]: dataPassagem || null,
      },
    });

    return NextResponse.json({ success: true, novoGrau });
  } catch (error) {
    console.error('Erro ao concluir promoção:', error);
    return NextResponse.json({ error: 'Erro ao concluir promoção', details: error.message }, { status: 500 });
  }
}

export const POST = withAuth(postHandler);
