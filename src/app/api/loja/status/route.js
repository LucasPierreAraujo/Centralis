import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { withAuth } from '../../../../lib/authMiddleware';

async function getHandler(request, { user }) {
  if (!user.lojaId) return NextResponse.json({ status: null });

  try {
    const loja = await prisma.loja.findUnique({
      where: { id: user.lojaId },
      select: {
        status: true,
        plano: true,
        planoExpiraEm: true,
        trialAtivadoEm: true,
        nome: true,
        logoUrl: true,
        oriente: true,
        endereco: true,
      }
    });

    if (!loja) return NextResponse.json({ status: null });

    const agora = new Date();
    let diasRestantes = null;
    let horasTrialRestantes = null;

    if (loja.status === 'TRIAL' && loja.trialAtivadoEm) {
      const horasDecorridas = (agora - new Date(loja.trialAtivadoEm)) / (1000 * 60 * 60);
      horasTrialRestantes = Math.max(0, 48 - horasDecorridas);
    }

    if (loja.status === 'ATIVA' && loja.planoExpiraEm) {
      const msRestantes = new Date(loja.planoExpiraEm) - agora;
      diasRestantes = Math.max(0, Math.ceil(msRestantes / (1000 * 60 * 60 * 24)));
    }

    return NextResponse.json({
      ...loja,
      diasRestantes,
      horasTrialRestantes,
    });
  } catch (error) {
    console.error('[LOJA/STATUS]', error);
    return NextResponse.json({ status: null });
  }
}

export const GET = withAuth(getHandler);
