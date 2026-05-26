import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { verificarAdmin } from '../auth/route';

const DIAS_POR_PLANO = {
  MENSAL: 30,
  QUINZENAL: 15,
  ANUAL: 365,
  DEFINITIVO: null,
};

// GET — listar todas as lojas
export async function GET(request) {
  const admin = await verificarAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  try {
    const lojas = await prisma.loja.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        users: { select: { id: true, username: true, role: true } }
      }
    });

    // Enriquecer com info de expiração
    const agora = new Date();
    const lojasEnriquecidas = lojas.map(l => {
      let diasRestantes = null;
      let statusCalculado = l.status;

      if (l.status === 'TRIAL' && l.trialAtivadoEm) {
        const horasDecorridas = (agora - new Date(l.trialAtivadoEm)) / (1000 * 60 * 60);
        diasRestantes = Math.max(0, Math.ceil((48 - horasDecorridas) / 24 * 100) / 100);
        if (horasDecorridas > 48) statusCalculado = 'TRIAL_EXPIRADO';
      }

      if (l.status === 'ATIVA' && l.planoExpiraEm) {
        const msRestantes = new Date(l.planoExpiraEm) - agora;
        diasRestantes = Math.max(0, Math.ceil(msRestantes / (1000 * 60 * 60 * 24)));
        if (msRestantes <= 0) statusCalculado = 'EXPIRADA';
      }

      return { ...l, diasRestantes, statusCalculado };
    });

    return NextResponse.json(lojasEnriquecidas);
  } catch (error) {
    console.error('[ADMIN/LOJAS GET]', error);
    return NextResponse.json({ error: 'Erro ao buscar lojas.' }, { status: 500 });
  }
}

// PUT — atualizar loja (ativar, mudar plano, suspender, editar dados)
export async function PUT(request) {
  const admin = await verificarAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  try {
    const body = await request.json();
    const { id, acao, plano, nome, endereco, oriente, emailVeneravel } = body;

    if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 });

    const loja = await prisma.loja.findUnique({ where: { id } });
    if (!loja) return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });

    let updateData = {};

    if (acao === 'ATIVAR') {
      if (!plano || !DIAS_POR_PLANO.hasOwnProperty(plano)) {
        return NextResponse.json({ error: 'Plano inválido. Use MENSAL, QUINZENAL, ANUAL ou DEFINITIVO.' }, { status: 400 });
      }
      const agora = new Date();
      const dias = DIAS_POR_PLANO[plano];
      const expiraEm = dias ? new Date(agora.getTime() + dias * 24 * 60 * 60 * 1000) : null;

      updateData = {
        status: 'ATIVA',
        plano,
        planoAtivadoEm: agora,
        planoExpiraEm: expiraEm,
      };

    } else if (acao === 'MUDAR_PLANO') {
      if (!plano || !DIAS_POR_PLANO.hasOwnProperty(plano)) {
        return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 });
      }
      const agora = new Date();
      const dias = DIAS_POR_PLANO[plano];
      const expiraEm = dias ? new Date(agora.getTime() + dias * 24 * 60 * 60 * 1000) : null;
      updateData = { plano, planoAtivadoEm: agora, planoExpiraEm: expiraEm, status: 'ATIVA' };

    } else if (acao === 'SUSPENDER') {
      updateData = { status: 'SUSPENSA' };

    } else if (acao === 'REATIVAR') {
      // Reativa com o plano atual se ainda válido, senão mantém ATIVA sem plano para renegociação
      updateData = { status: 'ATIVA' };

    } else if (acao === 'EDITAR') {
      if (nome) updateData.nome = nome;
      if (endereco !== undefined) updateData.endereco = endereco;
      if (oriente !== undefined) updateData.oriente = oriente;
      if (emailVeneravel) updateData.emailVeneravel = emailVeneravel;

    } else {
      return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
    }

    const lojaAtualizada = await prisma.loja.update({ where: { id }, data: updateData });
    return NextResponse.json({ success: true, loja: lojaAtualizada });
  } catch (error) {
    console.error('[ADMIN/LOJAS PUT]', error);
    return NextResponse.json({ error: 'Erro ao atualizar loja.' }, { status: 500 });
  }
}
