// src/app/api/alertas/enviar/route.js
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { withPermission } from '../../../../lib/authMiddleware';
import { enviarAlertasReuniao, filtrarMembrosPorGrau } from '../../../../lib/email';

/**
 * POST /api/alertas/enviar
 * Envia alertas de reunião manualmente
 * Body: { reuniaoId?: string } - Se não informado, busca reuniões de hoje e amanhã
 */
async function postHandler(request, { user }) {
  try {
    const body = await request.json().catch(() => ({}));
    const { reuniaoId } = body;
    const lojaId = user.lojaId;

    const loja = await prisma.loja.findUnique({
      where: { id: lojaId },
      select: { emailRemetente: true, emailRemetenteSenha: true },
    });
    const credenciais = loja?.emailRemetente && loja?.emailRemetenteSenha
      ? { user: loja.emailRemetente, pass: loja.emailRemetenteSenha }
      : null;

    const secretario = await prisma.membro.findFirst({
      where: {
        lojaId,
        cargo: 'SECRETÁRIO',
        status: 'ATIVO',
      },
      select: {
        nome: true,
        cim: true,
      },
    });

    const membros = await prisma.membro.findMany({
      where: {
        lojaId,
        status: 'ATIVO',
        email: { not: null },
      },
      select: {
        id: true,
        nome: true,
        email: true,
        grau: true,
      },
    });

    if (membros.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum membro com email cadastrado encontrado',
      }, { status: 400 });
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const depoisDeAmanha = new Date(amanha);
    depoisDeAmanha.setDate(depoisDeAmanha.getDate() + 1);

    let reunioes;

    if (reuniaoId) {
      // Buscar reunião específica
      const reuniao = await prisma.reuniao.findFirst({
        where: { id: reuniaoId, lojaId },
      });

      if (!reuniao) {
        return NextResponse.json({
          success: false,
          message: 'Reunião não encontrada',
        }, { status: 404 });
      }

      reunioes = [{ reuniao, tipo: 'manual' }];
    } else {
      // Buscar reuniões de hoje e amanhã
      const reunioesHoje = await prisma.reuniao.findMany({
        where: { lojaId, data: { gte: hoje, lt: amanha } },
      });

      const reunioesAmanha = await prisma.reuniao.findMany({
        where: { lojaId, data: { gte: amanha, lt: depoisDeAmanha } },
      });

      reunioes = [
        ...reunioesHoje.map(r => ({ reuniao: r, tipo: 'hoje' })),
        ...reunioesAmanha.map(r => ({ reuniao: r, tipo: 'amanha' })),
      ];
    }

    if (reunioes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhuma reunião encontrada para hoje ou amanhã',
        alertasEnviados: 0,
      });
    }

    const resultados = [];

    for (const { reuniao, tipo } of reunioes) {
      // Filtrar membros pelo grau da reunião
      const membrosParaNotificar = filtrarMembrosPorGrau(membros, reuniao.grau);

      if (membrosParaNotificar.length === 0) {
        resultados.push({
          reuniaoId: reuniao.id,
          grau: reuniao.grau,
          data: reuniao.data,
          tipo,
          enviados: 0,
          message: 'Nenhum membro elegível com email encontrado',
        });
        continue;
      }

      const resultado = await enviarAlertasReuniao(reuniao, membrosParaNotificar, tipo, secretario, credenciais);

      resultados.push({
        reuniaoId: reuniao.id,
        grau: reuniao.grau,
        data: reuniao.data,
        tipo,
        ...resultado,
      });
    }

    const totalEnviados = resultados.reduce((sum, r) => sum + r.enviados, 0);

    return NextResponse.json({
      success: true,
      message: `${totalEnviados} alertas enviados com sucesso`,
      alertasEnviados: totalEnviados,
      detalhes: resultados,
    });

  } catch (error) {
    console.error('Erro ao enviar alertas:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao enviar alertas',
      details: error.message,
    }, { status: 500 });
  }
}

// Requer permissão de alertas (SECRETARIO, TESOUREIRO, ADMIN, VENERAVEL)
export const POST = withPermission('alertas')(postHandler);
