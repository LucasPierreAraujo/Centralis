import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { withPermission } from '../../../lib/authMiddleware';
import { recalcularTotais } from '../../../lib/recalcularTotaisPlanilha';

// =====================================================================
// GET: Buscar todas as planilhas OU uma planilha específica por ID
// =====================================================================
async function getHandler(request, { user }) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Se tem ID, busca planilha específica
    if (id) {
      const planilha = await prisma.planilhaFinanceira.findFirst({
        where: { id, lojaId: user.lojaId },
        include: {
          pagamentos: {
            include: {
              membro: true,
            },
          },
          receitas: true,
          despesas: true,
          troncos: true,
          doacoesFilantropicas: true,
        },
      });

      if (!planilha) {
        return NextResponse.json({ error: 'Planilha não encontrada' }, { status: 404 });
      }

      return NextResponse.json(planilha);
    }

    // Se não tem ID, lista todas as planilhas (SEM includes para evitar erros)
    const planilhas = await prisma.planilhaFinanceira.findMany({
      where: { lojaId: user.lojaId },
      orderBy: [
        { ano: 'desc' },
        { mes: 'desc' },
      ],
      select: {
        id: true,
        mes: true,
        ano: true,
        valorMensalidade: true,
        valorMensalidadeExcecao: true,
        membrosExcecaoIds: true,
        saldoInicialCaixa: true,
        saldoInicialTronco: true,
        totalReceitas: true,
        totalDespesas: true,
        saldoFinalCaixa: true,
        saldoFinalTronco: true,
        totalTroncoRecebido: true,
        totalDoacoesFilantropicas: true,
        saldoFinal: true,
        createdAt: true,
        _count: {
          select: { 
            pagamentos: true 
          }
        }
      }
    });

    return NextResponse.json(planilhas);
  } catch (error) {
    console.error('Erro ao buscar planilha(s):', error);
    return NextResponse.json(
      { error: 'Erro ao buscar planilha(s)', details: error.message },
      { status: 500 }
    );
  }
}

// Gestão financeira requer permissão 'financeiro' (TESOUREIRO e ADMIN)
export const GET = withPermission('financeiro')(getHandler);

// =====================================================================
// POST: Criar uma nova planilha (COM REGISTRO DE INADIMPLÊNCIA INDIVIDUAL)
// =====================================================================
async function postHandler(request, { user }) {
  try {
    const {
        mes,
        ano,
        valorMensalidade,
        saldoInicialCaixa,
        saldoInicialTronco,
        excecoesPorMembro,
        valorMensalidadeExcecao,
        membrosExcecaoIds,
        inadimplenciaPorMembro,
        // Lista de IDs de membros que já pagaram antecipado
        antecipadosPorMembro
    } = await request.json();

    // 1. Verificação de existência
    const existe = await prisma.planilhaFinanceira.findFirst({
      where: { mes, ano, lojaId: user.lojaId }
    });

    if (existe) {
      return NextResponse.json({ error: 'Planilha já existe para este mês/ano' }, { status: 400 });
    }

    // 2. Criação da Planilha
    const caixaInicial = saldoInicialCaixa || 0;
    const troncoInicial = saldoInicialTronco || 0;

    // Processar exceções: novo formato (objeto) ou antigo (CSV)
    let excecaoValor = null;
    let excecaoIds = null;

    if (excecoesPorMembro && Object.keys(excecoesPorMembro).length > 0) {
      // NOVO FORMATO: Armazenar como JSON string no campo membrosExcecaoIds
      // Formato: {"membroId": valor, "membroId2": valor2, ...}
      excecaoIds = JSON.stringify(excecoesPorMembro);
      // Para compatibilidade, não usar valorMensalidadeExcecao único
      excecaoValor = null;
    } else if (valorMensalidadeExcecao && membrosExcecaoIds) {
      // FORMATO ANTIGO: valor único para todos
      excecaoValor = valorMensalidadeExcecao > 0 ? valorMensalidadeExcecao : null;
      excecaoIds = membrosExcecaoIds;
    }

    const planilha = await prisma.planilhaFinanceira.create({
      data: {
        lojaId: user.lojaId,
        mes,
        ano,
        valorMensalidade,
        saldoInicialCaixa: caixaInicial,
        saldoInicialTronco: troncoInicial,
        saldoFinalCaixa: caixaInicial,
        saldoFinalTronco: troncoInicial,
        saldoFinal: caixaInicial + troncoInicial,

        valorMensalidadeExcecao: excecaoValor,
        membrosExcecaoIds: excecaoIds
      }
    });
    
    const pagamentosInadimplencia = [];
    const mesesReferencia = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    
    // 3. Registro da Inadimplência
    if (inadimplenciaPorMembro && Object.keys(inadimplenciaPorMembro).length > 0) {
        
        for (const membroId in inadimplenciaPorMembro) {
            // O frontend envia [{mes: X, ano: Y}, ...]
            const mesesDevidos = inadimplenciaPorMembro[membroId]; 
            
            if (mesesDevidos.length > 0) {
                
                // Formata a string de meses referentes (ex: JAN/24, FEV/24)
                const mesesRefStr = mesesDevidos.map(m => 
                    `${mesesReferencia[m.mes - 1]}/${String(m.ano).slice(-2)}`
                ).join(', ');
                
                pagamentosInadimplencia.push({
                    planilhaId: planilha.id,
                    membroId: membroId,
                    // Marca como negativo para indicar DÍVIDA (registro de inadimplência)
                    quantidadeMeses: mesesDevidos.length * -1, 
                    valorPago: 0, // Inadimplência não tem valor pago
                    mesesReferentes: mesesRefStr,
                    dataPagamento: new Date(),
                });
            }
        }
        
        if (pagamentosInadimplencia.length > 0) {
            await prisma.pagamentoMensalidade.createMany({
                data: pagamentosInadimplencia,
            });
        }
    }
    
    // Registrar pagamentos antecipados marcados manualmente
    if (antecipadosPorMembro && antecipadosPorMembro.length > 0) {
      const mesFormatado = `${mesesReferencia[mes - 1]}/${String(ano).slice(-2)}`;
      for (const membroId of antecipadosPorMembro) {
        await prisma.pagamentoMensalidade.create({
          data: {
            planilhaId: planilha.id,
            membroId,
            quantidadeMeses: 1,
            valorPago: valorMensalidade,
            mesesReferentes: mesFormatado,
            antecipado: true
          }
        });
      }
      await recalcularTotais(planilha.id);
    }

    return NextResponse.json({
      success: true,
      planilha
    });

  } catch (error) {
    console.error('Erro ao criar planilha:', error);
    return NextResponse.json(
        { error: 'Erro ao criar planilha', details: error.message },
        { status: 500 }
    );
  }
}

