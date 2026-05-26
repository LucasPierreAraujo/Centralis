// app/api/atas/route.js
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { withPermission } from '../../../lib/authMiddleware';


// GET: Listar todas as atas
async function getHandler(request, { user }) {
  try {
    const atas = await prisma.ata.findMany({
      where: { lojaId: user.lojaId },
      orderBy: {
        data: 'desc'
      },
      include: {
        cargos: {
          include: {
            membro: true
          }
        },
        presencas: {
          include: {
            membro: true
          }
        }
      }
    });

    return NextResponse.json(atas);
  } catch (error) {
    console.error('Erro ao buscar atas:', error);
    return NextResponse.json({ error: 'Erro ao buscar atas' }, { status: 500 });
  }
}

// POST: Criar nova ata
async function postHandler(request, { user }) {
  try {
    const data = await request.json();
    
    const {
      numeroAta,
      livro,
      tipoSessao,
      data: dataAta,
      horarioInicio,
      horarioEncerramento,
      numeroPresentes,
      valorTronco,
      local,
      usarAssinaturas,
      leituraAta,
      expediente,
      ordemDia,
      coberturaTemplo,
      palavraBemLoja,
      cargos,
      presencas
    } = data;

    // Criar a ata com cargos e presenças em uma única transação
    const ata = await prisma.$transaction(async (tx) => {
      const novaAta = await tx.ata.create({
        data: {
          lojaId: user.lojaId,
          numeroAta,
          livro,
          tipoSessao: tipoSessao || 'MAGNA',
          data: new Date(dataAta + 'T12:00:00Z'),
          horarioInicio,
          horarioEncerramento,
          numeroPresentes: parseInt(numeroPresentes),
          valorTronco: parseFloat(valorTronco),
          local,
          usarAssinaturas: usarAssinaturas === true,
          leituraAta,
          expediente,
          ordemDia,
          coberturaTemplo,
          palavraBemLoja,
        }
      });

      if (cargos && cargos.length > 0) {
        await tx.ataCargo.createMany({
          data: cargos.map(cargo => ({
            ataId: novaAta.id,
            cargo: cargo.cargo,
            membroId: cargo.membroId || null,
            nomeManual: cargo.nomeManual || null
          }))
        });
      }

      if (presencas && presencas.length > 0) {
        await tx.ataPresenca.createMany({
          data: presencas.map(presenca => ({
            ataId: novaAta.id,
            membroId: presenca.membroId || null,
            nomeManual: presenca.nomeManual || null,
            tipo: presenca.tipo
          }))
        });
      }

      return novaAta;
    }, { timeout: 30000 });

    return NextResponse.json({ success: true, ata }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar ata:', error);
    return NextResponse.json({ error: 'Erro ao criar ata' }, { status: 500 });
  }
}

// DELETE: Excluir ata
async function deleteHandler(request, { user }) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 });
    }

    await prisma.ata.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir ata:', error);
    return NextResponse.json({ error: 'Erro ao excluir ata' }, { status: 500 });
  }
}

// Todas as operações de atas requerem permissão 'atas' (SECRETARIO e ADMIN)
export const GET = withPermission('atas')(getHandler);
export const POST = withPermission('atas')(postHandler);
export const DELETE = withPermission('atas')(deleteHandler);
