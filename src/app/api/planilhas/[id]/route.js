import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { recalcularTotais } from '../../../../lib/recalcularTotaisPlanilha';
import { withPermission } from '../../../../lib/authMiddleware';

// POST: Adicionar lançamento (receita, despesa, tronco, filantropia)
async function postHandler(request, { params, user }) {
  try {
    const { id: planilhaId } = await params; // Next.js 15 requer await
    const { tipo, ...data } = await request.json();

    let novoLancamento;

    // Criar lançamento baseado no tipo
    if (tipo === 'receita') {
      const { descricao, valor, data: dataLancamento } = data;
      
      if (!descricao || !dataLancamento) {
        return NextResponse.json({ error: 'Descrição e data são obrigatórios' }, { status: 400 });
      }

      novoLancamento = await prisma.receita.create({
        data: {
          planilhaId,
          descricao,
          valor: parseFloat(valor),
          data: new Date(dataLancamento + 'T12:00:00Z'), // Meio-dia UTC para evitar problemas de fuso horário
        }
      });
    } 
    else if (tipo === 'despesa') {
      const { descricao, valor, tipoGasto, data: dataLancamento } = data;
      
      if (!descricao || !tipoGasto || !dataLancamento) {
        return NextResponse.json({ error: 'Descrição, tipo de gasto e data são obrigatórios' }, { status: 400 });
      }

      // Validar tipoGasto
      if (tipoGasto !== 'FIXO' && tipoGasto !== 'VARIAVEL') {
        return NextResponse.json({ error: 'Tipo de gasto deve ser FIXO ou VARIAVEL' }, { status: 400 });
      }

      novoLancamento = await prisma.despesa.create({
        data: {
          planilhaId,
          descricao,
          valor: parseFloat(valor),
          categoria: 'GERAL', // Valor padrão
          tipoGasto: tipoGasto, // Já vem como string 'FIXO' ou 'VARIAVEL'
          data: new Date(dataLancamento + 'T12:00:00Z'), // Meio-dia UTC para evitar problemas de fuso horário
        }
      });
    } 
    else if (tipo === 'tronco') {
      const { grauSessao, valor, dataSessao, dataDeposito } = data;
      
      if (!grauSessao || !dataSessao || !dataDeposito) {
        return NextResponse.json({ error: 'Grau, data da sessão e data do depósito são obrigatórios' }, { status: 400 });
      }

      novoLancamento = await prisma.tronco.create({
        data: {
          planilhaId,
          grauSessao,
          valor: parseFloat(valor),
          data: new Date(dataSessao + 'T12:00:00Z'), // Meio-dia UTC para evitar problemas de fuso horário
          dataDeposito: new Date(dataDeposito + 'T12:00:00Z'),
        }
      });
    } 
    else if (tipo === 'filantropia') {
      const { descricao, valor, data: dataLancamento } = data;
      
      if (!descricao || !dataLancamento) {
        return NextResponse.json({ error: 'Descrição e data são obrigatórios' }, { status: 400 });
      }

      novoLancamento = await prisma.doacaoFilantropica.create({
        data: {
          planilhaId,
          descricao,
          valor: parseFloat(valor),
          dataPagamento: new Date(dataLancamento + 'T12:00:00Z'), // Meio-dia UTC para evitar problemas de fuso horário
        }
      });
    } 
    else {
      return NextResponse.json({ error: 'Tipo de lançamento inválido' }, { status: 400 });
    }

    // Recalcular totais
    await recalcularTotais(planilhaId);

    return NextResponse.json({ success: true, lancamento: novoLancamento });

  } catch (error) {
    console.error('Erro ao adicionar lançamento:', error);
    return NextResponse.json(
      { error: 'Erro ao adicionar lançamento', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Excluir lançamento
async function deleteHandler(request, { params, user }) {
  try {
    const { id: planilhaId } = await params; // Next.js 15 requer await
    const { tipo, id } = await request.json();

    if (!tipo || !id) {
      return NextResponse.json({ error: 'Tipo e ID são obrigatórios' }, { status: 400 });
    }

    // Excluir baseado no tipo
    if (tipo === 'receita') {
      await prisma.receita.delete({ where: { id } });
    } else if (tipo === 'despesa') {
      await prisma.despesa.delete({ where: { id } });
    } else if (tipo === 'tronco') {
      await prisma.tronco.delete({ where: { id } });
    } else if (tipo === 'filantropia') {
      await prisma.doacaoFilantropica.delete({ where: { id } });
    } else {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }

    // Recalcular totais
    await recalcularTotais(planilhaId);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro ao excluir lançamento:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir lançamento', details: error.message },
      { status: 500 }
    );
  }
}

// PUT: Editar lançamento existente
async function putHandler(request, { params, user }) {
  try {
    const { id: planilhaId } = await params;
    const { tipo, id, ...data } = await request.json();

    if (!tipo || !id) {
      return NextResponse.json({ error: 'Tipo e ID são obrigatórios' }, { status: 400 });
    }

    let lancamentoAtualizado;

    if (tipo === 'receita') {
      const { descricao, valor, data: dataLancamento } = data;

      if (!descricao || !dataLancamento) {
        return NextResponse.json({ error: 'Descrição e data são obrigatórios' }, { status: 400 });
      }

      lancamentoAtualizado = await prisma.receita.update({
        where: { id },
        data: {
          descricao,
          valor: parseFloat(valor),
          data: new Date(dataLancamento + 'T12:00:00Z'),
        }
      });
    }
    else if (tipo === 'despesa') {
      const { descricao, valor, tipoGasto, data: dataLancamento } = data;

      if (!descricao || !tipoGasto || !dataLancamento) {
        return NextResponse.json({ error: 'Descrição, tipo de gasto e data são obrigatórios' }, { status: 400 });
      }

      lancamentoAtualizado = await prisma.despesa.update({
        where: { id },
        data: {
          descricao,
          valor: parseFloat(valor),
          tipoGasto,
          data: new Date(dataLancamento + 'T12:00:00Z'),
        }
      });
    }
    else if (tipo === 'tronco') {
      const { grauSessao, valor, dataSessao, dataDeposito } = data;

      if (!grauSessao || !dataSessao || !dataDeposito) {
        return NextResponse.json({ error: 'Grau, data da sessão e data do depósito são obrigatórios' }, { status: 400 });
      }

      lancamentoAtualizado = await prisma.tronco.update({
        where: { id },
        data: {
          grauSessao,
          valor: parseFloat(valor),
          data: new Date(dataSessao + 'T12:00:00Z'),
          dataDeposito: new Date(dataDeposito + 'T12:00:00Z'),
        }
      });
    }
    else if (tipo === 'filantropia') {
      const { descricao, valor, data: dataLancamento } = data;

      if (!descricao || !dataLancamento) {
        return NextResponse.json({ error: 'Descrição e data são obrigatórios' }, { status: 400 });
      }

      lancamentoAtualizado = await prisma.doacaoFilantropica.update({
        where: { id },
        data: {
          descricao,
          valor: parseFloat(valor),
          dataPagamento: new Date(dataLancamento + 'T12:00:00Z'),
        }
      });
    }
    else {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }

    // Recalcular totais
    await recalcularTotais(planilhaId);

    return NextResponse.json({ success: true, lancamento: lancamentoAtualizado });

  } catch (error) {
    console.error('Erro ao editar lançamento:', error);
    return NextResponse.json(
      { error: 'Erro ao editar lançamento', details: error.message },
      { status: 500 }
    );
  }
}

// Gestão financeira requer permissão 'financeiro' (TESOUREIRO e ADMIN)
export const POST = withPermission('financeiro')(postHandler);
export const PUT = withPermission('financeiro')(putHandler);
export const DELETE = withPermission('financeiro')(deleteHandler);
