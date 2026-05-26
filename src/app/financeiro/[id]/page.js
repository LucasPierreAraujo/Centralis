"use client"
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Download, Check, X, DollarSign, Briefcase, BookOpen, Home, Undo2, Pencil } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmDialog';
import Breadcrumbs from '../../components/Breadcrumbs';

export default function DetalhePlanilhaPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const confirm = useConfirm();
  const planilhaId = params.id;

  const [planilha, setPlanilha] = useState(null);
  const [membros, setMembros] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [assinaturas, setAssinaturas] = useState({});
  const [localidade, setLocalidade] = useState('CRATO-CE'); 
  const [diaAssinatura, setDiaAssinatura] = useState(new Date().getDate()); 
  const [mesAssinatura, setMesAssinatura] = useState(new Date().getMonth() + 1); 
  const [anoAssinatura, setAnoAssinatura] = useState(new Date().getFullYear()); 
  
  // Mensalidade de Exceção - Agora suporta valores individuais por membro
  // Formato: { membroId: valor, ... } OU lista de IDs (formato antigo)
  const [excecoesPorMembro, setExcecoesPorMembro] = useState({});

  // Estados para pagamento
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [membroSelecionado, setMembroSelecionado] = useState(null);
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState(null);
  const [mesesPagar, setMesesPagar] = useState(1);
  const [mesReferenciaPagamento, setMesReferenciaPagamento] = useState(new Date().getMonth() + 1);
  const [anoReferenciaPagamento, setAnoReferenciaPagamento] = useState(new Date().getFullYear());
  const [valorCustomizado, setValorCustomizado] = useState('');
  const [usarValorCustomizado, setUsarValorCustomizado] = useState(false);
  const [isento, setIsento] = useState(false);
  const [isAntecipado, setIsAntecipado] = useState(false);

  // Estados para Outros Recebimentos/Despesas
  const [showLancamentoModal, setShowLancamentoModal] = useState(false);
  const [tipoLancamento, setTipoLancamento] = useState('receita'); 
  const [descricaoLancamento, setDescricaoLancamento] = useState('');
  const [valorLancamento, setValorLancamento] = useState('');
  const [categoriaLancamento, setCategoriaLancamento] = useState('');
  const [tipoGasto, setTipoGasto] = useState('VARIAVEL');
  const [dataLancamento, setDataLancamento] = useState(new Date().toISOString().split('T')[0]);

  // Estados para Tronco de Beneficência
  const [showTroncoModal, setShowTroncoModal] = useState(false);
  const [grauSessao, setGrauSessao] = useState('');
  const [descricaoFilantropia, setDescricaoFilantropia] = useState('');
  const [valorTronco, setValorTronco] = useState('');
  const [dataSessaoTronco, setDataSessaoTronco] = useState(new Date().toISOString().split('T')[0]);
  const [dataDepositoTronco, setDataDepositoTronco] = useState(new Date().toISOString().split('T')[0]);
  const [dataFilantropia, setDataFilantropia] = useState(new Date().toISOString().split('T')[0]);

  // Estados para Edição
  const [modoEdicao, setModoEdicao] = useState(false);
  const [itemEditando, setItemEditando] = useState(null);

  const meses = [
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
  ];

  const categoriasDespesas = [
    'DESPESAS DE CUSTEIO',
    'DESPESAS DE ORDEM SOCIAL',
    'DESPESAS ADMINISTRATIVAS',
    'OUTRAS DESPESAS'
  ];
  
  const grausSessao = [
    'APRENDIZ', 'COMPANHEIRO', 'MESTRE'
  ];

  useEffect(() => {
    if (planilhaId) {
      carregarDados();
      carregarAssinaturas();
    }
  }, [planilhaId]);

  const carregarAssinaturas = async () => {
    try {
      const res = await fetch('/api/membros?assinaturas=true');
      const data = await res.json();
      if (data.success) {
        setAssinaturas(data.assinaturas);
      }
    } catch (error) {
      console.error('Erro ao carregar assinaturas:', error);
    }
  };

  const carregarDados = async () => {
    console.log("Planilha ID sendo buscado na rota:", planilhaId); 
    
    try {
      setLoading(true);
      
      const resPlanilha = await fetch(`/api/planilhas?id=${planilhaId}`);
      
      if (!resPlanilha.ok) {
          if (resPlanilha.status === 404) {
              console.error(`Planilha ID ${planilhaId} não encontrada no banco (404).`);
              setPlanilha(null);
              return; 
          }
          throw new Error(`Erro ao buscar planilha: ${resPlanilha.statusText}`);
      }
      
      const dataPlanilha = await resPlanilha.json(); 

      const resMembros = await fetch('/api/membros?financeiro=true'); 
      const dataMembros = await resMembros.json();

      setPlanilha(dataPlanilha);
      setMembros(dataMembros);
      
      setMesReferenciaPagamento(dataPlanilha.mes);
      setAnoReferenciaPagamento(dataPlanilha.ano);
      
      // Parsear exceções: pode ser JSON (novo formato) ou CSV (formato antigo)
      if (dataPlanilha.membrosExcecaoIds) {
        try {
          // Tentar parsear como JSON (novo formato: { membroId: valor, ... })
          const excecoes = JSON.parse(dataPlanilha.membrosExcecaoIds);
          if (typeof excecoes === 'object' && !Array.isArray(excecoes)) {
            setExcecoesPorMembro(excecoes);
          } else {
            // Fallback: formato antigo (CSV de IDs)
            const ids = dataPlanilha.membrosExcecaoIds.split(',');
            const excecaoValor = dataPlanilha.valorMensalidadeExcecao || 0;
            const excecoesObj = {};
            ids.forEach(id => {
              if (id.trim()) excecoesObj[id.trim()] = Number(excecaoValor);
            });
            setExcecoesPorMembro(excecoesObj);
          }
        } catch {
          // Se não for JSON válido, trata como CSV (formato antigo)
          const ids = dataPlanilha.membrosExcecaoIds.split(',');
          const excecaoValor = dataPlanilha.valorMensalidadeExcecao || 0;
          const excecoesObj = {};
          ids.forEach(id => {
            if (id.trim()) excecoesObj[id.trim()] = Number(excecaoValor);
          });
          setExcecoesPorMembro(excecoesObj);
        }
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error(`Falha ao carregar dados: ${error.message}. Verifique o console.`); 
    } finally {
      setLoading(false);
    }
  };

  const abrirModalPagamento = (membro, pagamento = null) => {
    setMembroSelecionado(membro);
    setPagamentoSelecionado(pagamento);
    setUsarValorCustomizado(false);
    setValorCustomizado('');
    setIsento(false);
    setIsAntecipado(false);
    setMesReferenciaPagamento(planilha?.mes ?? new Date().getMonth() + 1);
    setAnoReferenciaPagamento(planilha?.ano ?? new Date().getFullYear());

    if (pagamento && pagamento.quantidadeMeses < 0) {
      setMesesPagar(Math.abs(pagamento.quantidadeMeses));
    } else {
      setMesesPagar(1);
    }

    setShowPagamentoModal(true);
  };

  const registrarPagamento = async () => {
    if (!membroSelecionado || !planilha) return;

    // Calcular valor da mensalidade usando o novo formato de exceções individuais
    let valorMensalidadeUnitario = Number(planilha.valorMensalidade);

    // Verificar se o membro tem valor de exceção individual
    if (excecoesPorMembro[membroSelecionado.id] !== undefined) {
      valorMensalidadeUnitario = Number(excecoesPorMembro[membroSelecionado.id]);
    }

    // Usar valor customizado se habilitado, ou zero se isento
    let valorTotal;
    if (isento) {
      valorTotal = 0;
    } else if (usarValorCustomizado && valorCustomizado) {
      valorTotal = parseFloat(valorCustomizado.replace(/\./g, '').replace(',', '.'));
      if (isNaN(valorTotal) || valorTotal <= 0) {
        toast.error('Valor inválido. Digite um valor maior que zero.');
        return;
      }
    } else {
      valorTotal = valorMensalidadeUnitario * mesesPagar;
    }

    // Se for inadimplência, usa os meses do registro de dívida
    let mesesRef = [];

    if (pagamentoSelecionado && pagamentoSelecionado.quantidadeMeses < 0) {
      mesesRef = [pagamentoSelecionado.mesesReferentesExibicao || pagamentoSelecionado.mesesReferentes];
    } else {
      for (let i = 0; i < mesesPagar; i++) {
        const mesAtual = mesReferenciaPagamento - i;
        const anoAtual = mesAtual > 0 ? anoReferenciaPagamento : anoReferenciaPagamento - 1;
        const mesAjustado = mesAtual > 0 ? mesAtual : 12 + mesAtual;
        mesesRef.push(`${meses[mesAjustado - 1].substring(0,3)}/${String(anoAtual).slice(-2)}`);
      }
      mesesRef = mesesRef.reverse();
    }

    // VALIDAÇÃO: Verificar se algum dos meses que está tentando pagar já foi pago (se não for inadimplência)
    if (!pagamentoSelecionado || pagamentoSelecionado.quantidadeMeses >= 0) {
      const mesesParaPagar = mesesRef.join(', ');
      const mesesJaPagos = [];

      for (const pagamento of planilha.pagamentos) {
        if (pagamento.membroId === membroSelecionado.id && pagamento.quantidadeMeses > 0) {
          const mesesDoPagamento = pagamento.mesesReferentes.split(',').map(m => m.trim());
          for (const mes of mesesDoPagamento) {
            if (mesesParaPagar.includes(mes)) {
              mesesJaPagos.push(mes);
            }
          }
        }
      }

      if (mesesJaPagos.length > 0) {
        toast.warning(`Este membro já pagou o(s) seguinte(s) mês(es): ${mesesJaPagos.join(', ')}`);
        return;
      }
    }

    try {
      // Se estiver pagando uma inadimplência, atualiza o registro removendo apenas o mês quitado
      if (pagamentoSelecionado && pagamentoSelecionado.quantidadeMeses < 0) {
        // Usar meses originais do banco (não o mês individual da exibição)
        const mesesDevidos = pagamentoSelecionado.mesesReferentes.split(',').map(m => m.trim());
        const mesQuitado = pagamentoSelecionado.mesesReferentesExibicao || mesesDevidos[0];

        // Remover apenas o mês quitado da lista original
        const mesesRestantes = mesesDevidos.filter(m => m !== mesQuitado);

        if (mesesRestantes.length > 0) {
          await fetch('/api/planilhas/pagamentos', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pagamentoId: pagamentoSelecionado.id,
              quantidadeMeses: -mesesRestantes.length,
              mesesReferentes: mesesRestantes.join(', '),
              planilhaId
            })
          });
        } else {
          await fetch('/api/planilhas/pagamentos', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pagamentoId: pagamentoSelecionado.id,
              planilhaId
            })
          });
        }

        mesesRef = [mesQuitado];
      }

      // Registra o pagamento
      const response = await fetch('/api/planilhas/pagamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planilhaId,
          membroId: membroSelecionado.id,
          quantidadeMeses: mesesPagar,
          valorPago: valorTotal,
          mesesReferentes: Array.isArray(mesesRef) ? mesesRef.join(', ') : mesesRef,
          isento,
          antecipado: isAntecipado
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao registrar pagamento.');
      }

      console.log('Pagamento registrado com sucesso!');
      setShowPagamentoModal(false);
      setPagamentoSelecionado(null);
      setUsarValorCustomizado(false);
      setValorCustomizado('');
      setIsento(false);
      setIsAntecipado(false);
      carregarDados();
    } catch (error) {
      console.error('Erro:', error);
      toast.error(error.message);
    }
  };
  
  const cancelarPagamento = async (pagamentoId) => {
      const confirmed = await confirm.confirm({
        title: 'Cancelar Pagamento',
        message: 'Deseja realmente cancelar este pagamento? O saldo será revertido e esta ação não pode ser desfeita.',
        confirmText: 'Cancelar Pagamento',
        cancelText: 'Voltar',
        type: 'warning'
      });

      if (!confirmed) return;

      try {
          const response = await fetch('/api/planilhas/pagamentos', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pagamentoId, planilhaId })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Falha ao cancelar pagamento.');
          }
          
          console.log('Pagamento cancelado com sucesso!');
          carregarDados();
      } catch (error) {
          console.error('Erro ao cancelar pagamento:', error);
          toast.error(error.message);
      }
  };

  const adicionarLancamento = async () => {
    let payload = { planilhaId };

    if (tipoLancamento === 'receita' || tipoLancamento === 'despesa') {
      if (!descricaoLancamento || !valorLancamento || !dataLancamento) {
        toast.error('Preencha a descrição, o valor e a data');
        return;
      }
      
      const valorNumerico = parseFloat(valorLancamento.replace(/\./g, '').replace(',', '.'));

      payload = {
        ...payload,
        tipo: tipoLancamento,
        descricao: descricaoLancamento,
        valor: valorNumerico,
        data: dataLancamento,
      };

      if (tipoLancamento === 'despesa') {
        if (!tipoGasto) {
          toast.error('Selecione o tipo de gasto');
          return;
        }
        payload.tipoGasto = tipoGasto; 
      }
    } 
    
    else if (tipoLancamento === 'tronco' || tipoLancamento === 'filantropia') {
      if (!valorTronco) {
        toast.error('Preencha o valor.');
        return;
      }
      
      const valorNumerico = parseFloat(valorTronco.replace(/\./g, '').replace(',', '.'));

      payload = {
        ...payload,
        tipo: tipoLancamento,
        valor: valorNumerico,
      };
      
      if (tipoLancamento === 'tronco') {
        if (!grauSessao || !dataSessaoTronco || !dataDepositoTronco) { 
          toast.error('Selecione o grau da sessão, data da sessão e data do depósito.'); 
          return; 
        }
        payload.grauSessao = grauSessao;
        payload.dataSessao = dataSessaoTronco;
        payload.dataDeposito = dataDepositoTronco;
      }
      if (tipoLancamento === 'filantropia') {
        if (!descricaoFilantropia || !dataFilantropia) { 
          toast.error('Preencha a descrição da doação e a data.'); 
          return; 
        }
        payload.descricao = descricaoFilantropia;
        payload.data = dataFilantropia;
      }
    }

    try {
      const response = await fetch(`/api/planilhas/${planilhaId}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log(`Lançamento (${tipoLancamento}) adicionado com sucesso!`); 
        setShowLancamentoModal(false);
        setShowTroncoModal(false);
        carregarDados();
      } else {
        const errorData = await response.json();
        console.error('Erro ao adicionar lançamento:', response.status, errorData.error);
        toast.error(`Erro ao adicionar lançamento: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Erro ao adicionar lançamento:', error);
      toast.error('Erro ao adicionar lançamento. Verifique a conexão.');
    }
  };

  const excluirLancamento = async (tipo, id) => {
    const confirmed = await confirm.confirm({
      title: `Excluir ${tipo === 'receita' ? 'Receita' : 'Despesa'}`,
      message: `Deseja realmente excluir esta ${tipo}? Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      await fetch(`/api/planilhas/${planilhaId}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, id, planilhaId })
      });

      console.log(`${tipo} excluída com sucesso!`); 
      carregarDados();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao excluir lançamento.');
    }
  };

  const abrirModalLancamentoCaixa = (tipo, item = null) => {
      setTipoLancamento(tipo);
      setModoEdicao(!!item);
      setItemEditando(item);

      if (item) {
        // Modo edição - preencher com dados existentes
        setDescricaoLancamento(item.descricao || '');
        setValorLancamento(formatarValor(String(Math.round(Number(item.valor) * 100))));
        setTipoGasto(item.tipoGasto || 'VARIAVEL');
        // Converter data para formato YYYY-MM-DD
        const dataItem = new Date(item.data);
        setDataLancamento(dataItem.toISOString().split('T')[0]);
      } else {
        // Modo criação - limpar campos
        setDescricaoLancamento('');
        setValorLancamento('');
        setCategoriaLancamento('');
        setTipoGasto('VARIAVEL');
        setDataLancamento(new Date().toISOString().split('T')[0]);
      }
      setShowLancamentoModal(true);
  };

  const abrirModalTronco = (tipo, item = null) => {
      setTipoLancamento(tipo);
      setModoEdicao(!!item);
      setItemEditando(item);

      if (item) {
        // Modo edição - preencher com dados existentes
        setValorTronco(formatarValor(String(Math.round(Number(item.valor) * 100))));

        if (tipo === 'tronco') {
          setGrauSessao(item.grauSessao || '');
          const dataSessao = new Date(item.data);
          const dataDeposito = new Date(item.dataDeposito);
          setDataSessaoTronco(dataSessao.toISOString().split('T')[0]);
          setDataDepositoTronco(dataDeposito.toISOString().split('T')[0]);
        } else {
          setDescricaoFilantropia(item.descricao || '');
          const dataDoacao = new Date(item.dataPagamento);
          setDataFilantropia(dataDoacao.toISOString().split('T')[0]);
        }
      } else {
        // Modo criação - limpar campos
        setValorTronco('');
        setGrauSessao('');
        setDescricaoFilantropia('');
        setDataSessaoTronco(new Date().toISOString().split('T')[0]);
        setDataDepositoTronco(new Date().toISOString().split('T')[0]);
        setDataFilantropia(new Date().toISOString().split('T')[0]);
      }
      setShowTroncoModal(true);
  };

  const editarLancamento = async () => {
    if (!itemEditando) return;

    let payload = {
      planilhaId,
      tipo: tipoLancamento,
      id: itemEditando.id,
    };

    if (tipoLancamento === 'receita' || tipoLancamento === 'despesa') {
      if (!descricaoLancamento || !valorLancamento || !dataLancamento) {
        toast.error('Preencha todos os campos');
        return;
      }

      const valorNumerico = parseFloat(valorLancamento.replace(/\./g, '').replace(',', '.'));
      payload.descricao = descricaoLancamento;
      payload.valor = valorNumerico;
      payload.data = dataLancamento;

      if (tipoLancamento === 'despesa') {
        payload.tipoGasto = tipoGasto;
      }
    } else if (tipoLancamento === 'tronco') {
      if (!valorTronco || !grauSessao || !dataSessaoTronco || !dataDepositoTronco) {
        toast.error('Preencha todos os campos');
        return;
      }

      const valorNumerico = parseFloat(valorTronco.replace(/\./g, '').replace(',', '.'));
      payload.valor = valorNumerico;
      payload.grauSessao = grauSessao;
      payload.dataSessao = dataSessaoTronco;
      payload.dataDeposito = dataDepositoTronco;
    } else if (tipoLancamento === 'filantropia') {
      if (!valorTronco || !descricaoFilantropia || !dataFilantropia) {
        toast.error('Preencha todos os campos');
        return;
      }

      const valorNumerico = parseFloat(valorTronco.replace(/\./g, '').replace(',', '.'));
      payload.valor = valorNumerico;
      payload.descricao = descricaoFilantropia;
      payload.data = dataFilantropia;
    }

    try {
      const response = await fetch(`/api/planilhas/${planilhaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success('Lançamento atualizado com sucesso!');
        setShowLancamentoModal(false);
        setShowTroncoModal(false);
        setModoEdicao(false);
        setItemEditando(null);
        carregarDados();
      } else {
        const errorData = await response.json();
        toast.error(`Erro ao atualizar: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Erro ao atualizar lançamento:', error);
      toast.error('Erro ao atualizar lançamento.');
    }
  };

  const excluirLancamentoTronco = (tipo, id) => excluirLancamento(tipo, id);

  const exportarPDF = async () => {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const margin = 15;
      let yPosition = margin;

      // Carregar logo
      let logoImg;
      try {
        logoImg = await fetch('/logo.jpeg').then(r => r.blob()).then(b => new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(b);
        }));
      } catch (error) {
        console.error('Erro ao carregar logo:', error);
      }

      // Adicionar logo
      if (logoImg) {
        pdf.addImage(logoImg, 'JPEG', pageWidth / 2 - 15, yPosition, 30, 30);
        yPosition += 40;
      }

      // Cabeçalho
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('A.R.L.S. SABEDORIA DE SALOMÃO Nº 4774', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 7;

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Planilha Financeira - ${meses[planilha.mes - 1]} / ${planilha.ano}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Tabela de Mensalidades
      const dadosMensalidades = membros.map(membro => {
        const pagou = pagamentosPorMembro[membro.id];
        return [
          membro.nome,
          membro.cim || '-',
          pagou ? 'Pago' : 'Pendente',
          pagou ? pagou.mesesReferentes.join(', ') : '-',
          pagou ? `R$ ${pagou.valorTotal.toFixed(2)}` : '-'
        ];
      });

      autoTable(pdf, {
        startY: yPosition,
        head: [['Nome', 'CIM', 'Status', 'Mês Ref.', 'Valor']],
        body: dadosMensalidades,
        theme: 'grid',
        headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' },
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2 },
        showHead: 'firstPage'
      });

      yPosition = pdf.lastAutoTable.finalY + 5;

      // Outros Recebimentos
      if (planilha.receitas && planilha.receitas.length > 0) {
        const dadosReceitas = planilha.receitas.map(r => [
          r.descricao,
          new Date(r.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
          `R$ ${Number(r.valor).toFixed(2)}`
        ]);

        autoTable(pdf, {
          startY: yPosition,
          head: [['Outros Recebimentos', 'Data', 'Valor']],
          body: dadosReceitas,
          theme: 'grid',
          headStyles: { fillColor: [200, 240, 200], textColor: [0, 0, 0] },
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 2 },
          showHead: 'firstPage'
        });

        yPosition = pdf.lastAutoTable.finalY + 5;
      }

      // Despesas
      if (planilha.despesas && planilha.despesas.length > 0) {
        const dadosDespesas = planilha.despesas.map(d => [
          d.descricao,
          new Date(d.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
          d.tipoGasto,
          `R$ ${Number(d.valor).toFixed(2)}`
        ]);

        autoTable(pdf, {
          startY: yPosition,
          head: [['Despesas', 'Data', 'Tipo', 'Valor']],
          body: dadosDespesas,
          theme: 'grid',
          headStyles: { fillColor: [255, 200, 200], textColor: [0, 0, 0] },
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 2 },
          showHead: 'firstPage'
        });

        yPosition = pdf.lastAutoTable.finalY + 5;
      }

      // Tronco
      if (planilha.troncos && planilha.troncos.length > 0) {
        const dadosTronco = planilha.troncos.map(t => [
          t.grauSessao,
          new Date(t.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
          new Date(t.dataDeposito).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
          `R$ ${Number(t.valor).toFixed(2)}`
        ]);

        autoTable(pdf, {
          startY: yPosition,
          head: [['Tronco - Grau', 'Data Sessão', 'Data Depósito', 'Valor']],
          body: dadosTronco,
          theme: 'grid',
          headStyles: { fillColor: [255, 255, 200], textColor: [0, 0, 0] },
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 2 },
          showHead: 'firstPage'
        });

        yPosition = pdf.lastAutoTable.finalY + 5;
      }

      // Doações Filantrópicas
      if (planilha.doacoesFilantropicas && planilha.doacoesFilantropicas.length > 0) {
        const dadosDoacoes = planilha.doacoesFilantropicas.map(d => [
          d.descricao,
          new Date(d.dataPagamento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
          `R$ ${Number(d.valor).toFixed(2)}`
        ]);

        autoTable(pdf, {
          startY: yPosition,
          head: [['Doações Filantrópicas', 'Data', 'Valor']],
          body: dadosDoacoes,
          theme: 'grid',
          headStyles: { fillColor: [255, 220, 200], textColor: [0, 0, 0] },
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 2 },
          showHead: 'firstPage'
        });

        yPosition = pdf.lastAutoTable.finalY + 5;
      }

      // Resumos em tabela
      yPosition += 5;

      const totalMensalidades = planilha.pagamentos?.filter(p => p.quantidadeMeses > 0).reduce((sum, p) => sum + Number(p.valorPago), 0) || 0;
      const totalReceitas = planilha.receitas?.reduce((sum, r) => sum + Number(r.valor), 0) || 0;

      // Tabela Resumo Caixa
      autoTable(pdf, {
        startY: yPosition,
        head: [['Resumo Caixa Geral', 'Valor']],
        body: [
          ['Saldo Inicial', `R$ ${Number(planilha.saldoInicialCaixa).toFixed(2)}`],
          ['Total Mensalidades', `R$ ${totalMensalidades.toFixed(2)}`],
          ['Outros Recebimentos', `R$ ${totalReceitas.toFixed(2)}`],
          ['Total Despesas', `R$ ${Number(planilha.totalDespesas).toFixed(2)}`],
          ['SALDO FINAL CAIXA', `R$ ${Number(planilha.saldoFinalCaixa).toFixed(2)}`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [100, 150, 200], textColor: [255, 255, 255], fontStyle: 'bold' },
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 3 },
        bodyStyles: { 0: { fontStyle: 'bold' } },
        showHead: 'firstPage'
      });

      yPosition = pdf.lastAutoTable.finalY + 5;

      // Tabela Resumo Tronco
      autoTable(pdf, {
        startY: yPosition,
        head: [['Resumo Tronco de Beneficência', 'Valor']],
        body: [
          ['Saldo Inicial', `R$ ${Number(planilha.saldoInicialTronco).toFixed(2)}`],
          ['Total Recebido', `R$ ${Number(planilha.totalTroncoRecebido).toFixed(2)}`],
          ['Doações Filantrópicas', `R$ ${Number(planilha.totalDoacoesFilantropicas).toFixed(2)}`],
          ['SALDO FINAL TRONCO', `R$ ${Number(planilha.saldoFinalTronco).toFixed(2)}`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [200, 180, 100], textColor: [0, 0, 0], fontStyle: 'bold' },
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 3 },
        showHead: 'firstPage'
      });

      yPosition = pdf.lastAutoTable.finalY + 5;

      // Saldo Total
      const saldoTotal = Number(planilha.saldoFinalCaixa) + Number(planilha.saldoFinalTronco);

      autoTable(pdf, {
        startY: yPosition,
        body: [[`SALDO FINAL TOTAL (Caixa + Tronco): R$ ${saldoTotal.toFixed(2)}`]],
        theme: 'plain',
        styles: { fontSize: 12, fontStyle: 'bold', halign: 'right', cellPadding: 3 },
        margin: { left: margin, right: margin },
        showHead: 'firstPage'
      });

      yPosition = pdf.lastAutoTable.finalY + 10;

      // Assinaturas
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${localidade.toUpperCase()}, ${diaAssinatura} de ${meses[mesAssinatura - 1].toLowerCase()} de ${anoAssinatura}.`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Carregar assinaturas
      let vmAssinaturaImg, tesAssinaturaImg;

      try {
        if (veneravelMestre?.assinaturaUrl) {
          vmAssinaturaImg = await fetch(veneravelMestre.assinaturaUrl).then(r => r.blob()).then(b => new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(b);
          }));
        }

        if (tesoureiro?.assinaturaUrl) {
          tesAssinaturaImg = await fetch(tesoureiro.assinaturaUrl).then(r => r.blob()).then(b => new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(b);
          }));
        }
      } catch (error) {
        console.error('Erro ao carregar assinaturas:', error);
      }

      // Assinaturas com imagens
      if (veneravelMestre) {
        const col1X = pageWidth / 4;
        const col2X = (pageWidth / 4) * 3;
        const assinaturaY = yPosition;

        // Assinatura VM
        if (vmAssinaturaImg) {
          pdf.addImage(vmAssinaturaImg, 'PNG', col1X - 20, assinaturaY, 40, 15);
        }

        // Assinatura Tesoureiro
        if (tesAssinaturaImg) {
          pdf.addImage(tesAssinaturaImg, 'PNG', col2X - 20, assinaturaY, 40, 15);
        }

        yPosition += 17;

        pdf.setFontSize(9);
        pdf.text(veneravelMestre.nome, col1X, yPosition, { align: 'center' });
        pdf.text(tesoureiro?.nome || '', col2X, yPosition, { align: 'center' });
        yPosition += 4;

        pdf.setFont('helvetica', 'bold');
        pdf.text('Venerável Mestre', col1X, yPosition, { align: 'center' });
        pdf.text('Tesoureiro', col2X, yPosition, { align: 'center' });
        yPosition += 4;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text(`CIM: ${veneravelMestre.cim}`, col1X, yPosition, { align: 'center' });
        pdf.text(`CIM: ${tesoureiro?.cim || ''}`, col2X, yPosition, { align: 'center' });
      }

      pdf.save(`planilha_${meses[planilha.mes - 1]}_${planilha.ano}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    }
  };

  const formatarValor = (valor) => {
    let v = String(valor).replace(/\D/g, '');
    v = (parseInt(v) / 100).toFixed(2);
    v = v.replace('.', ',');
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    return v === 'NaN' ? '' : v;
  };

  const handleValorChange = (e, setter) => {
    setter(formatarValor(e.target.value));
  };
  
  const getCorSaldo = (valor) => {
    return Number(valor) >= 0 ? 'text-green-600' : 'text-red-600';
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl font-bold text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!planilha) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-bold text-gray-600">Planilha não encontrada</div>
          <button onClick={() => router.push('/financeiro')} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg">
            Voltar para Listagem
          </button>
        </div>
      </div>
    );
  }

  // Agrupar pagamentos por membro
  const pagamentosPorMembro = {};
  planilha.pagamentos?.forEach(p => {
    if (p.quantidadeMeses > 0) {
      if (!pagamentosPorMembro[p.membroId]) {
        pagamentosPorMembro[p.membroId] = {
          valorTotal: 0,
          mesesReferentes: [],
          pagamento: p
        };
      }
      pagamentosPorMembro[p.membroId].valorTotal += Number(p.valorPago);
      pagamentosPorMembro[p.membroId].mesesReferentes.push(p.mesesReferentes);
    }
  });
  
  const saldoFinalTotal = Number(planilha.saldoFinalCaixa || 0) + Number(planilha.saldoFinalTronco || 0);

  const tesoureiro = assinaturas.tesoureiro;
  const veneravelMestre = assinaturas.veneravelmestre;

  // Criar array de exibição para a tabela de controle
  const linhasTabela = [];
  const mesAtualPlanilha = planilha.mes;
  const anoAtualPlanilha = planilha.ano;
  const mesAtualFormatado = `${meses[mesAtualPlanilha - 1].substring(0,3)}/${String(anoAtualPlanilha).slice(-2)}`;

  const isAllFuturo = (mesesStr) => {
    return mesesStr.split(',').map(m => m.trim()).every(ms => {
      const [abbr, anoShort] = ms.split('/');
      const mesIdx = meses.findIndex(m => m.substring(0, 3) === abbr);
      if (mesIdx === -1) return false;
      const mes = mesIdx + 1;
      const ano = 2000 + parseInt(anoShort);
      return ano > anoAtualPlanilha || (ano === anoAtualPlanilha && mes > mesAtualPlanilha);
    });
  };

  membros.forEach(membro => {
    const pagamentosDoMembro = planilha.pagamentos?.filter(p => p.membroId === membro.id) || [];
    const inadimplencias = pagamentosDoMembro.filter(p => p.quantidadeMeses < 0);
    const todosPositivos = pagamentosDoMembro.filter(p => p.quantidadeMeses > 0);
    const pagamentosAntecipados = todosPositivos.filter(p => isAllFuturo(p.mesesReferentes));
    const pagamentosReais = todosPositivos.filter(p => !isAllFuturo(p.mesesReferentes));

    // 1. Adicionar inadimplências (cada mês como linha separada)
    inadimplencias.forEach(inad => {
      const mesesDevidos = inad.mesesReferentes.split(',').map(m => m.trim());

      mesesDevidos.forEach(mesDevido => {
        linhasTabela.push({
          membro,
          tipo: 'inadimplencia',
          pagamento: {
            ...inad,
            mesesReferentesExibicao: mesDevido,
            // Preservar os dados originais para o fluxo de pagamento
            // mesesReferentes e quantidadeMeses mantêm os valores originais do banco
          },
          status: 'devendo'
        });
      });
    });

    // 2. Adicionar linha do mês atual
    const pagouEspecificamenteMesAtual = pagamentosReais.some(p => {
      return p.mesesReferentes === mesAtualFormatado ||
             p.mesesReferentes.includes(mesAtualFormatado);
    });

    if (pagouEspecificamenteMesAtual) {
      const pag = pagamentosReais.find(p => p.mesesReferentes.includes(mesAtualFormatado));
      const isAntecipadoPayment = pag.antecipado === true;
      const isIsentoPayment = !isAntecipadoPayment && Number(pag.valorPago) === 0;
      const tipoStatus = isAntecipadoPayment ? 'antecipado' : isIsentoPayment ? 'isento' : 'pago';
      linhasTabela.push({
        membro,
        tipo: tipoStatus,
        pagamento: { ...pag, mesesReferentes: mesAtualFormatado },
        status: tipoStatus
      });
    } else {
      const pagRefAnterior = pagamentosReais.find(p => !p.mesesReferentes.includes(mesAtualFormatado));
      if (pagRefAnterior) {
        linhasTabela.push({
          membro,
          tipo: 'parcial',
          pagamento: pagRefAnterior,
          status: 'parcial'
        });
      } else {
        linhasTabela.push({
          membro,
          tipo: 'normal',
          pagamento: null,
          status: 'pendente'
        });
      }
    }

    // 3. Adicionar pagamentos antecipados (meses futuros)
    pagamentosAntecipados.forEach(pag => {
      linhasTabela.push({
        membro,
        tipo: 'antecipado',
        pagamento: pag,
        status: 'antecipado'
      });
    });
  });

  // Filtro: Remove pagamentos de meses passados
  const linhasFiltradas = linhasTabela.filter(linha => {
    if (linha.tipo === 'inadimplencia') return true;
    if (linha.tipo === 'normal') return true;
    if (linha.tipo === 'parcial') return true;
    if (linha.tipo === 'isento') return true;
    if (linha.tipo === 'antecipado') return true;
    if (linha.tipo === 'pago') {
      return linha.pagamento.mesesReferentes === mesAtualFormatado;
    }
    return false;
  });

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-900 text-white p-3 md:p-4 shadow-lg print:hidden">
        <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => router.push('/dashboard')} className="hover:bg-blue-800 active:bg-blue-700 p-2 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center">
              <Home size={22} />
            </button>
            <button onClick={() => router.push('/financeiro')} className="hover:bg-blue-800 active:bg-blue-700 p-2 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center">
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold">{meses[planilha.mes - 1]} / {planilha.ano}</h1>
              <p className="text-xs sm:text-sm text-blue-200 hidden sm:block">Mensalidade: R$ {Number(planilha.valorMensalidade).toFixed(2)}</p>
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <button onClick={exportarPDF} className="w-full sm:w-auto flex items-center justify-center gap-2 hover:bg-blue-800 active:bg-blue-700 border border-blue-700 px-4 py-2 rounded-lg transition">
              <Download size={20} />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <Breadcrumbs
          items={[
            { label: 'Financeiro', href: '/financeiro' },
            { label: `${meses[planilha.mes - 1]} / ${planilha.ano}` }
          ]}
        />
        {/* Controle de Data/Local de Assinatura */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 print:hidden">
            <h3 className="text-xl font-bold mb-3 text-gray-800">Ajustar Local e Data da Aprovação</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Local</label>
                    <input 
                        type="text" 
                        value={localidade} 
                        onChange={(e) => setLocalidade(e.target.value)}
                        className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-800"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Dia</label>
                    <input 
                        type="number" 
                        value={diaAssinatura} 
                        onChange={(e) => setDiaAssinatura(parseInt(e.target.value) || 1)}
                        className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-800"
                        min="1" max="31"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Mês</label>
                    <select 
                        value={mesAssinatura} 
                        onChange={(e) => setMesAssinatura(parseInt(e.target.value))}
                        className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-800"
                    >
                        {meses.map((m, index) => (
                            <option key={index} value={index + 1}>{m}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Ano</label>
                    <input 
                        type="number" 
                        value={anoAssinatura} 
                        onChange={(e) => setAnoAssinatura(parseInt(e.target.value) || new Date().getFullYear())}
                        className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-800"
                        min="2000"
                    />
                </div>
            </div>
        </div>

        {/* Conteúdo para PDF */}
        <div id="planilha-completa" className="bg-white p-6 rounded-lg shadow-lg">
          {/* Cabeçalho */}
          <div className="text-center mb-4">
            <img
              src="/logo.jpeg"
              alt="Logo A.R.L.S. Sabedoria de Salomão"
              className="h-20 w-auto mx-auto mb-3"
            />
            <h1 className="text-2xl font-bold text-gray-800">A.R.L.S. SABEDORIA DE SALOMÃO Nº 4774</h1>
            <h2 className="text-lg text-gray-600 mt-1">Planilha Financeira - {meses[planilha.mes - 1]} / {planilha.ano}</h2>
          </div>

          {/* Tabela de Mensalidades (para PDF) */}
          <div className="mb-3 break-inside-avoid">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Mensalidades Recebidas</h3>
            <table className="w-full border-2 border-gray-300 text-sm">
              <thead className="bg-gray-200 text-gray-900 font-semibold">
                <tr>
                  <th className="border px-2 py-1 text-left">Nome</th>
                  <th className="border px-2 py-1 text-left">CIM</th>
                  <th className="border px-2 py-1 text-center">Status</th>
                  <th className="border px-2 py-1 text-left">Mês Ref.</th>
                  <th className="border px-2 py-1 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {membros.map(membro => {
                  const pagou = pagamentosPorMembro[membro.id];
                  return (
                    <tr key={membro.id}>
                      <td className="border text-gray-900 px-2 py-1">{membro.nome}</td>
                      <td className="border text-gray-900 px-2 py-1">{membro.cim || '-'}</td>
                      <td className="border px-2 py-1 text-center">
                        {pagou ? (
                          pagou.pagamento.antecipado === true ? (
                            <span className="text-purple-600 font-bold">★ Antecipado</span>
                          ) : pagou.valorTotal === 0 ? (
                            <span className="text-blue-600 font-bold">★ Isento</span>
                          ) : !pagou.mesesReferentes.join(', ').includes(mesAtualFormatado) ? (
                            <span className="text-yellow-600 font-bold">~ Pago Parcial</span>
                          ) : (
                            <span className="text-green-600 font-bold">✓ Pago</span>
                          )
                        ) : (
                          <span className="text-red-600 font-bold">✗ Pendente</span>
                        )}
                      </td>
                      <td className="border text-gray-900 px-2 py-1 text-left text-xs">
                        {pagou ? pagou.mesesReferentes.join(', ') : '-'}
                      </td>
                      <td className="border text-gray-900 px-2 py-1 text-right">
                        {pagou ? `R$ ${pagou.valorTotal.toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tabela de Outros Recebimentos */}
          {planilha.receitas && planilha.receitas.length > 0 && (
            <div className="mb-3 break-inside-avoid">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Outros Recebimentos</h3>
              <table className="w-full border-2 border-gray-300 text-sm">
                <thead className="bg-green-100 text-gray-900">
                  <tr>
                    <th className="border px-2 py-1 text-left">Descrição</th>
                    <th className="border px-2 py-1 text-left">Data</th>
                    <th className="border px-2 py-1 text-right">Valor</th>
                    <th className="border px-2 py-1 text-center print:hidden">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {planilha.receitas.map(receita => (
                    <tr key={receita.id}>
                      <td className="border text-gray-900 px-2 py-1">{receita.descricao}</td>
                      <td className="border text-gray-900 px-2 py-1 text-xs">{new Date(receita.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                      <td className="border px-2 py-1 text-right text-green-600 font-bold">
                        R$ {Number(receita.valor).toFixed(2)}
                      </td>
                      <td className="border px-2 py-1 text-center print:hidden">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => abrirModalLancamentoCaixa('receita', receita)} className="text-blue-600 hover:text-blue-800" title="Editar">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => excluirLancamento('receita', receita.id)} className="text-red-600 hover:text-red-800" title="Excluir">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tabela de Despesas */}
          {planilha.despesas && planilha.despesas.length > 0 && (
            <div className="mb-3 break-inside-avoid">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Despesas</h3>
              <table className="w-full border-2 border-gray-300 text-sm">
                <thead className="bg-red-100 text-gray-900">
                  <tr>
                    <th className="border px-2 py-1 text-left">Descrição</th>
                    <th className="border px-2 py-1 text-left">Data de Pagamento</th>
                    <th className="border px-2 py-1 text-center">Tipo de Gasto</th>
                    <th className="border px-2 py-1 text-right">Valor</th>
                    <th className="border px-2 py-1 text-center print:hidden">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {planilha.despesas.map(despesa => (
                    <tr key={despesa.id}>
                      <td className="border text-gray-900 px-2 py-1">{despesa.descricao}</td>
                      <td className="border text-gray-900 px-2 py-1 text-xs">{new Date(despesa.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                      <td className="border text-gray-900 px-2 py-1 text-center text-xs font-semibold">{despesa.tipoGasto}</td>
                      <td className="border px-2 py-1 text-right text-red-600 font-bold">
                        R$ {Number(despesa.valor).toFixed(2)}
                      </td>
                      <td className="border px-2 py-1 text-center print:hidden">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => abrirModalLancamentoCaixa('despesa', despesa)} className="text-blue-600 hover:text-blue-800" title="Editar">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => excluirLancamento('despesa', despesa.id)} className="text-red-600 hover:text-red-800" title="Excluir">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tabela de Tronco de Beneficência */}
          {planilha.troncos && planilha.troncos.length > 0 && (
            <div className="mb-3 break-inside-avoid">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Recebimentos Tronco de Beneficência</h3>
              <table className="w-full border-2 border-gray-300 text-sm">
                <thead className="bg-yellow-100 text-gray-900">
                  <tr>
                    <th className="border px-2 py-1 text-left">Grau da Sessão</th>
                    <th className="border px-2 py-1 text-left">Data da Sessão</th>
                    <th className="border px-2 py-1 text-left">Data do Depósito</th>
                    <th className="border px-2 py-1 text-right">Valor</th>
                    <th className="border px-2 py-1 text-center print:hidden">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {planilha.troncos.map(tronco => (
                    <tr key={tronco.id}>
                      <td className="border text-gray-900 px-2 py-1">{tronco.grauSessao}</td>
                      <td className="border text-gray-900 px-2 py-1 text-xs">{new Date(tronco.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                      <td className="border text-gray-900 px-2 py-1 text-xs">{new Date(tronco.dataDeposito).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                      <td className="border px-2 py-1 text-right text-green-600 font-bold">
                        R$ {Number(tronco.valor).toFixed(2)}
                      </td>
                      <td className="border px-2 py-1 text-center print:hidden">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => abrirModalTronco('tronco', tronco)} className="text-blue-600 hover:text-blue-800" title="Editar">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => excluirLancamentoTronco('tronco', tronco.id)} className="text-red-600 hover:text-red-800" title="Excluir">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tabela de Doações Filantrópicas */}
          {planilha.doacoesFilantropicas && planilha.doacoesFilantropicas.length > 0 && (
            <div className="mb-3 break-inside-avoid">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Doações Filantrópicas (Gastos do Tronco)</h3>
              <table className="w-full border-2 border-gray-300 text-sm">
                <thead className="bg-orange-100 text-gray-900">
                  <tr>
                    <th className="border px-2 py-1 text-left">Descrição</th>
                    <th className="border px-2 py-1 text-left">Data do Pagamento</th>
                    <th className="border px-2 py-1 text-right">Valor</th>
                    <th className="border px-2 py-1 text-center print:hidden">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {planilha.doacoesFilantropicas.map(doacao => (
                    <tr key={doacao.id}>
                      <td className="border text-gray-900 px-2 py-1">{doacao.descricao}</td>
                      <td className="border text-gray-900 px-2 py-1 text-xs">{new Date(doacao.dataPagamento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                      <td className="border px-2 py-1 text-right text-red-600 font-bold">
                        R$ {Number(doacao.valor).toFixed(2)}
                      </td>
                      <td className="border px-2 py-1 text-center print:hidden">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => abrirModalTronco('filantropia', doacao)} className="text-blue-600 hover:text-blue-800" title="Editar">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => excluirLancamentoTronco('filantropia', doacao.id)} className="text-red-600 hover:text-red-800" title="Excluir">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Resumo Movimento de Caixa */}
          <div className="mb-4 p-3 border-b-4 border-blue-500 bg-blue-50 rounded-lg break-inside-avoid mt-6">
            <h3 className="text-lg font-bold text-blue-800 mb-3 flex items-center gap-2"><Briefcase size={20} /> Resumo Movimento de Caixa (Caixa Geral)</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm font-semibold">
                <div className="p-2 border-r">
                    <div className="text-gray-600">Saldo Inicial</div>
                    <div className="text-gray-800">R$ {Number(planilha.saldoInicialCaixa).toFixed(2)}</div>
                </div>
                <div className="p-2 border-r">
                    <div className="text-gray-600">Total Mensalidades</div>
                    <div className="text-green-600">R$ {planilha.pagamentos.filter(p => p.quantidadeMeses > 0).reduce((sum, p) => sum + Number(p.valorPago), 0).toFixed(2)}</div>
                </div>
                <div className="p-2 border-r">
                    <div className="text-gray-600">Outros Recebimentos</div>
                    <div className="text-green-600">R$ {planilha.receitas.reduce((sum, r) => sum + Number(r.valor), 0).toFixed(2)}</div>
                </div>
                <div className="p-2 border-r">
                    <div className="text-gray-600">Total Despesas</div>
                    <div className="text-red-600">R$ {Number(planilha.totalDespesas).toFixed(2)}</div>
                </div>
                <div className="p-2 font-bold text-lg">
                    <div className="text-gray-700">Saldo Final Caixa</div>
                    <div className={getCorSaldo(planilha.saldoFinalCaixa)}>R$ {Number(planilha.saldoFinalCaixa).toFixed(2)}</div>
                </div>
            </div>
          </div>

          {/* Resumo Tronco de Beneficência */}
          <div className="mb-4 p-3 border-b-4 border-yellow-500 bg-yellow-50 rounded-lg break-inside-avoid">
            <h3 className="text-lg font-bold text-yellow-800 mb-3 flex items-center gap-2"><DollarSign size={20} /> Resumo Tronco de Beneficência</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm font-semibold">
                <div className="p-2 border-r">
                    <div className="text-gray-600">Saldo Inicial</div>
                    <div className="text-gray-800">R$ {Number(planilha.saldoInicialTronco).toFixed(2)}</div>
                </div>
                <div className="p-2 border-r">
                    <div className="text-gray-600">Total Recebido Mês</div>
                    <div className="text-green-600">R$ {Number(planilha.totalTroncoRecebido).toFixed(2)}</div>
                </div>
                <div className="p-2 border-r">
                    <div className="text-gray-600">Total Doações Filantrópicas</div>
                    <div className="text-red-600">R$ {Number(planilha.totalDoacoesFilantropicas).toFixed(2)}</div>
                </div>
                <div className="p-2 font-bold text-lg col-span-2 md:col-span-2">
                    <div className="text-gray-700">Saldo Final Tronco</div>
                    <div className={getCorSaldo(planilha.saldoFinalTronco)}>R$ {Number(planilha.saldoFinalTronco).toFixed(2)}</div>
                </div>
            </div>
          </div>

          {/* Saldo Final Total */}
          <div className="mb-4 text-right p-2 bg-gray-200 rounded-lg break-inside-avoid">
              <span className="text-xl font-bold text-gray-800">SALDO FINAL TOTAL (Caixa + Tronco): </span>
              <span className={`text-2xl font-extrabold ${getCorSaldo(saldoFinalTotal)}`}>R$ {saldoFinalTotal.toFixed(2)}</span>
          </div>

          {/* Local e Assinaturas */}
          <div className="mt-6 text-center text-base font-serif text-gray-900 break-inside-avoid">
            <p className="mb-6 text-gray-900 font-bold">
                {localidade.toUpperCase()}, {diaAssinatura} de {meses[mesAssinatura - 1].toLowerCase()} de {anoAssinatura}.
            </p>

            <div className="grid grid-cols-2 gap-12 pt-4 px-4">
                <div className="flex flex-col items-center">
                    <div className="h-14 w-full mb-1">
                        {veneravelMestre && veneravelMestre.assinaturaUrl && (
                          <img
                            src={veneravelMestre.assinaturaUrl}
                            alt="Assinatura VM"
                            className="h-full w-auto mx-auto object-contain"
                          />
                        )}
                    </div>
                    {veneravelMestre && (
                        <div className="flex flex-col items-center gap-0">
                          <p className="text-sm text-gray-900 whitespace-nowrap leading-tight">{veneravelMestre.nome}</p>
                          <p className="font-bold text-sm whitespace-nowrap leading-tight">Venerável Mestre</p>
                          <span className="text-xs text-gray-900 whitespace-nowrap leading-tight">CIM: {veneravelMestre.cim}</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-center">
                    <div className="h-14 w-full mb-1">
                        {tesoureiro && tesoureiro.assinaturaUrl && (
                          <img
                            src={tesoureiro.assinaturaUrl}
                            alt="Assinatura Tesoureiro"
                            className="h-full w-auto mx-auto object-contain"
                          />
                        )}
                    </div>
                    {tesoureiro && (
                        <div className="flex flex-col items-center gap-0">
                          <p className="text-sm text-gray-900 whitespace-nowrap leading-tight">{tesoureiro.nome}</p>
                          <p className="font-bold text-sm whitespace-nowrap leading-tight">Tesoureiro</p>
                          <span className="text-xs text-gray-900 whitespace-nowrap leading-tight">CIM: {tesoureiro.cim}</span>
                        </div>
                    )}
                </div>
            </div>
          </div>
        </div>

        <style jsx global>{`
          @media print {
            .break-inside-avoid {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .page-break-before {
              break-before: auto;
              page-break-before: auto;
            }
          }
        `}</style>

        {/* Botões de Ação */}
        <div className="mt-6 flex gap-4 print:hidden flex-wrap">
          <button onClick={() => abrirModalLancamentoCaixa('receita')} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            <Plus size={20} /> Outros Recebimentos
          </button>
          <button onClick={() => abrirModalLancamentoCaixa('despesa')} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
            <Plus size={20} /> Despesa (Caixa)
          </button>
          <button onClick={() => abrirModalTronco('tronco')} className="flex items-center gap-2 bg-yellow-600 text-gray-900 px-4 py-2 rounded-lg hover:bg-yellow-700">
            <DollarSign size={20} /> Lançar Tronco
          </button>
          <button onClick={() => abrirModalTronco('filantropia')} className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700">
            <BookOpen size={20} /> Doação Filantrópica
          </button>
        </div>

        {/* Tabela de Controle - Desktop */}
        <div className="hidden lg:block bg-white rounded-lg shadow-lg overflow-hidden mt-6 print:hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Controle de Mensalidades</h2>
            {Object.keys(excecoesPorMembro).length > 0 && (
                <span className="text-sm font-semibold text-red-600">
                    * {Object.keys(excecoesPorMembro).length} Irmão(s) com valores de exceção
                </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-bold text-gray-700">Nome</th>
                  <th className="px-6 py-3 text-left font-bold text-gray-700">CIM</th>
                  <th className="px-6 py-3 text-center font-bold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left font-bold text-gray-700">Mês Ref.</th>
                  <th className="px-6 py-3 text-center font-bold text-gray-700">Ação</th>
                </tr>
              </thead>
              <tbody>
                {linhasFiltradas.map((linha, idx) => {
                  const { membro, tipo, pagamento, status } = linha;
                  const isExcecao = excecoesPorMembro[membro.id] !== undefined;
                  let valorMensalidadeUnitario = Number(planilha.valorMensalidade);

                  if (isExcecao) {
                      valorMensalidadeUnitario = Number(excecoesPorMembro[membro.id]);
                  }

                  const chaveUnica = `${membro.id}-${tipo}-${pagamento?.id || idx}`;

                  return (
                    <tr key={chaveUnica} className={`border-b hover:bg-gray-50 ${tipo === 'inadimplencia' ? 'bg-red-50' : tipo === 'antecipado' ? 'bg-purple-50' : ''}`}>
                      <td className="px-6 py-4 text-gray-800">
                          {membro.nome}
                          {isExcecao && tipo !== 'inadimplencia' && (
                            <span className="ml-2 text-xs text-red-500 font-semibold">
                                (Exceção: R$ {valorMensalidadeUnitario.toFixed(2)})
                            </span>
                          )}
                          {tipo === 'inadimplencia' && (
                            <span className="ml-2 text-xs text-orange-600 font-bold">(DEVENDO)</span>
                          )}
                          {tipo === 'normal' && (
                            <span className="ml-2 text-xs text-blue-600 font-semibold">(MÊS ATUAL)</span>
                          )}
                          {tipo === 'parcial' && (
                            <span className="ml-2 text-xs text-yellow-700 font-semibold">(MÊS ANTERIOR)</span>
                          )}
                          {tipo === 'antecipado' && (
                            <span className="ml-2 text-xs text-purple-600 font-bold">(ANTECIPADO)</span>
                          )}
                      </td>
                      <td className="px-6 py-4 text-gray-800">{membro.cim || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        {status === 'pago' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-bold">
                            <Check size={16} /> Pago
                          </span>
                        ) : status === 'isento' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">
                            <Check size={16} /> Isento
                          </span>
                        ) : status === 'parcial' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-bold">
                            <Check size={16} /> Pago Parcial
                          </span>
                        ) : status === 'antecipado' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-bold">
                            <Check size={16} /> Antecipado
                          </span>
                        ) : tipo === 'inadimplencia' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-bold">
                            <X size={16} /> Devendo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">
                            <X size={16} /> Mês Atual
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-800 text-xs">
                        {pagamento ? (pagamento.mesesReferentesExibicao || pagamento.mesesReferentes) : tipo === 'normal' ? `${meses[planilha.mes - 1].substring(0,3)}/${planilha.ano}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-center flex justify-center gap-2">
                        {status === 'antecipado' ? (
                          <button
                            onClick={() => cancelarPagamento(pagamento.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm flex items-center gap-1"
                            title="Cancelar Pagamento Antecipado"
                          >
                            <Undo2 size={16} /> Cancelar
                          </button>
                        ) : (status === 'pago' || status === 'isento') && tipo !== 'inadimplencia' ? (
                          <button
                              onClick={() => cancelarPagamento(pagamento.id)}
                              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm flex items-center gap-1"
                              title="Cancelar Pagamento"
                          >
                              <Undo2 size={16} /> Cancelar
                          </button>
                        ) : status === 'parcial' ? (
                          <>
                            <button
                                onClick={() => cancelarPagamento(pagamento.id)}
                                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm flex items-center gap-1"
                                title="Cancelar Pagamento Anterior"
                            >
                                <Undo2 size={16} /> Cancelar
                            </button>
                            <button
                              onClick={() => abrirModalPagamento(membro)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-semibold"
                            >
                              Pagar Mês Atual
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => abrirModalPagamento(membro, pagamento)}
                            className={`text-white px-4 py-1 rounded text-sm font-semibold ${
                              tipo === 'inadimplencia' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                          >
                            {tipo === 'inadimplencia' ? 'Quitar Dívida' : 'Registrar Pagamento'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabela de Controle - Mobile */}
        <div className="lg:hidden mt-6 print:hidden">
          <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Controle de Mensalidades</h2>
            {Object.keys(excecoesPorMembro).length > 0 && (
              <p className="text-xs font-semibold text-red-600">
                * {Object.keys(excecoesPorMembro).length} Irmão(s) com valores de exceção
              </p>
            )}
          </div>

          <div className="space-y-3">
            {linhasFiltradas.map((linha, idx) => {
              const { membro, tipo, pagamento, status } = linha;
              const isExcecao = excecoesPorMembro[membro.id] !== undefined;
              let valorMensalidadeUnitario = Number(planilha.valorMensalidade);

              if (isExcecao) {
                valorMensalidadeUnitario = Number(excecoesPorMembro[membro.id]);
              }

              const chaveUnica = `${membro.id}-${tipo}-${pagamento?.id || idx}`;

              return (
                <div
                  key={chaveUnica}
                  className={`bg-white rounded-lg p-4 shadow-lg border-l-4 ${
                    tipo === 'inadimplencia' ? 'border-orange-600 bg-orange-50' :
                    status === 'pago' ? 'border-green-600' :
                    status === 'isento' ? 'border-blue-400 bg-blue-50' :
                    status === 'parcial' ? 'border-yellow-500 bg-yellow-50' :
                    status === 'antecipado' ? 'border-purple-500 bg-purple-50' :
                    'border-blue-600'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-base mb-1">
                        {membro.nome}
                      </h3>
                      {tipo === 'inadimplencia' && (
                        <span className="inline-block px-2 py-1 bg-orange-200 text-orange-800 rounded text-xs font-bold">
                          DEVENDO
                        </span>
                      )}
                      {tipo === 'normal' && (
                        <span className="inline-block px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs font-bold">
                          MÊS ATUAL
                        </span>
                      )}
                      {tipo === 'parcial' && (
                        <span className="inline-block px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs font-bold">
                          MÊS ANTERIOR
                        </span>
                      )}
                      {tipo === 'antecipado' && (
                        <span className="inline-block px-2 py-1 bg-purple-200 text-purple-800 rounded text-xs font-bold">
                          ANTECIPADO
                        </span>
                      )}
                      {isExcecao && tipo !== 'inadimplencia' && (
                        <span className="inline-block px-2 py-1 bg-red-100 text-red-600 rounded text-xs font-bold ml-2">
                          Exceção: R$ {valorMensalidadeUnitario.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div>
                      {status === 'pago' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">
                          <Check size={14} /> Pago
                        </span>
                      ) : status === 'isento' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                          <Check size={14} /> Isento
                        </span>
                      ) : status === 'parcial' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">
                          <Check size={14} /> Pago Parcial
                        </span>
                      ) : status === 'antecipado' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-bold">
                          <Check size={14} /> Antecipado
                        </span>
                      ) : tipo === 'inadimplencia' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-bold">
                          <X size={14} /> Devendo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                          <X size={14} /> Pendente
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">CIM:</span>
                      <span className="font-semibold text-gray-900">{membro.cim || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Mês Ref.:</span>
                      <span className="font-semibold text-gray-900">
                        {pagamento ? (pagamento.mesesReferentesExibicao || pagamento.mesesReferentes) : tipo === 'normal' ? `${meses[planilha.mes - 1].substring(0,3)}/${planilha.ano}` : '-'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {status === 'antecipado' ? (
                      <button
                        onClick={() => cancelarPagamento(pagamento.id)}
                        className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition font-medium flex items-center justify-center gap-2"
                      >
                        <Undo2 size={18} /> Cancelar Antecipado
                      </button>
                    ) : (status === 'pago' || status === 'isento') && tipo !== 'inadimplencia' ? (
                      <button
                        onClick={() => cancelarPagamento(pagamento.id)}
                        className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition font-medium flex items-center justify-center gap-2"
                      >
                        <Undo2 size={18} /> Cancelar Pagamento
                      </button>
                    ) : status === 'parcial' ? (
                      <>
                        <button
                          onClick={() => cancelarPagamento(pagamento.id)}
                          className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition font-medium flex items-center justify-center gap-2"
                        >
                          <Undo2 size={18} /> Cancelar
                        </button>
                        <button
                          onClick={() => abrirModalPagamento(membro)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition font-medium flex items-center justify-center gap-2"
                        >
                          <DollarSign size={18} /> Pagar Mês Atual
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => abrirModalPagamento(membro, pagamento)}
                        className={`flex-1 text-white py-3 px-4 rounded-lg transition font-medium flex items-center justify-center gap-2 ${
                          tipo === 'inadimplencia' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        <DollarSign size={18} />
                        {tipo === 'inadimplencia' ? 'Quitar Dívida' : 'Registrar Pagamento'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Modal: Registrar Pagamento */}
      {showPagamentoModal && membroSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              {pagamentoSelecionado && pagamentoSelecionado.quantidadeMeses < 0 ? 'Quitar Inadimplência' : 'Registrar Pagamento'}
            </h2>
            <div className="mb-4">
              <div className="text-sm font-bold text-gray-600">Membro:</div>
              <div className="font-bold text-lg text-gray-900">{membroSelecionado.nome}</div>
            </div>
            
            {pagamentoSelecionado && pagamentoSelecionado.quantidadeMeses < 0 && (
              <div className="mb-4 p-3 bg-orange-50 border-2 border-orange-300 rounded-lg">
                <p className="text-sm text-orange-800 font-bold mb-1">
                  🔔 Quitando mês específico:
                </p>
                <p className="text-lg text-orange-900 font-extrabold">
                  {pagamentoSelecionado.mesesReferentesExibicao || pagamentoSelecionado.mesesReferentes}
                </p>
                <p className="text-xs text-orange-600 mt-2">
                  Os outros meses devidos permanecerão pendentes e poderão ser quitados separadamente.
                </p>
              </div>
            )}
            
            {(() => {
                const isExcecao = excecoesPorMembro[membroSelecionado.id] !== undefined;

                let valorMensalidadeUnitario = Number(planilha.valorMensalidade);

                if (isExcecao) {
                    valorMensalidadeUnitario = Number(excecoesPorMembro[membroSelecionado.id]);
                }

                const valorCalculadoPadrao = valorMensalidadeUnitario * mesesPagar;
                const valorFinal = usarValorCustomizado && valorCustomizado
                  ? parseFloat(valorCustomizado.replace(/\./g, '').replace(',', '.'))
                  : valorCalculadoPadrao;

                const isInadimplencia = pagamentoSelecionado && pagamentoSelecionado.quantidadeMeses < 0;

                return (
                    <>
                    {!isInadimplencia && (
                      <>
                        <div className="mb-4">
                          <label className="block text-sm font-bold mb-1 text-gray-700">Mês Referência</label>
                          <select value={mesReferenciaPagamento} onChange={(e) => setMesReferenciaPagamento(parseInt(e.target.value))} className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900">
                            {meses.map((m, index) => (
                              <option key={index} value={index + 1}>{m}</option>
                            ))}
                          </select>
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-bold mb-1 text-gray-700">Quantidade de Meses</label>
                          <select value={mesesPagar} onChange={(e) => setMesesPagar(parseInt(e.target.value))} className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                              <option key={n} value={n}>{n} {n === 1 ? 'mês' : 'meses'}</option>
                            ))}
                          </select>
                        </div>

                        {mesesPagar > 0 && (() => {
                          const preview = [];
                          for (let i = 0; i < mesesPagar; i++) {
                            const m = mesReferenciaPagamento - i;
                            const a = m > 0 ? anoReferenciaPagamento : anoReferenciaPagamento - 1;
                            const mAdj = m > 0 ? m : 12 + m;
                            preview.push(`${meses[mAdj - 1].substring(0, 3)}/${String(a).slice(-2)}`);
                          }
                          preview.reverse();
                          return (
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-xs font-bold text-blue-600 uppercase mb-1">Meses que serão registrados</p>
                              <p className="font-bold text-blue-900 text-sm">{preview.join(', ')}</p>
                            </div>
                          );
                        })()}
                      </>
                    )}

                    {/* Opção: Antecipado */}
                    {!isInadimplencia && (
                    <div className="mb-4 p-3 bg-purple-50 border border-purple-300 rounded-lg">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAntecipado}
                          onChange={(e) => setIsAntecipado(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-bold text-purple-800">
                          Antecipado (marcar como pagamento antecipado)
                        </span>
                      </label>
                      {isAntecipado && (
                        <p className="text-xs text-purple-600 mt-1 ml-6">
                          O status aparecerá como "Antecipado" na tabela
                        </p>
                      )}
                    </div>
                    )}

                    {/* Opção: Isento */}
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-300 rounded-lg">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isento}
                          onChange={(e) => {
                            setIsento(e.target.checked);
                            if (e.target.checked) setUsarValorCustomizado(false);
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-bold text-blue-800">
                          Isento (registrar sem cobrança, valor R$ 0,00)
                        </span>
                      </label>
                    </div>

                    {/* Opção para editar valor - disponível para todos os pagamentos */}
                    {!isento && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={usarValorCustomizado}
                          onChange={(e) => setUsarValorCustomizado(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-bold text-yellow-800">
                          Editar valor {isExcecao ? '(tem exceção cadastrada)' : '(usar valor diferente)'}
                        </span>
                      </label>

                      {usarValorCustomizado && (
                        <div className="mt-3">
                          <label className="block text-xs font-semibold text-yellow-700 mb-1">
                            Valor Customizado (R$)
                          </label>
                          <input
                            type="text"
                            value={valorCustomizado}
                            onChange={(e) => handleValorChange(e, setValorCustomizado)}
                            className="w-full border-2 border-yellow-400 rounded px-3 py-2 text-gray-900 font-bold"
                            placeholder="0,00"
                          />
                          <p className="text-xs text-yellow-600 mt-1">
                            Use este campo para definir um valor diferente do padrão
                          </p>
                        </div>
                      )}
                    </div>
                    )}

                    <div className="mb-6 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                      <div className="text-sm text-gray-700 mb-1">
                        {isento ? 'Isento:' : usarValorCustomizado ? 'Valor Customizado:' : `Valor a Pagar (${isExcecao ? 'Exceção' : 'Padrão'}):`}
                      </div>
                      <div className="text-3xl font-extrabold text-green-700">
                        R$ {isento ? '0,00' : isNaN(valorFinal) ? '0,00' : valorFinal.toFixed(2)}
                      </div>
                      {isento && (
                        <div className="text-xs text-blue-600 mt-2">
                          Membro isento — pagamento registrado sem cobrança
                        </div>
                      )}
                      {isInadimplencia && !isento && (
                        <div className="text-xs text-green-600 mt-2">
                          ✓ Este valor quitará apenas o mês selecionado
                        </div>
                      )}
                    </div>
                    </>
                )
            })()}
            
            <div className="flex gap-2">
              <button 
                onClick={registrarPagamento} 
                className={`flex-1 text-white py-3 rounded-lg font-bold ${
                  pagamentoSelecionado && pagamentoSelecionado.quantidadeMeses < 0 
                    ? 'bg-orange-600 hover:bg-orange-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {pagamentoSelecionado && pagamentoSelecionado.quantidadeMeses < 0 ? '✓ Quitar Este Mês' : 'Confirmar Pagamento'}
              </button>
              <button onClick={() => {
                setShowPagamentoModal(false);
                setPagamentoSelecionado(null);
                setUsarValorCustomizado(false);
                setValorCustomizado('');
                setIsento(false);
                setIsAntecipado(false);
              }} className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 font-bold">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Adicionar Outros Recebimentos/Despesa */}

      {showLancamentoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              {modoEdicao ? 'Editar' : 'Adicionar'} {tipoLancamento === 'receita' ? 'Outro Recebimento' : 'Despesa (Caixa)'}
            </h2>
            
            <div className="space-y-4">
              {tipoLancamento === 'despesa' && (
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">Tipo de Gasto</label>
                  <select value={tipoGasto} onChange={(e) => setTipoGasto(e.target.value)} className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900">
                      <option value="VARIAVEL">VARIÁVEL</option>
                      <option value="FIXO">FIXO</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold mb-1 text-gray-700">Descrição</label>
                <input type="text" value={descricaoLancamento} onChange={(e) => setDescricaoLancamento(e.target.value)} className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900" placeholder="Ex: Doação, Aluguel, etc." />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1 text-gray-700">Data</label>
                <input type="date" value={dataLancamento} onChange={(e) => setDataLancamento(e.target.value)} className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900" />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1 text-gray-700">Valor (R$)</label>
                <input type="text" value={valorLancamento} onChange={(e) => handleValorChange(e, setValorLancamento)} className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900" placeholder="0,00" />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={modoEdicao ? editarLancamento : adicionarLancamento} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">{modoEdicao ? 'Salvar' : 'Adicionar'}</button>
              <button onClick={() => setShowLancamentoModal(false)} className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tronco de Beneficência / Doação Filantrópica */}
      {showTroncoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              {modoEdicao ? 'Editar' : 'Lançamento'} {tipoLancamento === 'tronco' ? 'Tronco de Beneficência' : 'Doação Filantrópica'}
            </h2>
            
            <div className="space-y-4">
              {tipoLancamento === 'tronco' && (
                <>
                  <div>
                    <label className="block text-sm font-bold mb-1 text-gray-700">Grau da Sessão</label>
                    <select value={grauSessao} onChange={(e) => setGrauSessao(e.target.value)} className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900">
                        <option value="">Selecione</option>
                        {grausSessao.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold mb-1 text-gray-700">Data da Sessão</label>
                    <input type="date" value={dataSessaoTronco} onChange={(e) => setDataSessaoTronco(e.target.value)} className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold mb-1 text-gray-700">Data do Depósito</label>
                    <input type="date" value={dataDepositoTronco} onChange={(e) => setDataDepositoTronco(e.target.value)} className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900" />
                  </div>
                </>
              )}
              
              {tipoLancamento === 'filantropia' && (
                <>
                  <div>
                    <label className="block text-sm font-bold mb-1 text-gray-700">Descrição da Doação</label>
                    <input type="text" value={descricaoFilantropia} onChange={(e) => setDescricaoFilantropia(e.target.value)} className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900" placeholder="Ex: Doação para Lar da Criança" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold mb-1 text-gray-700">Data da Doação</label>
                    <input type="date" value={dataFilantropia} onChange={(e) => setDataFilantropia(e.target.value)} className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900" />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-bold mb-1 text-gray-700">Valor (R$)</label>
                <input type="text" value={valorTronco} onChange={(e) => handleValorChange(e, setValorTronco)} className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900" placeholder="0,00" />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={modoEdicao ? editarLancamento : adicionarLancamento} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">{modoEdicao ? 'Salvar' : 'Adicionar'}</button>
              <button onClick={() => setShowTroncoModal(false)} className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}