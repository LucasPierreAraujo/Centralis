
import { prisma } from './prisma'; 

export async function recalcularTotais(planilhaId) {
  const planilha = await prisma.planilhaFinanceira.findUnique({
    where: { id: planilhaId },
    include: { 
      pagamentos: true, 
      receitas: true, 
      despesas: true,
      troncos: true, // Novo
      doacoesFilantropicas: true // Novo
    }
  });

  if (!planilha) return;

 
  const totalMensalidades = planilha.pagamentos.reduce(
    (sum, p) => sum + Number(p.valorPago), 0
  );
  const totalOutrosRecebimentos = planilha.receitas.reduce(
    (sum, r) => sum + Number(r.valor), 0
  );
  const totalReceitasCaixa = totalMensalidades + totalOutrosRecebimentos;
  
  const totalDespesasCaixa = planilha.despesas.reduce(
    (sum, d) => sum + Number(d.valor), 0
  );

  const saldoFinalCaixa = Number(planilha.saldoInicialCaixa) + totalReceitasCaixa - totalDespesasCaixa;

 
  const totalTroncoRecebido = planilha.troncos.reduce(
    (sum, t) => sum + Number(t.valor), 0
  );
  const totalDoacoesFilantropicas = planilha.doacoesFilantropicas.reduce(
    (sum, d) => sum + Number(d.valor), 0
  );
  
  const saldoFinalTronco = Number(planilha.saldoInicialTronco) + totalTroncoRecebido - totalDoacoesFilantropicas;


  await prisma.planilhaFinanceira.update({
    where: { id: planilhaId },
    data: {
      totalReceitas: totalReceitasCaixa,
      totalDespesas: totalDespesasCaixa,
      saldoFinalCaixa,

      totalTroncoRecebido,
      totalDoacoesFilantropicas,
      saldoFinalTronco,
      
      saldoFinal: saldoFinalCaixa + saldoFinalTronco,
    }
  });
}