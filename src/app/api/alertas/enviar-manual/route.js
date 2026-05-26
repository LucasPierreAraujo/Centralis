// src/app/api/alertas/enviar-manual/route.js
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { withPermission } from '../../../../lib/authMiddleware';
import { enviarEmail } from '../../../../lib/email';

/**
 * POST /api/alertas/enviar-manual
 * Envia alertas de reunião manualmente com mensagem personalizada
 * Body: { reuniaoId: string, membrosIds: string[], mensagem: { saudacao, corpo, despedida } }
 */
async function postHandler(request, { user }) {
  try {
    const body = await request.json();
    const { reuniaoId, membrosIds, mensagem } = body;
    const lojaId = user.lojaId;

    if (!reuniaoId || !membrosIds || membrosIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Reunião e membros são obrigatórios'
      }, { status: 400 });
    }

    const loja = await prisma.loja.findUnique({
      where: { id: lojaId },
      select: { emailRemetente: true, emailRemetenteSenha: true },
    });
    const credenciais = loja?.emailRemetente && loja?.emailRemetenteSenha
      ? { user: loja.emailRemetente, pass: loja.emailRemetenteSenha }
      : null;

    const reuniao = await prisma.reuniao.findFirst({
      where: { id: reuniaoId, lojaId }
    });

    if (!reuniao) {
      return NextResponse.json({
        success: false,
        error: 'Reunião não encontrada'
      }, { status: 404 });
    }

    const membros = await prisma.membro.findMany({
      where: {
        lojaId,
        id: { in: membrosIds },
        email: { not: null }
      },
      select: {
        id: true,
        nome: true,
        email: true
      }
    });

    if (membros.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum membro com email encontrado'
      }, { status: 400 });
    }

    const secretario = await prisma.membro.findFirst({
      where: {
        lojaId,
        cargo: 'SECRETÁRIO',
        status: 'ATIVO'
      },
      select: {
        nome: true,
        cim: true,
        assinaturaUrl: true
      }
    });

    // Formatar dados da reunião
    const dataObj = new Date(reuniao.data);
    const dia = dataObj.getDate();
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const mes = meses[dataObj.getMonth()];

    const graus = {
      'APRENDIZ': 'Aprendiz',
      'COMPANHEIRO': 'Companheiro',
      'MESTRE': 'Mestre',
      'INICIACAO': 'Iniciação',
      'ELEVACAO': 'Elevação',
      'PASSAGEM_GRAU': 'Promoção',
      'INSTALACAO': 'Instalação',
      'A_CAMPO': 'A Campo',
      'EXTRAORDINARIA': 'Extraordinária',
      'REGULARIZACAO': 'Regularização',
      'FILIACAO': 'Filiação'
    };
    const grau = graus[reuniao.grau] || reuniao.grau;

    // Montar mensagem
    const saudacao = mensagem?.saudacao || 'Saudações meus Irmãos,';
    const corpo = (mensagem?.corpo || 'Gostaria de lembrar por meio dessa que dia {dia} do mês de {mes} teremos reunião no grau de {grau}.')
      .replace('{dia}', dia)
      .replace('{mes}', mes)
      .replace('{grau}', grau);
    const despedida = mensagem?.despedida || 'Contamos com sua presença!';

    const secretarioNome = secretario?.nome || 'Secretário';
    const secretarioCim = secretario?.cim || '';
    const secretarioAssinatura = secretario?.assinaturaUrl || '';

    // URL base do site para a logo
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://recibosabedoria.vercel.app');
    const logoUrl = `${baseUrl}/logo-bg.png`;

    // Gerar HTML do email otimizado para mobile
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>A.R.L.S. Sabedoria de Salomão</title>
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
                <!-- Content -->
                <tr>
                  <td style="padding: 20px 24px; color: #333333; font-size: 15px; line-height: 1.5;">
                    <p style="margin: 0 0 12px 0;">${saudacao}</p>
                    <p style="margin: 0 0 12px 0;">${corpo}</p>
                    <p style="margin: 0 0 20px 0;">${despedida}</p>
                    <!-- Assinatura -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top: 1px solid #e0e0e0;">
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
                    <p style="margin: 0 0 8px 0; color: #888888; font-size: 12px;">Este é um email enviado pelo sistema de gestão da Loja.</p>
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

    const assunto = `Lembrete de Reunião - Grau de ${grau}`;

    // Enviar emails
    const resultados = {
      enviados: 0,
      erros: []
    };

    for (const membro of membros) {
      try {
        await enviarEmail(membro.email, assunto, html, credenciais);
        resultados.enviados++;
        console.log(`Email enviado para: ${membro.nome} (${membro.email})`);
      } catch (error) {
        console.error(`Erro ao enviar para ${membro.email}:`, error.message);
        resultados.erros.push({ nome: membro.nome, email: membro.email, erro: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      enviados: resultados.enviados,
      erros: resultados.erros
    });

  } catch (error) {
    console.error('Erro ao enviar alertas manuais:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao enviar alertas',
      details: error.message
    }, { status: 500 });
  }
}

// Requer permissão de alertas (SECRETARIO, TESOUREIRO, ADMIN, VENERAVEL)
export const POST = withPermission('alertas')(postHandler);
