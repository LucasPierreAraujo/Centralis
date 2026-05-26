// app/api/planilhas/pagamentos/route.js
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { recalcularTotais } from '../../../../lib/recalcularTotaisPlanilha';
import { withPermission } from '../../../../lib/authMiddleware';

// =====================================================================
// GET: Buscar pagamentos antecipados para um mês/ano específico
// =====================================================================
async function getHandler(request, { user }) {
  try {
    const { searchParams } = new URL(request.url);
    const mes = parseInt(searchParams.get('mes'));
    const ano = parseInt(searchParams.get('ano'));

    if (!mes || !ano) {
      return NextResponse.json({ error: 'mes e ano são obrigatórios' }, { status: 400 });
    }

    const mesesRef = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const mesFormatado = `${mesesRef[mes - 1]}/${String(ano).slice(-2)}`;

    const pagamentos = await prisma.pagamentoMensalidade.findMany({
      where: {
        quantidadeMeses: { gt: 0 },
        mesesReferentes: { contains: mesFormatado }
      },
      include: { membro: { select: { id: true, nome: true, cim: true } } }
    });

    return NextResponse.json(pagamentos);
  } catch (error) {
    console.error('Erro ao buscar pagamentos antecipados:', error);
    return NextResponse.json({ error: 'Erro ao buscar pagamentos' }, { status: 500 });
  }
}

export const GET = withPermission('financeiro')(getHandler);

// =====================================================================
// POST: Registrar pagamento de mensalidade
// =====================================================================
async function postHandler(request, { user }) {
  try {
    const { planilhaId, membroId, quantidadeMeses, valorPago, mesesReferentes, isento, antecipado } = await request.json();

    // Validação
    if (!planilhaId || !membroId || !quantidadeMeses || valorPago === undefined || !mesesReferentes) {
      return NextResponse.json({
        error: 'Dados incompletos para registrar pagamento'
      }, { status: 400 });
    }

    // Criar pagamento
    const pagamento = await prisma.pagamentoMensalidade.create({
      data: {
        planilhaId,
        membroId,
        quantidadeMeses,
        valorPago,
        mesesReferentes,
        antecipado: antecipado === true
      }
    });

    // Se isento, atualizar ControleMensalidade com status 'i' para cada mês referenciado
    // mesesReferentes formato: "JAN/25, FEV/25"
    if (isento) {
      const mesesList = mesesReferentes.split(',').map(m => m.trim());
      for (const mesRef of mesesList) {
        const [mesAbrev, anoAbrev] = mesRef.split('/');
        if (!mesAbrev || !anoAbrev) continue;
        const ano = 2000 + parseInt(anoAbrev);
        await prisma.controleMensalidade.upsert({
          where: { ano_membroId_mes: { ano, membroId, mes: mesAbrev } },
          update: { status: 'i' },
          create: { ano, membroId, mes: mesAbrev, status: 'i' }
        });
      }
    }

    // Recalcular totais da planilha
    await recalcularTotais(planilhaId);

    return NextResponse.json({
      success: true,
      pagamento
    });

  } catch (error) {
    console.error('Erro ao registrar pagamento:', error);
    return NextResponse.json(
      { error: 'Erro ao registrar pagamento', details: error.message },
      { status: 500 }
    );
  }
}

// =====================================================================
// DELETE: Cancelar um pagamento
// =====================================================================
async function deleteHandler(request, { user }) {
  try {
    const { pagamentoId, planilhaId } = await request.json();

    if (!pagamentoId || !planilhaId) {
      return NextResponse.json({ 
        error: 'IDs são obrigatórios para cancelar pagamento' 
      }, { status: 400 });
    }

    // Deletar pagamento
    await prisma.pagamentoMensalidade.delete({
      where: { id: pagamentoId }
    });

    // Recalcular totais após a exclusão
    await recalcularTotais(planilhaId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Pagamento cancelado com sucesso' 
    });

  } catch (error) {
    console.error('Erro ao cancelar pagamento:', error);
    return NextResponse.json(
      { error: 'Erro ao cancelar pagamento', details: error.message },
      { status: 500 }
    );
  }
}

// =====================================================================
// PUT: Atualizar um pagamento (usado para atualizar inadimplência)
// =====================================================================
async function putHandler(request, { user }) {
  try {
    const { pagamentoId, planilhaId, quantidadeMeses, mesesReferentes } = await request.json();

    if (!pagamentoId || !planilhaId) {
      return NextResponse.json({ 
        error: 'IDs são obrigatórios para atualizar pagamento' 
      }, { status: 400 });
    }

    // Atualizar pagamento
    const pagamento = await prisma.pagamentoMensalidade.update({
      where: { id: pagamentoId },
      data: {
        quantidadeMeses,
        mesesReferentes
      }
    });

    // Recalcular totais
    await recalcularTotais(planilhaId);
    
    return NextResponse.json({ 
      success: true, 
      pagamento 
    });

  } catch (error) {
    console.error('Erro ao atualizar pagamento:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar pagamento', details: error.message },
      { status: 500 }
    );
  }
}

// Gestão de pagamentos requer permissão 'financeiro' (TESOUREIRO e ADMIN)
export const POST = withPermission('financeiro')(postHandler);
export const DELETE = withPermission('financeiro')(deleteHandler);
export const PUT = withPermission('financeiro')(putHandler);
