// src/app/api/cron/alertas/route.js
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { enviarAlertasReuniao, filtrarMembrosPorGrau } from '../../../../lib/email';

/**
 * GET /api/cron/alertas
 * Endpoint para ser chamado por um serviço de cron externo (ex: Vercel Cron, cron-job.org)
 *
 * Envia alertas automáticos:
 * - Para reuniões de HOJE: "A reunião é HOJE!"
 * - Para reuniões de AMANHÃ: "Lembrete: reunião AMANHÃ!"
 *
 * Para proteger este endpoint, use uma chave secreta no header:
 * Authorization: Bearer {CRON_SECRET}
 */
export async function GET(request) {
  try {
    // Verificar autorização (opcional, mas recomendado)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar lojas ativas com credenciais de email configuradas
    const lojas = await prisma.loja.findMany({
      where: {
        status: 'ATIVA',
        emailRemetente: { not: null },
        emailRemetenteSenha: { not: null },
      },
      select: {
        id: true,
        emailRemetente: true,
        emailRemetenteSenha: true,
      },
    });

    // Calcular a data de HOJE no horário de Brasília (UTC-3)
    const agora = new Date();

    // Converter para horário de Brasília
    // Brasília é UTC-3, então subtraímos 3 horas do UTC
    const utcHours = agora.getUTCHours();
    const utcDate = agora.getUTCDate();
    const utcMonth = agora.getUTCMonth();
    const utcYear = agora.getUTCFullYear();

    // Se são menos de 3h UTC, ainda é o dia anterior em Brasília
    let hojeAno = utcYear;
    let hojeMes = utcMonth;
    let hojeDia = utcDate;

    if (utcHours < 3) {
      // Ainda é o dia anterior em Brasília
      const ontemUTC = new Date(Date.UTC(utcYear, utcMonth, utcDate - 1));
      hojeAno = ontemUTC.getUTCFullYear();
      hojeMes = ontemUTC.getUTCMonth();
      hojeDia = ontemUTC.getUTCDate();
    }

    // Data de HOJE em Brasília (como string YYYY-MM-DD)
    const hojeStr = `${hojeAno}-${String(hojeMes + 1).padStart(2, '0')}-${String(hojeDia).padStart(2, '0')}`;

    // Data de AMANHÃ em Brasília
    const amanhaBrasilia = new Date(Date.UTC(hojeAno, hojeMes, hojeDia + 1));
    const amanhaStr = `${amanhaBrasilia.getUTCFullYear()}-${String(amanhaBrasilia.getUTCMonth() + 1).padStart(2, '0')}-${String(amanhaBrasilia.getUTCDate()).padStart(2, '0')}`;

    // Para a query, criar ranges que cobrem o dia inteiro
    // Hoje: de 00:00 até 23:59:59 do dia
    const hojeInicio = new Date(hojeStr + 'T00:00:00Z');
    const hojeFim = new Date(hojeStr + 'T23:59:59Z');

    // Amanhã: de 00:00 até 23:59:59 do dia
    const amanhaInicio = new Date(amanhaStr + 'T00:00:00Z');
    const amanhaFim = new Date(amanhaStr + 'T23:59:59Z');

    console.log(`[CRON] Hora UTC: ${agora.toISOString()}`);
    console.log(`[CRON] HOJE em Brasília: ${hojeStr}`);
    console.log(`[CRON] AMANHÃ em Brasília: ${amanhaStr}`);
    console.log(`[CRON] Buscando reuniões de hoje: ${hojeInicio.toISOString()} até ${hojeFim.toISOString()}`);
    console.log(`[CRON] Buscando reuniões de amanhã: ${amanhaInicio.toISOString()} até ${amanhaFim.toISOString()}`);

    // Início do dia de hoje em Brasília (para verificar se já enviou alerta hoje)
    const inicioDiaHoje = new Date(hojeStr + 'T00:00:00-03:00');

    // Buscar reuniões de HOJE que ainda não receberam alerta hoje
    const reunioesHoje = await prisma.reuniao.findMany({
      where: {
        data: {
          gte: hojeInicio,
          lte: hojeFim,
        },
        OR: [
          { alertaHojeEnviadoEm: null },
          { alertaHojeEnviadoEm: { lt: inicioDiaHoje } }
        ]
      },
    });

    const resultados = [];
    let totalReunioeHoje = 0;
    let totalReuniaoAmanha = 0;

    // Processar cada loja com suas próprias credenciais
    for (const loja of lojas) {
      const credenciais = { user: loja.emailRemetente, pass: loja.emailRemetenteSenha };

      const [reunioesHoje, reunioesAmanha, membros, secretario] = await Promise.all([
        prisma.reuniao.findMany({
          where: {
            lojaId: loja.id,
            data: { gte: hojeInicio, lte: hojeFim },
            OR: [{ alertaHojeEnviadoEm: null }, { alertaHojeEnviadoEm: { lt: inicioDiaHoje } }],
          },
        }),
        prisma.reuniao.findMany({
          where: {
            lojaId: loja.id,
            data: { gte: amanhaInicio, lte: amanhaFim },
            OR: [{ alertaAmanhaEnviadoEm: null }, { alertaAmanhaEnviadoEm: { lt: inicioDiaHoje } }],
          },
        }),
        prisma.membro.findMany({
          where: { lojaId: loja.id, status: 'ATIVO', email: { not: null } },
          select: { id: true, nome: true, email: true, grau: true },
        }),
        prisma.membro.findFirst({
          where: { lojaId: loja.id, cargo: 'SECRETÁRIO', status: 'ATIVO' },
          select: { nome: true, cim: true, assinaturaUrl: true },
        }),
      ]);

      totalReunioeHoje += reunioesHoje.length;
      totalReuniaoAmanha += reunioesAmanha.length;

      for (const reuniao of reunioesHoje) {
        const membrosParaNotificar = filtrarMembrosPorGrau(membros, reuniao.grau);
        if (membrosParaNotificar.length > 0) {
          const resultado = await enviarAlertasReuniao(reuniao, membrosParaNotificar, 'hoje', secretario, credenciais);
          await prisma.reuniao.update({ where: { id: reuniao.id }, data: { alertaHojeEnviadoEm: new Date() } });
          resultados.push({ lojaId: loja.id, reuniaoId: reuniao.id, grau: reuniao.grau, data: reuniao.data, tipo: 'hoje', ...resultado });
        }
      }

      for (const reuniao of reunioesAmanha) {
        const membrosParaNotificar = filtrarMembrosPorGrau(membros, reuniao.grau);
        if (membrosParaNotificar.length > 0) {
          const resultado = await enviarAlertasReuniao(reuniao, membrosParaNotificar, 'amanha', secretario, credenciais);
          await prisma.reuniao.update({ where: { id: reuniao.id }, data: { alertaAmanhaEnviadoEm: new Date() } });
          resultados.push({ lojaId: loja.id, reuniaoId: reuniao.id, grau: reuniao.grau, data: reuniao.data, tipo: 'amanha', ...resultado });
        }
      }
    }

    const totalEnviados = resultados.reduce((sum, r) => sum + r.enviados, 0);

    console.log(`[CRON] Alertas enviados: ${totalEnviados} (${lojas.length} lojas processadas)`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      dataBrasilia: hojeStr,
      lojasProcessadas: lojas.length,
      reunioesHoje: totalReunioeHoje,
      reunioesAmanha: totalReuniaoAmanha,
      alertasEnviados: totalEnviados,
      detalhes: resultados,
    });

  } catch (error) {
    console.error('[CRON] Erro ao processar alertas:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao processar alertas',
      details: error.message,
    }, { status: 500 });
  }
}
