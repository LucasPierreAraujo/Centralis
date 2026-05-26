import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { withPermission } from '../../../../lib/authMiddleware';

const prisma = new PrismaClient();

// GET - Buscar configurações de um ano
async function getHandler(request, { user }) {
  try {
    const { searchParams } = new URL(request.url);
    const ano = parseInt(searchParams.get('ano')) || new Date().getFullYear();

    const configs = await prisma.configuracaoMensalidade.findMany({
      where: { ano, lojaId: user.lojaId }
    });

    // Transformar em objeto { mes: { valorMensalidade, valorParcial } }
    const configsObj = {};
    configs.forEach(c => {
      configsObj[c.mes] = {
        valorMensalidade: c.valorMensalidade,
        valorParcial: c.valorParcial
      };
    });

    return NextResponse.json({ configs: configsObj });
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 });
  }
}

// POST - Salvar configurações de um mês
async function postHandler(request, { user }) {
  try {
    const { ano, mes, valorMensalidade, valorParcial } = await request.json();

    if (!ano || !mes) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Upsert (create or update)
    const lojaId = user.lojaId;
    await prisma.configuracaoMensalidade.upsert({
      where: { ano_mes_lojaId: { ano, mes, lojaId } },
      update: { valorMensalidade, valorParcial },
      create: { ano, mes, valorMensalidade, valorParcial, lojaId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    return NextResponse.json({ error: 'Erro ao salvar configurações' }, { status: 500 });
  }
}

// Configuração de mensalidades requer permissão 'mensalidades' (TESOUREIRO e ADMIN)
export const GET = withPermission('mensalidades')(getHandler);
export const POST = withPermission('mensalidades')(postHandler);
