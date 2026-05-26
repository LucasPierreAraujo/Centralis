// src/app/api/cron/aniversarios/route.js
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { enviarEmail } from '../../../../lib/email';

/**
 * GET /api/cron/aniversarios
 * Endpoint para ser chamado por um serviço de cron externo (ex: Vercel Cron)
 *
 * Envia alertas automáticos de aniversário:
 * - Aniversário de nascimento de membros
 * - Aniversário de nascimento de dependentes
 * - Aniversário de casamento de dependentes (cônjuges)
 */
export async function GET(request) {
  try {
    // Verificar autorização
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar o secretário para assinar o email
    const secretario = await prisma.membro.findFirst({
      where: {
        cargo: 'SECRETÁRIO',
        status: 'ATIVO',
      },
      select: {
        nome: true,
        cim: true,
        assinaturaUrl: true,
      },
    });

    // Calcular a data de HOJE no horário de Brasília (UTC-3)
    const agora = new Date();
    const utcHours = agora.getUTCHours();
    const utcDate = agora.getUTCDate();
    const utcMonth = agora.getUTCMonth();
    const utcYear = agora.getUTCFullYear();

    let hojeAno = utcYear;
    let hojeMes = utcMonth + 1; // 1-12
    let hojeDia = utcDate;

    if (utcHours < 3) {
      const ontemUTC = new Date(Date.UTC(utcYear, utcMonth, utcDate - 1));
      hojeAno = ontemUTC.getUTCFullYear();
      hojeMes = ontemUTC.getUTCMonth() + 1;
      hojeDia = ontemUTC.getUTCDate();
    }

    // Formatar dia e mês para busca (ex: "15/03" ou "-03-15")
    const diaStr = String(hojeDia).padStart(2, '0');
    const mesStr = String(hojeMes).padStart(2, '0');

    console.log(`[CRON ANIVERSARIOS] Verificando aniversários para ${diaStr}/${mesStr}`);

    const GRAUS_MACONICOS = ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'];

    // Buscar apenas membros maçônicos ativos (exclui CANDIDATO, OUTROS, FILIADO, DEPENDENTE)
    const membros = await prisma.membro.findMany({
      where: {
        status: 'ATIVO',
        grau: { in: GRAUS_MACONICOS },
      },
      select: {
        id: true,
        nome: true,
        email: true,
        dataNascimento: true,
      },
    });

    // Buscar todos os dependentes com seus membros
    const dependentes = await prisma.dependente.findMany({
      include: {
        membro: {
          select: {
            nome: true,
            email: true,
            status: true,
          },
        },
      },
    });

    const aniversariosHoje = {
      nascimentoMembros: [],
      nascimentoDependentes: [],
      casamento: [],
    };

    // Função para verificar se a data corresponde ao dia/mês de hoje
    const isAniversarioHoje = (dataStr) => {
      if (!dataStr) return false;

      // Tentar diferentes formatos de data
      // Formato: DD/MM/YYYY ou DD/MM
      if (dataStr.includes('/')) {
        const partes = dataStr.split('/');
        if (partes.length >= 2) {
          return partes[0] === diaStr && partes[1] === mesStr;
        }
      }

      // Formato: YYYY-MM-DD
      if (dataStr.includes('-')) {
        const partes = dataStr.split('-');
        if (partes.length === 3) {
          return partes[2] === diaStr && partes[1] === mesStr;
        }
      }

      return false;
    };

    // Verificar aniversários de membros
    for (const membro of membros) {
      if (isAniversarioHoje(membro.dataNascimento)) {
        aniversariosHoje.nascimentoMembros.push({
          nome: membro.nome,
          email: membro.email,
          data: membro.dataNascimento,
        });
      }
    }

    // Verificar aniversários de dependentes e casamentos
    for (const dep of dependentes) {
      if (dep.membro.status !== 'ATIVO') continue;

      // Aniversário de nascimento do dependente
      if (isAniversarioHoje(dep.dataNascimento)) {
        aniversariosHoje.nascimentoDependentes.push({
          nome: dep.nome,
          tipo: dep.tipoDependente,
          membroNome: dep.membro.nome,
          membroEmail: dep.membro.email,
          data: dep.dataNascimento,
        });
      }

      // Aniversário de casamento
      if (isAniversarioHoje(dep.dataCasamento)) {
        aniversariosHoje.casamento.push({
          dependenteNome: dep.nome,
          tipo: dep.tipoDependente,
          membroNome: dep.membro.nome,
          membroEmail: dep.membro.email,
          data: dep.dataCasamento,
        });
      }
    }

    const totalAniversarios =
      aniversariosHoje.nascimentoMembros.length +
      aniversariosHoje.nascimentoDependentes.length +
      aniversariosHoje.casamento.length;

    console.log(`[CRON ANIVERSARIOS] Encontrados ${totalAniversarios} aniversários hoje`);

    // Se não houver aniversários, retornar
    if (totalAniversarios === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum aniversário hoje',
        data: `${diaStr}/${mesStr}`,
        aniversarios: aniversariosHoje,
      });
    }

    // Buscar apenas membros maçônicos ativos com email para enviar notificação
    const membrosComEmail = await prisma.membro.findMany({
      where: {
        status: 'ATIVO',
        grau: { in: GRAUS_MACONICOS },
        email: { not: null },
      },
      select: {
        nome: true,
        email: true,
      },
    });

    // Gerar conteúdo do email
    const html = gerarTemplateAniversario(aniversariosHoje, secretario, `${diaStr}/${mesStr}`);
    const assunto = `🎂 Aniversariantes do Dia - ${diaStr}/${mesStr}`;

    let enviados = 0;
    const erros = [];

    // Enviar para todos os membros com email
    for (const membro of membrosComEmail) {
      if (!membro.email) continue;

      try {
        await enviarEmail(membro.email, assunto, html);
        enviados++;
        console.log(`[CRON ANIVERSARIOS] Email enviado para: ${membro.nome}`);
      } catch (error) {
        console.error(`[CRON ANIVERSARIOS] Erro ao enviar para ${membro.email}:`, error.message);
        erros.push({ email: membro.email, erro: error.message });
      }
    }

    console.log(`[CRON ANIVERSARIOS] Total de emails enviados: ${enviados}`);

    return NextResponse.json({
      success: true,
      data: `${diaStr}/${mesStr}`,
      aniversarios: {
        nascimentoMembros: aniversariosHoje.nascimentoMembros.length,
        nascimentoDependentes: aniversariosHoje.nascimentoDependentes.length,
        casamento: aniversariosHoje.casamento.length,
        total: totalAniversarios,
      },
      emailsEnviados: enviados,
      erros: erros.length > 0 ? erros : undefined,
    });

  } catch (error) {
    console.error('[CRON ANIVERSARIOS] Erro:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao processar aniversários',
      details: error.message,
    }, { status: 500 });
  }
}

