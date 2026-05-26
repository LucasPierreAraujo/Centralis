import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { withPermission } from '../../../lib/authMiddleware';

// ====================================================================
// GET - Listar todas as reuniões com suas presenças
// ====================================================================
async function getHandler(request, { user }) {
  try {
    const reunioes = await prisma.reuniao.findMany({
      where: { lojaId: user.lojaId },
      include: {
        presencas: {
          include: {
            membro: {
              select: {
                id: true,
                nome: true,
                grau: true,
                cim: true
              }
            }
          }
        }
      },
      orderBy: {
        data: 'desc'
      }
    });

    // Formatar os dados para o formato esperado pelo frontend
    const reunioesFormatadas = reunioes.map(reuniao => ({
      id: reuniao.id,
      data: reuniao.data.toISOString().split('T')[0], // Formato YYYY-MM-DD
      horario: reuniao.horario || '',
      grau: reuniao.grau,
      presencas: reuniao.presencas.reduce((acc, presenca) => {
        acc[presenca.membroId] = presenca.presente;
        return acc;
      }, {})
    }));

    return NextResponse.json(reunioesFormatadas);
  } catch (error) {
    console.error('Erro ao buscar reuniões:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar reuniões', details: error.message },
      { status: 500 }
    );
  }
}

// ====================================================================
// POST - Criar nova reunião
// ====================================================================
async function postHandler(request, { user }) {
  try {
    const body = await request.json();
    const { data, grau, horario } = body;

    if (!data || !grau) {
      return NextResponse.json(
        { error: 'Data e grau são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar grau/tipo de reunião
    const grausValidos = [
      'APRENDIZ', 'COMPANHEIRO', 'MESTRE',
      'INICIACAO', 'ELEVACAO', 'PASSAGEM_GRAU', 'INSTALACAO',
      'A_CAMPO', 'EXTRAORDINARIA', 'REGULARIZACAO', 'FILIACAO'
    ];
    if (!grausValidos.includes(grau)) {
      return NextResponse.json(
        { error: 'Tipo de reunião inválido' },
        { status: 400 }
      );
    }

    // Criar a reunião - usar meio-dia UTC para evitar problemas de fuso horário
    // Isso garante que a data seja a mesma independente do fuso horário do servidor
    const reuniao = await prisma.reuniao.create({
      data: {
        lojaId: user.lojaId,
        data: new Date(data + 'T12:00:00Z'),
        grau,
        horario: horario || null
      }
    });

    return NextResponse.json({
      success: true,
      reuniao: {
        id: reuniao.id,
        data: reuniao.data.toISOString().split('T')[0],
        horario: reuniao.horario || '',
        grau: reuniao.grau,
        presencas: {}
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar reunião:', error);
    return NextResponse.json(
      { error: 'Erro ao criar reunião', details: error.message },
      { status: 500 }
    );
  }
}

// ====================================================================
// PUT - Editar reunião existente
// ====================================================================
async function putHandler(request, { user }) {
  try {
    const body = await request.json();
    const { id, data, grau, horario } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID da reunião é obrigatório' },
        { status: 400 }
      );
    }

    if (!data || !grau) {
      return NextResponse.json(
        { error: 'Data e grau são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar grau/tipo de reunião
    const grausValidos = [
      'APRENDIZ', 'COMPANHEIRO', 'MESTRE',
      'INICIACAO', 'ELEVACAO', 'PASSAGEM_GRAU', 'INSTALACAO',
      'A_CAMPO', 'EXTRAORDINARIA', 'REGULARIZACAO', 'FILIACAO'
    ];
    if (!grausValidos.includes(grau)) {
      return NextResponse.json(
        { error: 'Tipo de reunião inválido' },
        { status: 400 }
      );
    }

    // Atualizar a reunião - usar meio-dia UTC para evitar problemas de fuso horário
    const reuniao = await prisma.reuniao.update({
      where: { id },
      data: {
        data: new Date(data + 'T12:00:00Z'),
        grau,
        horario: horario || null
      }
    });

    return NextResponse.json({
      success: true,
      reuniao: {
        id: reuniao.id,
        data: reuniao.data.toISOString().split('T')[0],
        horario: reuniao.horario || '',
        grau: reuniao.grau
      }
    });

  } catch (error) {
    console.error('Erro ao editar reunião:', error);
    return NextResponse.json(
      { error: 'Erro ao editar reunião', details: error.message },
      { status: 500 }
    );
  }
}

// ====================================================================
// DELETE - Excluir reunião
// ====================================================================
async function deleteHandler(request, { user }) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID da reunião é obrigatório' },
        { status: 400 }
      );
    }

    // Excluir a reunião (as presenças serão excluídas em cascata)
    await prisma.reuniao.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Reunião excluída com sucesso'
    });

  } catch (error) {
    console.error('Erro ao excluir reunião:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir reunião', details: error.message },
      { status: 500 }
    );
  }
}

// Todas as operações de reuniões requerem permissão 'presencas' (SECRETARIO e ADMIN)
export const GET = withPermission('presencas')(getHandler);
export const POST = withPermission('presencas')(postHandler);
export const PUT = withPermission('presencas')(putHandler);
export const DELETE = withPermission('presencas')(deleteHandler);
