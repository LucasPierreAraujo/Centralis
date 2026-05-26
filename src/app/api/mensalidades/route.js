import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { withPermission } from '../../../lib/authMiddleware';

const prisma = new PrismaClient();

// GET - Buscar pagamentos de um ano
async function getHandler(request, { user }) {
  try {
    const { searchParams } = new URL(request.url);
    const ano = parseInt(searchParams.get('ano')) || new Date().getFullYear();

    const pagamentos = await prisma.controleMensalidade.findMany({
      where: { ano, lojaId: user.lojaId }
    });

    // Transformar em objeto { membroId: { mes: status } }
    const pagamentosObj = {};
    pagamentos.forEach(p => {
      if (!pagamentosObj[p.membroId]) {
        pagamentosObj[p.membroId] = {};
      }
      pagamentosObj[p.membroId][p.mes] = p.status;
    });

    return NextResponse.json({ pagamentos: pagamentosObj });
  } catch (error) {
    console.error('Erro ao buscar pagamentos:', error);
    return NextResponse.json({ error: 'Erro ao buscar pagamentos' }, { status: 500 });
  }
}

// POST - Salvar/Atualizar pagamento
async function postHandler(request, { user }) {
  try {
    const { ano, membroId, mes, status } = await request.json();

    console.log('=== Salvando pagamento ===');
    console.log('Dados recebidos:', { ano, membroId, mes, status });

    if (!ano || !membroId || !mes) {
      console.error('Dados incompletos:', { ano, membroId, mes });
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const lojaId = user.lojaId;

    if (status === null) {
      console.log('Deletando registro...');
      const resultado = await prisma.controleMensalidade.deleteMany({
        where: { ano, membroId, mes, lojaId }
      });
      console.log('Registros deletados:', resultado.count);
    } else {
      console.log('Executando upsert...');
      const resultado = await prisma.controleMensalidade.upsert({
        where: {
          ano_membroId_mes_lojaId: { ano, membroId, mes, lojaId }
        },
        update: { status },
        create: { ano, membroId, mes, status, lojaId }
      });
      console.log('Upsert concluído:', resultado);
    }

    console.log('Pagamento salvo com sucesso!');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao salvar pagamento:', error);
    console.error('Stack:', error.stack);
    return NextResponse.json({ error: 'Erro ao salvar pagamento', details: error.message }, { status: 500 });
  }
}

// Controle de mensalidades requer permissão 'mensalidades' (TESOUREIRO e ADMIN)
export const GET = withPermission('mensalidades')(getHandler);
export const POST = withPermission('mensalidades')(postHandler);