/**
 * Gera o template HTML do email de aniversário
 */
function gerarTemplateAniversario(aniversarios, secretario, dataHoje) {
  const logoUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://centralis.vercel.app'}/logo-bg.png`;
  const secretarioNome = secretario?.nome || 'Secretário';
  const secretarioCim = secretario?.cim || '';
  const secretarioAssinatura = secretario?.assinaturaUrl || '';

  let conteudoAniversarios = '';

  // Aniversários de membros
  if (aniversarios.nascimentoMembros.length > 0) {
    conteudoAniversarios += `
      <tr>
        <td style="padding: 12px 0;">
          <h3 style="margin: 0 0 8px 0; color: #1e3a5f; font-size: 16px;">🎂 Aniversário de Irmãos</h3>
          <ul style="margin: 0; padding-left: 20px; color: #333333;">
            ${aniversarios.nascimentoMembros.map(m => `<li style="margin-bottom: 4px;"><strong>${m.nome}</strong></li>`).join('')}
          </ul>
        </td>
      </tr>
    `;
  }

  // Aniversários de dependentes
  if (aniversarios.nascimentoDependentes.length > 0) {
    conteudoAniversarios += `
      <tr>
        <td style="padding: 12px 0;">
          <h3 style="margin: 0 0 8px 0; color: #1e3a5f; font-size: 16px;">🎈 Aniversário de Familiares</h3>
          <ul style="margin: 0; padding-left: 20px; color: #333333;">
            ${aniversarios.nascimentoDependentes.map(d => {
              const relacao = formatarTipoDependente(d.tipo);
              return `<li style="margin-bottom: 4px;"><strong>${d.nome}</strong> (${relacao} do Ir∴ ${d.membroNome})</li>`;
            }).join('')}
          </ul>
        </td>
      </tr>
    `;
  }

  // Aniversários de casamento
  if (aniversarios.casamento.length > 0) {
    conteudoAniversarios += `
      <tr>
        <td style="padding: 12px 0;">
          <h3 style="margin: 0 0 8px 0; color: #1e3a5f; font-size: 16px;">💍 Aniversário de Casamento</h3>
          <ul style="margin: 0; padding-left: 20px; color: #333333;">
            ${aniversarios.casamento.map(c => {
              return `<li style="margin-bottom: 4px;">Ir∴ <strong>${c.membroNome}</strong> e <strong>${c.dependenteNome}</strong></li>`;
            }).join('')}
          </ul>
        </td>
      </tr>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Aniversariantes do Dia</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f4;">
        <tr>
          <td align="center" style="padding: 20px 10px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td align="center" style="background-color: #1e3a5f; padding: 24px 20px;">
                  <img src="${logoUrl}" alt="Logo" width="60" height="60" style="display: block; margin-bottom: 12px; border-radius: 8px;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: bold; line-height: 1.3;">A.R.L.S. Sabedoria de Salomão nº 4.774</h1>
                </td>
              </tr>
              <!-- Título -->
              <tr>
                <td align="center" style="padding: 20px 24px 0 24px;">
                  <h2 style="margin: 0; color: #1e3a5f; font-size: 20px;">🎉 Aniversariantes do Dia</h2>
                  <p style="margin: 8px 0 0 0; color: #666666; font-size: 14px;">${dataHoje}</p>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 12px 24px 20px 24px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    ${conteudoAniversarios}
                  </table>
                  <p style="margin: 20px 0 0 0; color: #333333; font-size: 14px; text-align: center;">
                    Que possamos parabenizar nossos Irmãos e seus familiares nesta data especial! 🎊
                  </p>
                </td>
              </tr>
              <!-- Assinatura -->
              <tr>
                <td style="padding: 0 24px 20px 24px; border-top: 1px solid #e0e0e0;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td style="padding-top: 16px;">
                        ${secretarioAssinatura ? `<img src="${secretarioAssinatura}" alt="Assinatura" style="max-width: 150px; height: auto; margin-bottom: 8px; display: block;">` : ''}
                        <p style="margin: 0 0 2px 0; font-weight: bold; color: #333333; font-size: 14px;">${secretarioNome}</p>
                        <p style="margin: 0 0 2px 0; color: #666666; font-size: 13px;">CIM: ${secretarioCim}</p>
                        <p style="margin: 0; color: #666666; font-size: 13px;">Secretário</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td align="center" style="background-color: #f8f9fa; padding: 20px 24px; border-top: 1px solid #e0e0e0;">
                  <p style="margin: 0 0 8px 0; color: #888888; font-size: 12px;">Este é um email automático enviado pelo sistema de gestão da Loja.</p>
                  <p style="margin: 0; color: #888888; font-size: 12px;">Por favor, não responda a este email.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Formata o tipo de dependente para exibição
 */
function formatarTipoDependente(tipo) {
  const tipos = {
    'ESPOSA': 'Esposa',
    'MARIDO': 'Marido',
    'FILHO': 'Filho',
    'FILHA': 'Filha',
  };
  return tipos[tipo] || tipo;
}
