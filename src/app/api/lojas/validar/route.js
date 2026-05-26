import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function POST(request) {
  try {
    const { lojaId, codigo } = await request.json();

    if (!lojaId || !codigo) {
      return NextResponse.json({ success: false, message: 'Dados inválidos.' }, { status: 400 });
    }

    const loja = await prisma.loja.findUnique({ where: { id: lojaId } });

    if (!loja) {
      return NextResponse.json({ success: false, message: 'Solicitação não encontrada.' }, { status: 404 });
    }

    if (loja.status !== 'PENDENTE') {
      return NextResponse.json({ success: false, message: 'Esta loja já foi validada.' }, { status: 409 });
    }

    if (loja.codigoValidacao !== codigo.trim()) {
      return NextResponse.json({ success: false, message: 'Código incorreto.' }, { status: 400 });
    }

    if (loja.codigoExpiraEm && new Date() > loja.codigoExpiraEm) {
      return NextResponse.json({ success: false, message: 'Código expirado. Solicite um novo cadastro.' }, { status: 400 });
    }

    // Ativar loja e criar usuário administrador
    await prisma.$transaction(async (tx) => {
      // Status TRIAL: usuário validou, aguarda ativação do admin (48h)
      await tx.loja.update({
        where: { id: lojaId },
        data: {
          status: 'TRIAL',
          trialAtivadoEm: new Date(),
          codigoValidacao: null,
          codigoExpiraEm: null,
          usernameAdmin: null,
          passwordAdmin: null,
        }
      });

      await tx.user.create({
        data: {
          username: loja.usernameAdmin,
          password: loja.passwordAdmin,
          role: 'VENERAVEL',
          lojaId: lojaId,
        }
      });

      // Copiar configurações gerais da loja padrão (nome, logo, endereço, oriente)
      const configsParaCopiar = [
        { chave: 'nome_loja', valor: loja.nome },
        { chave: 'oriente', valor: loja.oriente || '' },
        { chave: 'endereco', valor: loja.endereco || '' },
      ];
      if (loja.logoUrl) configsParaCopiar.push({ chave: 'logo', valor: loja.logoUrl });

      for (const cfg of configsParaCopiar) {
        if (cfg.valor) {
          await tx.configuracaoGeral.upsert({
            where: { chave_lojaId: { chave: cfg.chave, lojaId } },
            update: { valor: cfg.valor },
            create: { chave: cfg.chave, valor: cfg.valor, lojaId },
          });
        }
      }
    });

    return NextResponse.json({ success: true, message: 'Cadastro confirmado! Faça login. Sua loja ficará disponível por 48 horas enquanto aguarda a ativação.' });
  } catch (error) {
    console.error('[LOJAS/VALIDAR]', error);
    return NextResponse.json({ success: false, message: 'Erro interno. Tente novamente.' }, { status: 500 });
  }
}
