// src/lib/email.js
import nodemailer from 'nodemailer';

/**
 * Cria transporter usando credenciais da loja ou fallback para env vars do sistema.
 * @param {{ user: string, pass: string } | null} credenciais
 */
function createTransporter(credenciais = null) {
  const user = credenciais?.user || process.env.EMAIL_USER;
  const pass = credenciais?.pass || process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.error('[EMAIL] Credenciais não configuradas');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

/**
 * Envia um email.
 * @param {string} para
 * @param {string} assunto
 * @param {string} html
 * @param {{ user: string, pass: string } | null} credenciais - Credenciais da loja; usa env vars se omitido
 */
export async function enviarEmail(para, assunto, html, credenciais = null) {
  console.log('[EMAIL] Iniciando envio para:', para);

  const user = credenciais?.user || process.env.EMAIL_USER;
  const pass = credenciais?.pass || process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error('Credenciais de email não configuradas. Configure o email remetente nas configurações da loja.');
  }

  const transporter = createTransporter(credenciais);

  if (!transporter) {
    throw new Error('Não foi possível criar o transporter de email');
  }

  try {
    const result = await transporter.sendMail({
      from: user,
      to: para,
      subject: assunto,
      html,
    });
    console.log('[EMAIL] Enviado com sucesso para:', para, '| MessageId:', result.messageId);
    return result;
  } catch (error) {
    console.error('[EMAIL] Erro ao enviar para', para, ':', error.message);
    throw error;
  }
}

/**
 * Formata a data para exibição
 * @param {Date} data - Data a ser formatada
 */
function formatarData(data) {
  return new Date(data).toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Formata o dia e mês da reunião
 * @param {Date} data - Data da reunião
 */
function formatarDiaMes(data) {
  const dataObj = new Date(data);
  const dia = dataObj.getDate();
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const mes = meses[dataObj.getMonth()];
  return { dia, mes };
}

/**
 * Formata o grau para exibição
 * @param {string} grau - Grau da reunião
 */
function formatarGrau(grau) {
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
  return graus[grau] || grau;
}

/**
 * Retorna a URL base do site
 */
function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://centralis.vercel.app';
}

/**
 * Gera o template HTML do email de alerta
 * @param {Object} reuniao - Dados da reunião
 * @param {string} tipo - 'hoje' ou 'amanha'
 * @param {Object} secretario - Dados do secretário (nome, cim, assinaturaUrl)
 */
export function gerarTemplateAlerta(reuniao, tipo, secretario = null) {
  const { dia, mes } = formatarDiaMes(reuniao.data);
  const grauFormatado = formatarGrau(reuniao.grau);
  const horario = reuniao.horario || '19:30'; // Horário padrão se não definido

  const secretarioNome = secretario?.nome || 'Secretário';
  const secretarioCim = secretario?.cim || '';
  const secretarioAssinatura = secretario?.assinaturaUrl || '';
  const logoUrl = `${getBaseUrl()}/logo-bg.png`;

  return `
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
                  <p style="margin: 0 0 12px 0;">Saudações meus Irmãos,</p>
                  <p style="margin: 0 0 12px 0;">Gostaria de lembrar por meio dessa que dia <strong>${dia}</strong> do mês de <strong>${mes}</strong> às <strong>${horario}</strong> teremos reunião no grau de <strong>${grauFormatado}</strong>.</p>
                  <p style="margin: 0 0 20px 0;">Contamos com sua presença!</p>
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
 * Envia alertas de reunião para os membros.
 * @param {Object} reuniao
 * @param {Array} membros
 * @param {string} tipo - 'hoje' ou 'amanha'
 * @param {Object|null} secretario
 * @param {{ user: string, pass: string } | null} credenciais - Credenciais da loja
 */
export async function enviarAlertasReuniao(reuniao, membros, tipo, secretario = null, credenciais = null) {
  const grauFormatado = formatarGrau(reuniao.grau);
  const assunto = `Lembrete de Reunião - Grau de ${grauFormatado}`;
  const html = gerarTemplateAlerta(reuniao, tipo, secretario);

  const resultados = {
    enviados: 0,
    erros: [],
  };

  for (const membro of membros) {
    if (!membro.email) continue;

    try {
      await enviarEmail(membro.email, assunto, html, credenciais);
      resultados.enviados++;
      console.log(`Email enviado para: ${membro.nome} (${membro.email})`);
    } catch (error) {
      console.error(`Erro ao enviar para ${membro.email}:`, error.message);
      resultados.erros.push({ membro: membro.nome, email: membro.email, erro: error.message });
    }
  }

  return resultados;
}

/**
 * Filtra membros que podem participar de uma reunião baseado no grau
 * @param {Array} membros - Lista de todos os membros
 * @param {string} grauReuniao - Grau da reunião ('APRENDIZ', 'COMPANHEIRO', 'MESTRE', etc.)
 */
export function filtrarMembrosPorGrau(membros, grauReuniao) {
  // Graus válidos para receber alertas
  const grausValidos = ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'];

  // Hierarquia de graus - quem pode participar de cada tipo de reunião
  const hierarquia = {
    // Sessões Magnas por grau
    'APRENDIZ': ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'],
    'COMPANHEIRO': ['COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'],
    'MESTRE': ['MESTRE', 'MESTRE INSTALADO'],
    // Sessões Especiais
    'INICIACAO': ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'],
    'PASSAGEM_GRAU': ['COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'],
    'ELEVACAO': ['MESTRE', 'MESTRE INSTALADO'],
    'INSTALACAO': ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'],
    // Outras Sessões
    'A_CAMPO': ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'],
    'EXTRAORDINARIA': ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'],
    'REGULARIZACAO': ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'],
    'FILIACAO': ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'],
  };

  // Se o tipo de reunião não estiver na hierarquia, usa todos os graus válidos
  const grausPermitidos = hierarquia[grauReuniao] || grausValidos;

  return membros.filter(membro =>
    grausPermitidos.includes(membro.grau) &&
    grausValidos.includes(membro.grau) &&
    membro.email
  );
}
