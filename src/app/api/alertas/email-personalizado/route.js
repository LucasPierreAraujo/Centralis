// src/app/api/alertas/email-personalizado/route.js
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { withPermission } from '../../../../lib/authMiddleware';
import { enviarEmail } from '../../../../lib/email';

/**
 * POST /api/alertas/email-personalizado
 * Envia emails personalizados para membros ou destinatários externos
 * Body: { destinatarios: [{nome, email}], assunto: string, mensagem: string }
 */
async function postHandler(request, { user }) {
  try {
    const body = await request.json();
    const { destinatarios, assunto, mensagem } = body;
    const lojaId = user.lojaId;

    console.log('[EMAIL-API] Recebida requisição para enviar emails');
    console.log('[EMAIL-API] Destinatários:', destinatarios?.length || 0);

    if (!destinatarios || destinatarios.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum destinatário informado'
      }, { status: 400 });
    }

    if (!assunto || !mensagem) {
      return NextResponse.json({
        success: false,
        error: 'Assunto e mensagem são obrigatórios'
      }, { status: 400 });
    }

    const loja = await prisma.loja.findUnique({
      where: { id: lojaId },
      select: { emailRemetente: true, emailRemetenteSenha: true },
    });
    const credenciais = loja?.emailRemetente && loja?.emailRemetenteSenha
      ? { user: loja.emailRemetente, pass: loja.emailRemetenteSenha }
      : null;

    if (!credenciais && !process.env.EMAIL_USER) {
      return NextResponse.json({
        success: false,
        error: 'Email remetente não configurado. Adicione o email e senha nas configurações da loja.',
        enviados: 0
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

    const secretarioNome = secretario?.nome || 'Secretário';
    const secretarioCim = secretario?.cim || '';
    const secretarioAssinatura = secretario?.assinaturaUrl || '';

    const resultados = {
      enviados: 0,
      erros: []
    };

    // URL da logo (usar URL fixa do site em produção)
    const logoUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://centralis.vercel.app'}/logo-bg.png`;

    for (const destinatario of destinatarios) {
      if (!destinatario.email) continue;

      // Substituir variáveis na mensagem
      const mensagemFinal = mensagem
        .replace(/{nome}/g, destinatario.nome || 'Prezado(a)')
        .replace(/{data}/g, '[data a definir]');

      // Converter quebras de linha em <br> para HTML
      const mensagemHtml = mensagemFinal.replace(/\n/g, '<br>');

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
                      ${mensagemHtml}
                      <!-- Assinatura -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 20px; border-top: 1px solid #e0e0e0;">
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
                      <p style="margin: 0; color: #888888; font-size: 12px;">A.R.L.S. Sabedoria de Salomão nº 4.774</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      try {
        await enviarEmail(destinatario.email, assunto, html, credenciais);
        resultados.enviados++;
        console.log(`Email enviado para: ${destinatario.nome} (${destinatario.email})`);
      } catch (error) {
        console.error(`Erro ao enviar para ${destinatario.email}:`, error.message);
        resultados.erros.push({
          nome: destinatario.nome,
          email: destinatario.email,
          erro: error.message
        });
      }
    }

    console.log('[EMAIL-API] Resultado final:', resultados);

    return NextResponse.json({
      success: resultados.enviados > 0,
      enviados: resultados.enviados,
      erros: resultados.erros,
      message: resultados.enviados > 0
        ? `${resultados.enviados} email(s) enviado(s) com sucesso`
        : 'Nenhum email foi enviado. Verifique os logs para mais detalhes.'
    });

  } catch (error) {
    console.error('[EMAIL-API] Erro geral:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao enviar emails',
      details: error.message,
      enviados: 0
    }, { status: 500 });
  }
}

// Requer permissão de alertas (SECRETARIO, TESOUREIRO, ADMIN, VENERAVEL)
export const POST = withPermission('alertas')(postHandler);
