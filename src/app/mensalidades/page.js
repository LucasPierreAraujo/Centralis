"use client"
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Save, FileDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '../components/Toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function MensalidadesPage() {
  const router = useRouter();
  const toast = useToast();
  const [membros, setMembros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [anoAtual] = useState(new Date().getFullYear());
  const [showConfig, setShowConfig] = useState(false);

  // Configurações de valores por mês - estrutura: { mes: { valorMensalidade, valorParcial } }
  const [configuracoes, setConfiguracoes] = useState({});

  // Estado dos pagamentos - estrutura: { membroId: { mes: 'ok'|'x'|'p'|'i' } }
  const [pagamentos, setPagamentos] = useState({});

  // Valores customizados por irmão/mês - estrutura: { membroId: { mes: { valorCustomizado } } }
  const [valoresCustomizados, setValoresCustomizados] = useState({});

  // Modal de valor customizado
  const [showModalValor, setShowModalValor] = useState(false);
  const [celulaEditando, setCelulaEditando] = useState({ membroId: null, mes: null });

  // Long press para mobile
  const [longPressTimer, setLongPressTimer] = useState(null);

  const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  useEffect(() => {
    carregarMembros();
    carregarPagamentos();
    carregarConfiguracoes();
  }, []);

  const carregarMembros = async () => {
    try {
      const response = await fetch('/api/membros');
      const data = await response.json();

      // Filtrar apenas Aprendiz, Companheiro, Mestre e Mestre Instalado ATIVOS
      const membrosFiltrados = data.filter(m => {
        const grauUpper = m.grau ? m.grau.toUpperCase() : '';
        return ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'].includes(grauUpper)
          && m.status === 'ATIVO';
      });

      setMembros(membrosFiltrados.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })));
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarPagamentos = async () => {
    try {
      const response = await fetch(`/api/mensalidades?ano=${anoAtual}`);
      if (response.ok) {
        const data = await response.json();
        setPagamentos(data.pagamentos || {});
      }
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
    }
  };

  const carregarConfiguracoes = async () => {
    try {
      const response = await fetch(`/api/mensalidades/config?ano=${anoAtual}`);
      if (response.ok) {
        const data = await response.json();

        // Se não houver configurações, inicializar com valores padrão
        const configsIniciais = {};
        meses.forEach(mes => {
          configsIniciais[mes] = data.configs?.[mes] || {
            valorMensalidade: '120.00',
            valorParcial: '60.00'
          };
        });

        setConfiguracoes(configsIniciais);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const atualizarConfigMes = (mes, campo, valor) => {
    setConfiguracoes({
      ...configuracoes,
      [mes]: {
        ...configuracoes[mes],
        [campo]: valor
      }
    });
  };

  const salvarConfiguracoes = async () => {
    try {
      // Salvar cada mês individualmente
      const promises = meses.map(mes =>
        fetch('/api/mensalidades/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ano: anoAtual,
            mes,
            valorMensalidade: configuracoes[mes]?.valorMensalidade || '120.00',
            valorParcial: configuracoes[mes]?.valorParcial || '60.00'
          })
        })
      );

      await Promise.all(promises);
      toast.success('Configurações salvas com sucesso!');
      setShowConfig(false);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    }
  };

  const alterarStatus = async (membroId, mes, statusAtual, event) => {
    if (event && event.type === 'contextmenu') {
      event.preventDefault();
      setCelulaEditando({ membroId, mes });
      setShowModalValor(true);
      return;
    }

    try {
      // Ciclo: null -> ok -> p -> x -> i -> null
      const ciclo = [null, 'ok', 'p', 'x', 'i'];
      const indexAtual = ciclo.indexOf(statusAtual);
      const novoStatus = ciclo[(indexAtual + 1) % ciclo.length];

      const novosPagamentos = {
        ...pagamentos,
        [membroId]: {
          ...(pagamentos[membroId] || {}),
          [mes]: novoStatus
        }
      };

      setPagamentos(novosPagamentos);

      const response = await fetch('/api/mensalidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ano: anoAtual, membroId, mes, status: novoStatus })
      });

      if (!response.ok) {
        toast.error('Erro ao salvar pagamento. Por favor, tente novamente.');
        setPagamentos(pagamentos);
      }
    } catch (error) {
      console.error('Erro ao salvar pagamento:', error);
      toast.error('Erro ao salvar pagamento. Verifique sua conexão.');
    }
  };

  // Funções para long press no mobile
  const handleTouchStart = (membroId, mes) => {
    let wasLongPress = false;

    const timer = setTimeout(() => {
      // Após 500ms de pressão, abre o modal de valor customizado
      wasLongPress = true;
      setCelulaEditando({ membroId, mes });
      setShowModalValor(true);
    }, 500);

    setLongPressTimer({ timer, wasLongPress: () => wasLongPress });
  };

  const handleTouchEnd = (membroId, mes, status, event) => {
    // Cancela o timer se o usuário soltou antes de 500ms
    if (longPressTimer) {
      const wasLongPress = longPressTimer.wasLongPress();
      clearTimeout(longPressTimer.timer);
      setLongPressTimer(null);

      // Se foi um toque rápido (não foi long press), altera o status
      if (!wasLongPress) {
        alterarStatus(membroId, mes, status, event);
      }
    }
  };

  const handleTouchCancel = () => {
    // Cancela o timer se o toque foi cancelado (usuário arrastou o dedo)
    if (longPressTimer) {
      clearTimeout(longPressTimer.timer);
      setLongPressTimer(null);
    }
  };

  const salvarValorCustomizado = (valor) => {
    if (!celulaEditando.membroId || !celulaEditando.mes) return;

    const novosValores = {
      ...valoresCustomizados,
      [celulaEditando.membroId]: {
        ...(valoresCustomizados[celulaEditando.membroId] || {}),
        [celulaEditando.mes]: valor ? parseFloat(valor) : null
      }
    };

    setValoresCustomizados(novosValores);
    setShowModalValor(false);
    toast.success('Valor customizado salvo!');
  };

  const calcularTotais = (membroId) => {
    const pagamentosMembro = pagamentos[membroId] || {};
    const valoresMembroCustom = valoresCustomizados[membroId] || {};
    let pago = 0;
    let pendente = 0;

    meses.forEach(mes => {
      const status = pagamentosMembro[mes];

      // Verificar se há valor customizado para este membro/mês
      const valorCustom = valoresMembroCustom[mes];
      const valorMensalidade = valorCustom !== undefined && valorCustom !== null
        ? valorCustom
        : parseFloat(configuracoes[mes]?.valorMensalidade || '120.00');
      const valorParcial = parseFloat(configuracoes[mes]?.valorParcial || '60.00');

      if (status === 'ok') {
        pago += valorMensalidade;
      } else if (status === 'p') {
        pago += valorParcial;
        pendente += valorMensalidade - valorParcial;
      } else if (status === 'x') {
        pendente += valorMensalidade;
      }
      // 'i' (isento) não conta
    });

    return { pago, pendente };
  };

  // Estatísticas do MÊS ATUAL (para os cards de situação)
  const calcularEstatisticas = () => {
    const mesAtual = meses[new Date().getMonth()];
    let totalPagoCompleto = 0;
    let totalPagoParcial = 0;
    let totalIsento = 0;
    let totalNaoPagou = 0;

    membros.forEach(membro => {
      const status = (pagamentos[membro.id] || {})[mesAtual];
      if (status === 'ok') {
        totalPagoCompleto++;
      } else if (status === 'p') {
        totalPagoParcial++;
      } else if (status === 'i') {
        totalIsento++;
      } else {
        // 'x' ou sem registro = não pagou o mês atual
        totalNaoPagou++;
      }
    });

    const totalIrmaos = membros.length;
    const totalPagaram = totalPagoCompleto + totalPagoParcial;

    return {
      totalIrmaos,
      totalPagaram,
      totalPagoCompleto,
      totalPagoParcial,
      totalIsento,
      totalNaoPagou,
      mesAtual
    };
  };

  // Totais gerais do ANO (mensalidades esperadas vs pagas)
  const calcularTotaisAno = () => {
    const mesAtualIdx = new Date().getMonth(); // 0 = JAN, 3 = ABR...
    const mesesPassados = meses.slice(0, mesAtualIdx + 1);

    let totalEsperado = 0;
    let totalPagas = 0;
    let totalParciais = 0;
    let totalInadimplentes = 0;

    membros.forEach(membro => {
      const pagamentosMembro = pagamentos[membro.id] || {};
      mesesPassados.forEach(mes => {
        const status = pagamentosMembro[mes];
        if (status === 'i') return; // isento não entra na contagem
        totalEsperado++;
        if (status === 'ok') totalPagas++;
        else if (status === 'p') totalParciais++;
        else if (status === 'x') totalInadimplentes++;
      });
    });

    return {
      mesesPassados: mesesPassados.length,
      totalEsperado,
      totalPagas,
      totalParciais,
      totalInadimplentes
    };
  };

  const gerarPDF = async () => {
    try {
      console.log('Iniciando geração do PDF...');
      const doc = new jsPDF('landscape');
      console.log('jsPDF instanciado');

      // Cabeçalho
      doc.setFontSize(16);
      doc.text('Controle de Mensalidades - ' + anoAtual, 14, 15);
      doc.setFontSize(10);
      doc.text('A.R.L.S. Sabedoria de Salomão Nº 4774', 14, 22);

      // Adicionar logo no canto direito (menor)
      try {
        const logoImg = new Image();
        logoImg.src = '/logo.jpeg';
        await new Promise((resolve) => {
          logoImg.onload = () => {
            // Adicionar logo no canto superior direito (tamanho 20x20)
            doc.addImage(logoImg, 'JPEG', 268, 5, 20, 20);
            console.log('Logo adicionado com sucesso');
            resolve();
          };
          logoImg.onerror = () => {
            console.warn('Logo não carregado, continuando sem logo');
            resolve();
          };
        });
      } catch (error) {
        console.warn('Erro ao carregar logo:', error);
      }

      // Usar a função calcularEstatisticas já existente
      const stats = calcularEstatisticas();
      console.log('Estatísticas calculadas:', stats);

      // Preparar dados da tabela
      const tableData = membros.map(membro => {
        const totais = calcularTotais(membro.id);
        const row = [membro.nome];
        const pagamentosMembro = pagamentos[membro.id] || {};

        // Adicionar status de cada mês
        meses.forEach(mes => {
          const status = pagamentosMembro[mes];
          let texto = '-';
          if (status === 'ok') texto = 'OK';
          else if (status === 'x') texto = 'X';
          else if (status === 'p') texto = 'P';
          else if (status === 'i') texto = 'I';
          row.push(texto);
        });

        // Adicionar totais
        row.push('R$ ' + totais.pago.toFixed(2));
        row.push('R$ ' + totais.pendente.toFixed(2));

        return row;
      });

      console.log('Dados da tabela preparados:', tableData.length, 'linhas');

      // Cabeçalhos da tabela
      const headers = ['NOME', ...meses, 'PAGO', 'PENDENTE'];

      console.log('Gerando tabela...');
      // Gerar tabela usando autoTable importado
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: 28,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' }, // Nome
          13: { cellWidth: 25, textColor: [22, 163, 74], fontStyle: 'bold' }, // Pago
          14: { cellWidth: 25, textColor: [220, 38, 38], fontStyle: 'bold' } // Pendente
        },
        didParseCell: function(data) {
          // Colorir células de status
          if (data.row.section === 'body' && data.column.index > 0 && data.column.index < 13) {
            const cellText = data.cell.text[0];
            if (cellText === 'OK') {
              data.cell.styles.fillColor = [34, 197, 94];
              data.cell.styles.textColor = [255, 255, 255];
            } else if (cellText === 'X') {
              data.cell.styles.fillColor = [239, 68, 68];
              data.cell.styles.textColor = [255, 255, 255];
            } else if (cellText === 'P') {
              data.cell.styles.fillColor = [234, 179, 8];
              data.cell.styles.textColor = [255, 255, 255];
            } else if (cellText === 'I') {
              data.cell.styles.fillColor = [59, 130, 246];
              data.cell.styles.textColor = [255, 255, 255];
            }
          }
        }
      });

      console.log('Tabela gerada com sucesso');
      console.log('Posição final da tabela:', doc.lastAutoTable.finalY);

      // Resumo estatístico e legenda na mesma linha
      let finalY = doc.lastAutoTable.finalY + 8;
      console.log('Adicionando resumo e legenda na posição Y:', finalY);

      // Resumo
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('RESUMO:', 14, finalY);

      doc.setFont(undefined, 'normal');
      const resumoTexto = `Pagos: ${stats.totalPagoCompleto} | Parciais: ${stats.totalPagoParcial} | Isentos: ${stats.totalIsento} | Não Pagaram: ${stats.totalNaoPagou} | Total: ${stats.totalIrmaos} irmãos`;
      doc.text(resumoTexto, 32, finalY);

      // Legenda ao lado direito
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.text('LEGENDA:', 180, finalY);

      doc.setFont(undefined, 'normal');
      doc.setFillColor(34, 197, 94);
      doc.rect(200, finalY - 2.5, 4, 3, 'F');
      doc.text('OK', 205, finalY);

      doc.setFillColor(234, 179, 8);
      doc.rect(215, finalY - 2.5, 4, 3, 'F');
      doc.text('P', 220, finalY);

      doc.setFillColor(239, 68, 68);
      doc.rect(228, finalY - 2.5, 4, 3, 'F');
      doc.text('X', 233, finalY);

      doc.setFillColor(59, 130, 246);
      doc.rect(241, finalY - 2.5, 4, 3, 'F');
      doc.text('I', 246, finalY);

      console.log('Resumo e legenda adicionados com sucesso');

      console.log('Salvando PDF...');
      // Salvar PDF
      doc.save(`mensalidades_${anoAtual}.pdf`);
      console.log('PDF salvo com sucesso');
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      console.error('Stack:', error.stack);
      toast.error('Erro ao gerar PDF: ' + error.message);
    }
  };

  const gerarPDFResumo = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const stats = calcularEstatisticas();
      const ano = calcularTotaisAno();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 15;

      // Logo
      try {
        const logoImg = new Image();
        logoImg.src = '/logo.jpeg';
        await new Promise((resolve) => {
          logoImg.onload = () => { doc.addImage(logoImg, 'JPEG', pageWidth - 30, 5, 20, 20); resolve(); };
          logoImg.onerror = () => resolve();
        });
      } catch (_) {}

      // Cabeçalho
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('A.R.L.S. Sabedoria de Salomão Nº 4774', pageWidth / 2, y, { align: 'center' });
      y += 7;
      doc.setFontSize(12);
      doc.text(`Resumo Estatístico de Mensalidades — ${anoAtual}`, pageWidth / 2, y, { align: 'center' });
      y += 5;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, y, { align: 'center' });
      y += 10;

      // Seção 1: Mês atual
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setFillColor(30, 58, 138);
      doc.setTextColor(255, 255, 255);
      doc.rect(14, y - 5, pageWidth - 28, 7, 'F');
      doc.text(`Situação do Mês de ${stats.mesAtual} — ${stats.totalIrmaos} irmãos ativos`, 16, y);
      doc.setTextColor(0, 0, 0);
      y += 10;

      const colW = (pageWidth - 28) / 4;
      const cards = [
        { label: 'Pagaram', valor: stats.totalPagaram, sub: `Completo: ${stats.totalPagoCompleto} / Parcial: ${stats.totalPagoParcial}`, cor: [34, 197, 94] },
        { label: 'Isentos', valor: stats.totalIsento, sub: 'não pagam mensalidade', cor: [59, 130, 246] },
        { label: 'Não Pagaram', valor: stats.totalNaoPagou, sub: 'pendentes no mês atual', cor: [239, 68, 68] },
        { label: 'Total de Irmãos', valor: stats.totalIrmaos, sub: 'ativos no sistema', cor: [107, 114, 128] },
      ];

      cards.forEach((card, i) => {
        const x = 14 + i * colW;
        doc.setDrawColor(...card.cor);
        doc.setLineWidth(0.8);
        doc.rect(x, y, colW - 3, 22);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...card.cor);
        doc.text(card.label, x + (colW - 3) / 2, y + 6, { align: 'center' });
        doc.setFontSize(18);
        doc.text(String(card.valor), x + (colW - 3) / 2, y + 14, { align: 'center' });
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(card.sub, x + (colW - 3) / 2, y + 20, { align: 'center' });
      });
      y += 30;

      // Seção 2: Acumulado do ano
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setFillColor(30, 58, 138);
      doc.setTextColor(255, 255, 255);
      doc.rect(14, y - 5, pageWidth - 28, 7, 'F');
      doc.text(`Acumulado do Ano — JAN a ${stats.mesAtual} (${ano.mesesPassados} ${ano.mesesPassados === 1 ? 'mês' : 'meses'})`, 16, y);
      doc.setTextColor(0, 0, 0);
      y += 10;

      const pctPagas = ano.totalEsperado > 0 ? ((ano.totalPagas / ano.totalEsperado) * 100).toFixed(1) : '0.0';
      const pctInad = ano.totalEsperado > 0 ? ((ano.totalInadimplentes / ano.totalEsperado) * 100).toFixed(1) : '0.0';

      const cardsAno = [
        { label: 'Esperadas', valor: ano.totalEsperado, sub: 'cobranças emitidas', cor: [139, 92, 246] },
        { label: 'Pagas', valor: ano.totalPagas, sub: `${pctPagas}% do esperado`, cor: [34, 197, 94] },
        { label: 'Parciais', valor: ano.totalParciais, sub: 'pagamentos parciais', cor: [234, 179, 8] },
        { label: 'Inadimplências', valor: ano.totalInadimplentes, sub: `${pctInad}% do esperado`, cor: [239, 68, 68] },
      ];

      cardsAno.forEach((card, i) => {
        const x = 14 + i * colW;
        doc.setDrawColor(...card.cor);
        doc.setLineWidth(0.8);
        doc.rect(x, y, colW - 3, 22);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...card.cor);
        doc.text(card.label, x + (colW - 3) / 2, y + 6, { align: 'center' });
        doc.setFontSize(18);
        doc.text(String(card.valor), x + (colW - 3) / 2, y + 14, { align: 'center' });
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(card.sub, x + (colW - 3) / 2, y + 20, { align: 'center' });
      });
      y += 32;

      // Barra de progresso de arrecadação
      doc.setFont(undefined, 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('Taxa de arrecadação no ano:', 14, y);
      y += 6;
      const barW = pageWidth - 28;
      doc.setFillColor(230, 230, 230);
      doc.rect(14, y, barW, 6, 'F');
      const pctNum = parseFloat(pctPagas);
      doc.setFillColor(34, 197, 94);
      doc.rect(14, y, barW * (pctNum / 100), 6, 'F');
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      if (pctNum > 10) doc.text(`${pctPagas}%`, 14 + (barW * (pctNum / 100)) / 2, y + 4.5, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      doc.save(`resumo_mensalidades_${anoAtual}.pdf`);
      toast.success('PDF do resumo gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF do resumo:', error);
      toast.error('Erro ao gerar PDF do resumo');
    }
  };

  const renderCelula = (membroId, mes) => {
    const status = pagamentos[membroId]?.[mes];
    const valorCustom = valoresCustomizados[membroId]?.[mes];
    const temValorCustomizado = valorCustom !== undefined && valorCustom !== null;

    let bgcolor = 'white';
    let texto = '';
    let textColor = 'black';

    if (status === 'ok') {
      bgcolor = '#22c55e'; // verde
      texto = 'OK';
      textColor = 'white';
    } else if (status === 'x') {
      bgcolor = '#ef4444'; // vermelho
      texto = 'X';
      textColor = 'white';
    } else if (status === 'p') {
      bgcolor = '#eab308'; // amarelo
      texto = 'P';
      textColor = 'white';
    } else if (status === 'i') {
      bgcolor = '#3b82f6'; // azul
      texto = 'I';
      textColor = 'white';
    }

    return (
      <td
        key={mes}
        onClick={(e) => alterarStatus(membroId, mes, status, e)}
        onContextMenu={(e) => alterarStatus(membroId, mes, status, e)}
        className="border border-gray-400 text-center cursor-pointer font-bold hover:opacity-80 relative"
        style={{
          backgroundColor: bgcolor,
          color: textColor,
          minWidth: '50px',
          padding: '8px'
        }}
        title={temValorCustomizado ? `Valor customizado: R$ ${valorCustom.toFixed(2)}` : 'Clique direito para definir valor customizado'}
      >
        {texto}
        {temValorCustomizado && (
          <span className="absolute top-0 right-0 text-xs bg-yellow-400 text-black px-1 rounded-bl">$</span>
        )}
      </td>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl font-bold text-gray-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-900 text-white p-3 md:p-4 shadow-lg">
        <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="hover:bg-blue-800 active:bg-blue-700 p-2 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <ArrowLeft size={22} />
            </button>
            <h1 className="text-lg sm:text-2xl font-bold">
              Mensalidades {anoAtual}
            </h1>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={gerarPDF}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 hover:bg-blue-800 active:bg-blue-700 border border-blue-700 px-4 py-2 rounded-lg transition disabled:opacity-50"
              disabled={membros.length === 0}
            >
              <FileDown size={20} />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={gerarPDFResumo}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 hover:bg-blue-800 active:bg-blue-700 border border-blue-700 px-4 py-2 rounded-lg transition disabled:opacity-50"
              disabled={membros.length === 0}
              title="Gerar PDF do Resumo Estatístico"
            >
              <FileDown size={20} />
              <span className="hidden sm:inline">Resumo</span>
            </button>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 hover:bg-blue-800 active:bg-blue-700 border border-blue-700 px-4 py-2 rounded-lg transition"
            >
              <Settings size={20} />
              <span className="hidden sm:inline">Config</span>
            </button>
          </div>
        </div>
      </header>

      {/* Painel de Configurações */}
      <div className="p-4">
        {showConfig && (
          <div className="mt-6 p-4 bg-white rounded-lg shadow-lg border-2 border-blue-300 max-h-96 overflow-y-auto">
            <h3 className="text-lg text-gray-900 font-bold mb-3">Configurar Valores por Mês</h3>
            <p className="text-sm text-gray-600 mb-4">
              Configure valores diferentes para cada mês do ano {anoAtual}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {meses.map(mes => (
                <div key={mes} className="border-2 border-gray-300 rounded p-3 bg-white">
                  <h4 className="font-bold text-center mb-2 text-blue-900">{mes}</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-900 font-bold mb-1">Mensalidade (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={configuracoes[mes]?.valorMensalidade || '120.00'}
                        onChange={(e) => atualizarConfigMes(mes, 'valorMensalidade', e.target.value)}
                        className="w-full border-2 text-gray-900 border-gray-600 rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-900 font-bold mb-1">Parcial (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={configuracoes[mes]?.valorParcial || '60.00'}
                        onChange={(e) => atualizarConfigMes(mes, 'valorParcial', e.target.value)}
                        className="w-full border-2 text-gray-900 border-gray-600 rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={salvarConfiguracoes}
              className="mt-4 flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              <Save size={20} />
              Salvar Todas as Configurações
            </button>
          </div>
        )}

        {/* Instruções de Uso */}
        <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
          <p className="text-sm font-bold text-blue-900 mb-2">
            💡 Como usar:
          </p>
          <ul className="text-sm text-blue-900 space-y-1 ml-4">
            <li className="hidden md:block">• <strong>Clique esquerdo</strong> na célula: alterna o status (Vazio → OK → P → X → I → Vazio)</li>
            <li className="hidden md:block">• <strong>Clique direito</strong> na célula: define valor customizado para aquele irmão/mês</li>
            <li className="md:hidden">• <strong>Toque rápido</strong> na célula: alterna o status (Vazio → OK → P → X → I → Vazio)</li>
            <li className="md:hidden">• <strong>Pressione e segure</strong> (long press) na célula: define valor customizado para aquele irmão/mês</li>
            <li>• Células com símbolo <span className="bg-yellow-400 text-black px-1 rounded text-xs">$</span> têm valor customizado</li>
          </ul>
        </div>

        {/* Legenda */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500  rounded flex items-center justify-center text-white font-bold">OK</div>
            <span className='text-gray-900'>PAGO</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-yellow-500 rounded flex items-center justify-center text-white font-bold">P</div>
            <span className='text-gray-900'>PARCIAL</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center text-white font-bold">X</div>
            <span className='text-gray-900'>PENDENTE</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold">I</div>
            <span className='text-gray-900'>ISENTO</span>
          </div>
        </div>
      </div>

      {/* Resumo Estatístico */}
      {(() => {
        const stats = calcularEstatisticas();
        const ano = calcularTotaisAno();
        return (
          <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-1">RESUMO ESTATÍSTICO</h2>
            <p className="text-xs text-gray-500 mb-4">Situação do mês de {stats.mesAtual} — {stats.totalIrmaos} irmãos ativos</p>

            {/* Cards do mês atual */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
              <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Pagaram ({stats.mesAtual})</div>
                <div className="text-3xl font-bold text-green-700">{stats.totalPagaram}</div>
                <div className="text-xs text-gray-500 mt-1">de {stats.totalIrmaos} irmãos</div>
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completo:</span>
                    <span className="font-bold text-green-700">{stats.totalPagoCompleto}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Parcial:</span>
                    <span className="font-bold text-yellow-600">{stats.totalPagoParcial}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Isentos ({stats.mesAtual})</div>
                <div className="text-3xl font-bold text-blue-700">{stats.totalIsento}</div>
                <div className="text-xs text-gray-500 mt-1">não pagam mensalidade</div>
              </div>

              <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Não Pagaram ({stats.mesAtual})</div>
                <div className="text-3xl font-bold text-red-700">{stats.totalNaoPagou}</div>
                <div className="text-xs text-gray-500 mt-1">pendentes no mês atual</div>
              </div>

              <div className="bg-gray-50 border-2 border-gray-500 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Total de Irmãos</div>
                <div className="text-3xl font-bold text-gray-700">{stats.totalIrmaos}</div>
                <div className="text-xs text-gray-500 mt-1">ativos no sistema</div>
              </div>
            </div>

            {/* Cards do ano */}
            <p className="text-xs text-gray-500 mb-3">Acumulado do ano — {ano.mesesPassados} {ano.mesesPassados === 1 ? 'mês' : 'meses'} considerados (JAN–{stats.mesAtual})</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-purple-50 border-2 border-purple-500 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Mensalidades Esperadas</div>
                <div className="text-3xl font-bold text-purple-700">{ano.totalEsperado}</div>
                <div className="text-xs text-gray-500 mt-1">cobranças no ano até agora</div>
              </div>

              <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Pagas no Ano</div>
                <div className="text-3xl font-bold text-green-700">{ano.totalPagas}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {ano.totalEsperado > 0 ? `${((ano.totalPagas / ano.totalEsperado) * 100).toFixed(0)}% do esperado` : '—'}
                </div>
              </div>

              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Parciais no Ano</div>
                <div className="text-3xl font-bold text-yellow-600">{ano.totalParciais}</div>
                <div className="text-xs text-gray-500 mt-1">pagamentos parciais</div>
              </div>

              <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Inadimplências no Ano</div>
                <div className="text-3xl font-bold text-red-600">{ano.totalInadimplentes}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {ano.totalEsperado > 0 ? `${((ano.totalInadimplentes / ano.totalEsperado) * 100).toFixed(0)}% do esperado` : '—'}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Visualização Desktop - Tabela */}
      <div className="hidden lg:block bg-white text-gray-900 rounded-lg shadow-lg overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-blue-900 text-white">
              <th className="border border-gray-400 px-4 py-2 text-left sticky left-0 bg-blue-900 z-10">NOME</th>
              {meses.map(mes => (
                <th key={mes} className="border border-gray-400 px-2 py-2">{mes}</th>
              ))}
              <th className="border border-gray-400 px-4 py-2 bg-green-700">PAGO</th>
              <th className="border border-gray-400 px-4 py-2 bg-red-700">PENDENTE</th>
            </tr>
          </thead>
          <tbody>
            {membros.map(membro => {
              const totais = calcularTotais(membro.id);
              return (
                <tr key={membro.id} className="hover:bg-gray-50">
                  <td className="border border-gray-400 px-4 py-2 font-semibold sticky left-0 bg-white">
                    {membro.nome}
                  </td>
                  {meses.map(mes => renderCelula(membro.id, mes))}
                  <td className="border border-gray-400 px-4 py-2 text-right font-bold text-green-700">
                    R$ {totais.pago.toFixed(2)}
                  </td>
                  <td className="border border-gray-400 px-4 py-2 text-right font-bold text-red-700">
                    R$ {totais.pendente.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Visualização Mobile - Cards */}
      <div className="lg:hidden space-y-4">
        {membros.map(membro => {
          const totais = calcularTotais(membro.id);
          return (
            <div key={membro.id} className="bg-white rounded-lg shadow-lg p-4">
              {/* Nome do Membro */}
              <h3 className="text-lg font-bold text-gray-900 mb-3 border-b-2 border-blue-900 pb-2">
                {membro.nome}
              </h3>

              {/* Grid de Meses - 3 colunas */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {meses.map(mes => {
                  const status = pagamentos[membro.id]?.[mes];
                  const valorCustom = valoresCustomizados[membro.id]?.[mes];
                  const temValorCustomizado = valorCustom !== undefined && valorCustom !== null;
                  let bgcolor = 'bg-gray-100';
                  let texto = '';
                  let textColor = 'text-gray-400';

                  if (status === 'ok') {
                    bgcolor = 'bg-green-500';
                    texto = 'OK';
                    textColor = 'text-white';
                  } else if (status === 'x') {
                    bgcolor = 'bg-red-500';
                    texto = 'X';
                    textColor = 'text-white';
                  } else if (status === 'p') {
                    bgcolor = 'bg-yellow-500';
                    texto = 'P';
                    textColor = 'text-white';
                  } else if (status === 'i') {
                    bgcolor = 'bg-blue-500';
                    texto = 'I';
                    textColor = 'text-white';
                  }

                  return (
                    <div
                      key={mes}
                      onTouchStart={() => handleTouchStart(membro.id, mes)}
                      onTouchEnd={(e) => handleTouchEnd(membro.id, mes, status, e)}
                      onTouchCancel={handleTouchCancel}
                      onContextMenu={(e) => alterarStatus(membro.id, mes, status, e)}
                      className={`${bgcolor} ${textColor} rounded p-3 text-center font-bold text-sm cursor-pointer hover:opacity-80 active:opacity-60 transition relative min-h-[60px] flex flex-col items-center justify-center touch-manipulation`}
                    >
                      <div className="text-xs mb-1 font-semibold">{mes}</div>
                      <div className="text-base">{texto || '-'}</div>
                      {temValorCustomizado && (
                        <span className="absolute top-1 right-1 text-xs bg-yellow-400 text-black px-1 rounded">$</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Totais */}
              <div className="flex justify-between pt-3 border-t border-gray-200">
                <div className="text-center flex-1">
                  <div className="text-xs text-gray-600 mb-1">PAGO</div>
                  <div className="text-lg font-bold text-green-700">
                    R$ {totais.pago.toFixed(2)}
                  </div>
                </div>
                <div className="text-center flex-1 border-l border-gray-200">
                  <div className="text-xs text-gray-600 mb-1">PENDENTE</div>
                  <div className="text-lg font-bold text-red-700">
                    R$ {totais.pendente.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Valor Customizado */}
      {showModalValor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowModalValor(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Valor Customizado</h3>
            <p className="text-sm text-gray-600 mb-4">
              Defina um valor específico para este irmão neste mês. Deixe em branco para usar o valor padrão.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Valor (R$):
              </label>
              <input
                type="number"
                step="0.01"
                defaultValue={valoresCustomizados[celulaEditando.membroId]?.[celulaEditando.mes] || ''}
                className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
                id="valorCustomInput"
                placeholder="Ex: 150.00"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowModalValor(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const input = document.getElementById('valorCustomInput');
                  salvarValorCustomizado(input.value);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
