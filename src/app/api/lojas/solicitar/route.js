import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { hashPassword } from '../../../../lib/auth';
import { enviarEmail } from '../../../../lib/email';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

function gerarCodigo() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function templateEmailCodigo({ nomeLoja, oriente, codigo }) {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
      <table width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f4;">
        <tr><td align="center" style="padding:20px 10px;">
          <table width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
            <tr>
              <td align="center" style="background:#1e3a5f;padding:24px 20px;">
                <h1 style="margin:0;color:#fff;font-size:20px;">Cadastro de Nova Loja</h1>
                <p style="margin:6px 0 0;color:#cdd8e8;font-size:14px;">Sistema de Gestão Maçônica</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;color:#333;font-size:15px;line-height:1.6;">
                <p>Foi solicitado o cadastro de uma nova loja no sistema:</p>
                <table width="100%" cellspacing="0" cellpadding="8" style="background:#f8f9fa;border-radius:6px;margin:16px 0;">
                  <tr><td style="color:#666;font-size:13px;">Nome da Loja</td><td style="font-weight:bold;">${nomeLoja}</td></tr>
                  <tr><td style="color:#666;font-size:13px;">Oriente</td><td style="font-weight:bold;">${oriente || '—'}</td></tr>
                </table>
                <p>Use o código abaixo para ativar o cadastro:</p>
                <div style="text-align:center;margin:20px 0;">
                  <span style="display:inline-block;background:#1e3a5f;color:#fff;font-size:32px;font-weight:bold;letter-spacing:8px;padding:14px 28px;border-radius:8px;">${codigo}</span>
                </div>
                <p style="color:#888;font-size:13px;">Este código expira em <strong>30 minutos</strong>. Se você não solicitou este cadastro, ignore este email.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="background:#f8f9fa;padding:16px;border-top:1px solid #e0e0e0;">
                <p style="margin:0;color:#aaa;font-size:12px;">Email automático — não responda.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

export async function POST(request) {
  try {
    const { nome, endereco, oriente, logoUrl, emailVeneravel, rito, cargos, terminologia, username, password, emailRemetente, emailRemetenteSenha } = await request.json();

    if (!nome || !emailVeneravel || !username || !password) {
      return NextResponse.json({ success: false, message: 'Preencha todos os campos obrigatórios.' }, { status: 400 });
    }

    // Verificar se username já existe em User
    const usernameEmUso = await prisma.user.findUnique({ where: { username } });
    if (usernameEmUso) {
      return NextResponse.json({ success: false, message: 'Este nome de usuário já está em uso.' }, { status: 409 });
    }

    // Verificar se há solicitação pendente com mesmo username
    const lojaComUsername = await prisma.loja.findFirst({ where: { usernameAdmin: username } });
    if (lojaComUsername) {
      return NextResponse.json({ success: false, message: 'Este nome de usuário já está em uso.' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const codigo = gerarCodigo();
    const expiraEm = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

    // Criar loja com status PENDENTE
    const loja = await prisma.loja.create({
      data: {
        nome,
        endereco: endereco || null,
        oriente: oriente || null,
        logoUrl: logoUrl || null,
        emailVeneravel,
        usernameAdmin: username,
        passwordAdmin: passwordHash,
        codigoValidacao: codigo,
        codigoExpiraEm: expiraEm,
        status: 'PENDENTE',
        rito: rito || 'REAA',
        cargosIniciais: cargos ? JSON.stringify(cargos) : null,
        terminologiaJson: terminologia ? JSON.stringify(terminologia) : null,
        emailRemetente: emailRemetente || null,
        emailRemetenteSenha: emailRemetenteSenha || null,
      }
    });

    // Enviar código ao email do venerável e ao admin
    const html = templateEmailCodigo({ nomeLoja: nome, oriente, codigo });
    const assunto = `Código de ativação — ${nome}`;

    const destinatarios = [emailVeneravel];
    if (emailVeneravel !== ADMIN_EMAIL) destinatarios.push(ADMIN_EMAIL);

    await Promise.allSettled(destinatarios.map(email => enviarEmail(email, assunto, html)));

    return NextResponse.json({
      success: true,
      lojaId: loja.id,
      message: `Código enviado para ${emailVeneravel}. Verifique sua caixa de entrada.`
    });
  } catch (error) {
    console.error('[LOJAS/SOLICITAR]', error);
    return NextResponse.json({ success: false, message: 'Erro interno. Tente novamente.' }, { status: 500 });
  }
}