export const POST = withPermission('financeiro')(postHandler);

// =====================================================================
// PUT: Editar uma planilha existente
// =====================================================================
async function putHandler(request, { user }) {
  try {
    const {
      id,
      mes,
      ano,
      valorMensalidade,
      saldoInicialCaixa,
      saldoInicialTronco,
      excecoesPorMembro,
      inadimplenciaPorMembro,
    } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID da planilha é obrigatório' }, { status: 400 });
    }

    const planilhaExistente = await prisma.planilhaFinanceira.findFirst({
      where: { id, lojaId: user.lojaId },
    });

    if (!planilhaExistente) {
      return NextResponse.json({ error: 'Planilha não encontrada' }, { status: 404 });
    }

    // Verificar se já existe outra planilha com mesmo mês/ano
    if (mes !== planilhaExistente.mes || ano !== planilhaExistente.ano) {
      const duplicada = await prisma.planilhaFinanceira.findFirst({
        where: { mes, ano, NOT: { id } },
      });
      if (duplicada) {
        return NextResponse.json({ error: 'Já existe outra planilha para este mês/ano' }, { status: 400 });
      }
    }

    const caixaInicial = saldoInicialCaixa || 0;
    const troncoInicial = saldoInicialTronco || 0;

    // Processar exceções
    let excecaoValor = null;
    let excecaoIds = null;

    if (excecoesPorMembro && Object.keys(excecoesPorMembro).length > 0) {
      excecaoIds = JSON.stringify(excecoesPorMembro);
      excecaoValor = null;
    }

    // Recalcular saldo final considerando receitas e despesas existentes
    const totalReceitas = Number(planilhaExistente.totalReceitas) || 0;
    const totalDespesas = Number(planilhaExistente.totalDespesas) || 0;
    const totalTroncoRecebido = Number(planilhaExistente.totalTroncoRecebido) || 0;
    const totalDoacoes = Number(planilhaExistente.totalDoacoesFilantropicas) || 0;

    const saldoFinalCaixa = caixaInicial + totalReceitas - totalDespesas;
    const saldoFinalTronco = troncoInicial + totalTroncoRecebido - totalDoacoes;

    const planilha = await prisma.planilhaFinanceira.update({
      where: { id },
      data: {
        mes,
        ano,
        valorMensalidade,
        saldoInicialCaixa: caixaInicial,
        saldoInicialTronco: troncoInicial,
        saldoFinalCaixa,
        saldoFinalTronco,
        saldoFinal: saldoFinalCaixa + saldoFinalTronco,
        valorMensalidadeExcecao: excecaoValor,
        membrosExcecaoIds: excecaoIds,
      },
    });

    // Atualizar inadimplência: remover antigas e criar novas
    if (inadimplenciaPorMembro !== undefined) {
      // Remover inadimplências antigas (quantidadeMeses negativo = inadimplência)
      await prisma.pagamentoMensalidade.deleteMany({
        where: {
          planilhaId: id,
          quantidadeMeses: { lt: 0 },
        },
      });

      // Criar novas inadimplências
      const mesesReferencia = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      const pagamentosInadimplencia = [];

      if (inadimplenciaPorMembro && Object.keys(inadimplenciaPorMembro).length > 0) {
        for (const membroId in inadimplenciaPorMembro) {
          const mesesDevidos = inadimplenciaPorMembro[membroId];
          if (mesesDevidos.length > 0) {
            const mesesRefStr = mesesDevidos.map(m =>
              `${mesesReferencia[m.mes - 1]}/${String(m.ano).slice(-2)}`
            ).join(', ');

            pagamentosInadimplencia.push({
              planilhaId: id,
              membroId,
              quantidadeMeses: mesesDevidos.length * -1,
              valorPago: 0,
              mesesReferentes: mesesRefStr,
              dataPagamento: new Date(),
            });
          }
        }

        if (pagamentosInadimplencia.length > 0) {
          await prisma.pagamentoMensalidade.createMany({
            data: pagamentosInadimplencia,
          });
        }
      }
    }

    return NextResponse.json({ success: true, planilha });
  } catch (error) {
    console.error('Erro ao atualizar planilha:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar planilha', details: error.message },
      { status: 500 }
    );
  }
}

export const PUT = withPermission('financeiro')(putHandler);

// =====================================================================
// DELETE: Excluir uma planilha
// =====================================================================
async function deleteHandler(request, { user }) {
  try {
    const { id } = await request.json();

    if (!id) {
        return NextResponse.json({ error: 'ID da planilha é obrigatório' }, { status: 400 });
    }
    
    await prisma.planilhaFinanceira.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Planilha excluída com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir planilha:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir planilha.' },
      { status: 500 }
    );
  }
}

export const DELETE = withPermission('financeiro')(deleteHandler);