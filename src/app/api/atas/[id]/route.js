// app/api/atas/[id]/route.js
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { withPermission } from '../../../../lib/authMiddleware';


// GET: Buscar ata por ID
async function getHandler(request, { params, user }) {
  try {
    const { id } = await params;

    const ata = await prisma.ata.findUnique({
      where: { id },
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

    if (!ata) {
      return NextResponse.json({ error: 'Ata não encontrada' }, { status: 404 });
    }

    return NextResponse.json(ata);
  } catch (error) {
    console.error('Erro ao buscar ata:', error);
    return NextResponse.json({ error: 'Erro ao buscar ata' }, { status: 500 });
  }
}

// DELETE: Excluir ata
async function deleteHandler(request, { params, user }) {
  try {
    const { id } = await params;

    await prisma.ata.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir ata:', error);
    return NextResponse.json({ error: 'Erro ao excluir ata' }, { status: 500 });
  }
}

// PUT: Atualizar ata
async function putHandler(request, { params, user }) {
  try {
    const { id } = await params;
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

    // Atualizar a ata - usar meio-dia UTC para evitar problemas de fuso horário
    const ata = await prisma.ata.update({
      where: { id },
      data: {
        numeroAta,
        livro,
        tipoSessao: tipoSessao || 'MAGNA',
        data: new Date(dataAta + 'T12:00:00Z'),
        horarioInicio,
        horarioEncerramento,
        numeroPresentes: parseInt(numeroPresentes),
        valorTronco: parseFloat(valorTronco),
        local,
        usarAssinaturas: usarAssinaturas ?? false,
        leituraAta,
        expediente,
        ordemDia,
        coberturaTemplo,
        palavraBemLoja,
      }
    });

    // Deletar cargos antigos e criar novos
    if (cargos) {
      await prisma.ataCargo.deleteMany({
        where: { ataId: id }
      });

      await Promise.all(
        cargos.map(cargo =>
          prisma.ataCargo.create({
            data: {
              ataId: id,
              cargo: cargo.cargo,
              membroId: cargo.membroId || null,
              nomeManual: cargo.nomeManual || null
            }
          })
        )
      );
    }

    // Deletar presenças antigas e criar novas
    if (presencas) {
      await prisma.ataPresenca.deleteMany({
        where: { ataId: id }
      });

      await Promise.all(
        presencas.map(presenca =>
          prisma.ataPresenca.create({
            data: {
              ataId: id,
              membroId: presenca.membroId || null,
              nomeManual: presenca.nomeManual || null,
              tipo: presenca.tipo
            }
          })
        )
      );
    }

    return NextResponse.json({ success: true, ata });
  } catch (error) {
    console.error('Erro ao atualizar ata:', error);
    return NextResponse.json({ error: 'Erro ao atualizar ata' }, { status: 500 });
  }
}

// Todas as operações de atas requerem permissão 'atas' (SECRETARIO e ADMIN)
export const GET = withPermission('atas')(getHandler);
export const DELETE = withPermission('atas')(deleteHandler);
export const PUT = withPermission('atas')(putHandler);
