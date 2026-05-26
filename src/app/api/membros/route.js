// app/api/membros/route.js

import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { withAuth, withPermission } from '../../../lib/authMiddleware';

const grausPermitidos = ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO']; 

// Função auxiliar para padronizar o mapeamento de dados (POST e PUT)
const mapMembroData = (body) => ({
    nome: body.nome,
    grau: body.grau,
    status: body.status,
    cim: body.cim || null,
    cargo: body.cargo || null,
    assinaturaUrl: body.assinaturaUrl || null,
    email: body.email || null,
    dataNascimento: body.dataNascimento || null,
    dataIniciacao: body.dataIniciacao || null,
    dataFiliacao: body.dataFiliacao || null,
    dataPassagemGrau: body.dataPassagemGrau || null,
    dataElevacao: body.dataElevacao || null,
    dataInstalacao: body.dataInstalacao || null,
    dataRegularizacao: body.dataRegularizacao || null,
    dataKitPlacet: body.dataKitPlacet || null,
});


// ====================================================================
// GET - Listar membros / Buscar Assinaturas
// ====================================================================
async function getHandler(request, { user }) {
  const { searchParams } = new URL(request.url);
  const isFinanceiro = searchParams.get('financeiro');
  const getAssinaturas = searchParams.get('assinaturas');

  try {
    if (getAssinaturas === 'true') {
        const cargosInteresse = ['TESOUREIRO', 'VENERÁVEL MESTRE'];

        const assinaturas = await prisma.membro.findMany({
            where: {
                lojaId: user.lojaId,
                cargo: { in: cargosInteresse },
                status: 'ATIVO',
                assinaturaUrl: { not: null }
            },
            select: {
                nome: true,
                cargo: true,
                assinaturaUrl: true,
                cim: true
            }
        });

        console.log('🔍 Assinaturas encontradas:', assinaturas); // Debug

        // Criar objeto de resposta com chaves normalizadas
        const assinaturasMap = {};

        assinaturas.forEach(membro => {
            if (membro.cargo === 'TESOUREIRO') {
                assinaturasMap.tesoureiro = membro;
            } else if (membro.cargo === 'VENERÁVEL MESTRE') {
                assinaturasMap.veneravelmestre = membro;
            }
        });

        console.log('📋 Mapa de assinaturas:', assinaturasMap); // Debug

        return NextResponse.json({ success: true, assinaturas: assinaturasMap });
    }

    const whereClause = isFinanceiro
      ? { lojaId: user.lojaId, status: 'ATIVO', grau: { in: grausPermitidos } }
      : { lojaId: user.lojaId };

    const membros = await prisma.membro.findMany({
      where: whereClause,
      orderBy: { nome: 'asc' }
    });

    return NextResponse.json(membros);

  } catch (error) {
    console.error('Erro ao buscar membros/assinaturas:', error);
    return NextResponse.json({ error: 'Erro ao buscar dados de membros' }, { status: 500 });
  }
}

// GET permite leitura para TESOUREIRO, SECRETARIO e ADMIN
export const GET = withAuth(getHandler);


// ====================================================================
// POST - Criar novo Membro (requer permissão 'membros')
// ====================================================================
async function postHandler(request, { user }) {
  try {
    const body = await request.json();

    if (!body.nome || !body.grau || !body.status) {
        return NextResponse.json({ error: 'Campos obrigatórios (nome, grau, status) estão faltando.' }, { status: 400 });
    }

    const dataToCreate = { ...mapMembroData(body), lojaId: user.lojaId };

    const novoMembro = await prisma.membro.create({
      data: dataToCreate,
    });

    return NextResponse.json({ success: true, membro: novoMembro }, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar novo membro:', error);
    return NextResponse.json(
      { error: 'Erro ao criar novo membro', details: error.message },
      { status: 500 }
    );
  }
}

export const POST = withPermission('membros')(postHandler);


// ====================================================================
// PUT - Atualizar Membro (requer permissão 'membros')
// ====================================================================
async function putHandler(request, { user }) {
    try {
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID do membro é obrigatório para atualização' }, { status: 400 });
        }

        const dataToUpdate = mapMembroData(updateData);

        const membroAtualizado = await prisma.membro.update({
            where: { id: id, lojaId: user.lojaId },
            data: dataToUpdate,
        });

        return NextResponse.json({ success: true, membro: membroAtualizado });

    } catch (error) {
        console.error('Erro ao atualizar membro:', error);
        return NextResponse.json(
          { error: 'Erro ao atualizar membro', details: error.message },
          { status: 500 }
        );
    }
}

export const PUT = withPermission('membros')(putHandler);


// ====================================================================
// DELETE - Excluir Membro (requer permissão 'membros')
// ====================================================================
async function deleteHandler(request, { user }) {
    try {
        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID do membro é obrigatório para exclusão' }, { status: 400 });
        }

        await prisma.membro.delete({
            where: { id: id, lojaId: user.lojaId },
        });

        return NextResponse.json({ success: true, message: 'Membro excluído com sucesso' });

    } catch (error) {
        console.error('Erro ao excluir membro:', error);
        return NextResponse.json(
          { error: 'Erro ao excluir membro', details: error.message },
          { status: 500 }
        );
    }
}

export const DELETE = withPermission('membros')(deleteHandler);