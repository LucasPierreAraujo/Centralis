import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { withAuth } from '../../../../lib/authMiddleware';

async function postHandler(request) {
  try {
    const { candidatoId } = await request.json();

    if (!candidatoId) {
      return NextResponse.json({ error: 'candidatoId é obrigatório' }, { status: 400 });
    }

    const candidato = await prisma.candidato.findUnique({ where: { id: candidatoId } });

    if (!candidato) {
      return NextResponse.json({ error: 'Candidato não encontrado' }, { status: 404 });
    }

    // Usar a data da etapa 9 (cerimônia) como dataIniciacao
    const etapas = candidato.etapas || {};
    const dataIniciacao = etapas['9']?.data || new Date().toISOString().split('T')[0];

    const novoMembro = await prisma.membro.create({
      data: {
        nome: candidato.nome,
        grau: 'APRENDIZ',
        status: 'ATIVO',
        email: candidato.email || null,
        cim: candidato.cim || null,
        dataNascimento: candidato.dataNascimento || null,
        dataIniciacao,
      },
    });

    return NextResponse.json({ success: true, membro: novoMembro });
  } catch (error) {
    console.error('Erro ao promover candidato:', error);
    return NextResponse.json({ error: 'Erro ao promover candidato', details: error.message }, { status: 500 });
  }
}

export const POST = withAuth(postHandler);
