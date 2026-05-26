import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { withAuth } from '../../../lib/authMiddleware';

async function getHandler(request, { user }) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const candidato = await prisma.candidato.findFirst({ where: { id, lojaId: user.lojaId } });
      if (!candidato) return NextResponse.json({ error: 'Candidato não encontrado' }, { status: 404 });
      return NextResponse.json(candidato);
    }

    const candidatos = await prisma.candidato.findMany({
      where: { lojaId: user.lojaId },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(candidatos);
  } catch (error) {
    console.error('Erro ao buscar candidatos:', error);
    return NextResponse.json({ error: 'Erro ao buscar candidatos', details: error.message }, { status: 500 });
  }
}

async function postHandler(request, { user }) {
  try {
    const { nome, email, telefone, telefoneFixo, dataNascimento, nomeConjuge, enderecoResidencial, enderecoProfissional, grauInstrucao, proponenteIds, proponenteNomes } = await request.json();

    if (!nome) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });

    const candidato = await prisma.candidato.create({
      data: {
        lojaId: user.lojaId,
        nome,
        dataNascimento: dataNascimento || null,
        nomeConjuge: nomeConjuge || null,
        enderecoResidencial: enderecoResidencial || null,
        telefone: telefone || null,
        telefoneFixo: telefoneFixo || null,
        enderecoProfissional: enderecoProfissional || null,
        grauInstrucao: grauInstrucao || null,
        email: email || null,
        proponenteIds: proponenteIds ? JSON.stringify(proponenteIds) : null,
        proponenteNomes: proponenteNomes || null,
        etapaAtual: 1,
        status: 'EM_ANDAMENTO',
        etapas: {}
      }
    });

    return NextResponse.json({ success: true, candidato });
  } catch (error) {
    console.error('Erro ao criar candidato:', error);
    return NextResponse.json({ error: 'Erro ao criar candidato', details: error.message }, { status: 500 });
  }
}

async function putHandler(request, { user }) {
  try {
    const body = await request.json();
    const { id, nome, email, telefone, telefoneFixo, dataNascimento, nomeConjuge, enderecoResidencial, enderecoProfissional, grauInstrucao, proponenteIds, proponenteNomes, observacoes, etapaAtual, status, etapas, resultadoSindicancia, cim } = body;

    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });

    const candidato = await prisma.candidato.update({
      where: { id, lojaId: user.lojaId },
      data: {
        ...(nome !== undefined && { nome }),
        ...(dataNascimento !== undefined && { dataNascimento: dataNascimento || null }),
        ...(nomeConjuge !== undefined && { nomeConjuge: nomeConjuge || null }),
        ...(enderecoResidencial !== undefined && { enderecoResidencial: enderecoResidencial || null }),
        ...(telefone !== undefined && { telefone: telefone || null }),
        ...(telefoneFixo !== undefined && { telefoneFixo: telefoneFixo || null }),
        ...(enderecoProfissional !== undefined && { enderecoProfissional: enderecoProfissional || null }),
        ...(grauInstrucao !== undefined && { grauInstrucao: grauInstrucao || null }),
        ...(email !== undefined && { email: email || null }),
        ...(proponenteIds !== undefined && { proponenteIds: proponenteIds ? JSON.stringify(proponenteIds) : null }),
        ...(proponenteNomes !== undefined && { proponenteNomes: proponenteNomes || null }),
        ...(observacoes !== undefined && { observacoes: observacoes || null }),
        ...(etapaAtual !== undefined && { etapaAtual }),
        ...(status !== undefined && { status }),
        ...(etapas !== undefined && { etapas }),
        ...(resultadoSindicancia !== undefined && { resultadoSindicancia: resultadoSindicancia || null }),
        ...(cim !== undefined && { cim: cim || null }),
      }
    });

    return NextResponse.json({ success: true, candidato });
  } catch (error) {
    console.error('Erro ao atualizar candidato:', error);
    return NextResponse.json({ error: 'Erro ao atualizar candidato', details: error.message }, { status: 500 });
  }
}

async function deleteHandler(request, { user }) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });

    await prisma.candidato.delete({ where: { id, lojaId: user.lojaId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir candidato:', error);
    return NextResponse.json({ error: 'Erro ao excluir candidato', details: error.message }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
export const PUT = withAuth(putHandler);
export const DELETE = withAuth(deleteHandler);
