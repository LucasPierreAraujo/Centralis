"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Calendar, CheckCircle, XCircle, Plus, BarChart3, X, Download, FolderOpen, FolderClosed, ChevronDown, ChevronRight, Edit, Clock } from 'lucide-react';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

export default function PresencasPage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [reunioes, setReunioes] = useState([]);
  const [membros, setMembros] = useState([]);
  const [reuniaoSelecionada, setReuniaoSelecionada] = useState(null);
  const [presencas, setPresencas] = useState({});
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarRelatorio, setMostrarRelatorio] = useState(false);
  const [novaReuniao, setNovaReuniao] = useState({
    data: '',
    horario: '',
    grau: 'APRENDIZ'
  });
  const [mostrarEdicao, setMostrarEdicao] = useState(false);
  const [reuniaoEditando, setReuniaoEditando] = useState(null);
  const [periodoRelatorio, setPeriodoRelatorio] = useState({
    dataInicio: '',
    dataFim: ''
  });
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [pastasAbertas, setPastasAbertas] = useState({});
  const [buscaNome, setBuscaNome] = useState('');

  // Nomes dos meses em português
  const nomesMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Mapeamento de tipos de reunião para exibição
  const tiposReuniao = {
    'APRENDIZ': { label: 'Aprendiz', cor: 'bg-blue-100 text-blue-800' },
    'COMPANHEIRO': { label: 'Companheiro', cor: 'bg-green-100 text-green-800' },
    'MESTRE': { label: 'Mestre', cor: 'bg-purple-100 text-purple-800' },
    'INICIACAO': { label: 'Iniciação', cor: 'bg-yellow-100 text-yellow-800' },
    'ELEVACAO': { label: 'Elevação', cor: 'bg-orange-100 text-orange-800' },
    'PASSAGEM_GRAU': { label: 'Promoção', cor: 'bg-pink-100 text-pink-800' },
    'INSTALACAO': { label: 'Instalação', cor: 'bg-red-100 text-red-800' },
    'A_CAMPO': { label: 'A Campo', cor: 'bg-gray-100 text-gray-800' },
    'EXTRAORDINARIA': { label: 'Extraordinária', cor: 'bg-indigo-100 text-indigo-800' },
    'REGULARIZACAO': { label: 'Regularização', cor: 'bg-teal-100 text-teal-800' },
    'FILIACAO': { label: 'Filiação', cor: 'bg-cyan-100 text-cyan-800' }
  };

  const getTipoReuniao = (grau) => tiposReuniao[grau] || { label: grau, cor: 'bg-gray-100 text-gray-800' };

  // Função para agrupar reuniões por mês/ano
  const agruparReunioesPorMes = () => {
    const grupos = {};

    reunioes.forEach(reuniao => {
      const data = new Date(reuniao.data + 'T00:00:00');
      const mes = data.getMonth();
      const ano = data.getFullYear();
      const chave = `${ano}-${String(mes).padStart(2, '0')}`;

      if (!grupos[chave]) {
        grupos[chave] = {
          mes,
          ano,
          nome: `${nomesMeses[mes]} ${ano}`,
          reunioes: []
        };
      }
      grupos[chave].reunioes.push(reuniao);
    });

    // Ordenar reuniões dentro de cada grupo por data (mais recente primeiro)
    Object.values(grupos).forEach(grupo => {
      grupo.reunioes.sort((a, b) => new Date(b.data) - new Date(a.data));
    });

    // Retornar grupos ordenados por ano/mês (mais recente primeiro)
    return Object.entries(grupos)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([chave, grupo]) => ({ chave, ...grupo }));
  };

  // Toggle para abrir/fechar pasta
  const togglePasta = (chave) => {
    setPastasAbertas(prev => ({
      ...prev,
      [chave]: !prev[chave]
    }));
  };

  // Abrir pasta do mês atual automaticamente
  useEffect(() => {
    const hoje = new Date();
    const chaveAtual = `${hoje.getFullYear()}-${hoje.getMonth()}`;
    setPastasAbertas(prev => ({ ...prev, [chaveAtual]: true }));
  }, []);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      // Carregar membros
      const resMembros = await fetch('/api/membros');
      const membrosData = await resMembros.json();

      if (Array.isArray(membrosData)) {
        setMembros(membrosData.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })));
      }

      // Carregar reuniões da API
      const resReunioes = await fetch('/api/reunioes');
      const reunioesData = await resReunioes.json();

      if (Array.isArray(reunioesData)) {
        setReunioes(reunioesData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const criarReuniao = async () => {
    if (!novaReuniao.data) {
      toast.error('Por favor, selecione uma data');
      return;
    }

    try {
      const response = await fetch('/api/reunioes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: novaReuniao.data,
          horario: novaReuniao.horario,
          grau: novaReuniao.grau
        })
      });

      const data = await response.json();

      if (data.success) {
        // Adicionar a nova reunião à lista
        setReunioes([...reunioes, data.reuniao]);
        setNovaReuniao({ data: '', horario: '', grau: 'APRENDIZ' });
        setMostrarFormulario(false);
        toast.success('Reunião criada com sucesso!');
      } else {
        toast.error('Erro ao criar reunião: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao criar reunião:', error);
      toast.error('Erro ao criar reunião');
    }
  };

  const abrirEdicao = (reuniao) => {
    setReuniaoEditando({
      id: reuniao.id,
      data: reuniao.data,
      horario: reuniao.horario || '',
      grau: reuniao.grau
    });
    setMostrarEdicao(true);
  };

  const salvarEdicao = async () => {
    if (!reuniaoEditando.data) {
      toast.error('Por favor, selecione uma data');
      return;
    }

    try {
      const response = await fetch('/api/reunioes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: reuniaoEditando.id,
          data: reuniaoEditando.data,
          horario: reuniaoEditando.horario,
          grau: reuniaoEditando.grau
        })
      });

      const data = await response.json();

      if (data.success) {
        // Atualizar a reunião na lista
        const reunioesAtualizadas = reunioes.map(r => {
          if (r.id === reuniaoEditando.id) {
            return {
              ...r,
              data: data.reuniao.data,
              horario: data.reuniao.horario,
              grau: data.reuniao.grau
            };
          }
          return r;
        });

        setReunioes(reunioesAtualizadas);

        // Atualizar a reunião selecionada se for a mesma
        if (reuniaoSelecionada?.id === reuniaoEditando.id) {
          setReuniaoSelecionada({
            ...reuniaoSelecionada,
            data: data.reuniao.data,
            horario: data.reuniao.horario,
            grau: data.reuniao.grau
          });
        }

        setMostrarEdicao(false);
        setReuniaoEditando(null);
        toast.success('Reunião atualizada com sucesso!');
      } else {
        toast.error('Erro ao atualizar reunião: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao editar reunião:', error);
      toast.error('Erro ao editar reunião');
    }
  };

  const excluirReuniao = async (id) => {
    const reuniao = reunioes.find(r => r.id === id);
    const dataFormatada = reuniao ? new Date(reuniao.data + 'T00:00:00').toLocaleDateString('pt-BR') : '';

    const confirmed = await confirm.confirm({
      title: 'Excluir Reunião',
      message: `Deseja realmente excluir a reunião de ${dataFormatada} (${reuniao?.grau})? Esta ação não pode ser desfeita e todas as presenças registradas serão perdidas.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      const response = await fetch('/api/reunioes', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id })
      });

      const data = await response.json();

      if (data.success) {
        const novasReunioes = reunioes.filter(r => r.id !== id);
        setReunioes(novasReunioes);

        if (reuniaoSelecionada?.id === id) {
          setReuniaoSelecionada(null);
        }

        toast.success('Reunião excluída com sucesso!');
      } else {
        toast.error('Erro ao excluir reunião: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao excluir reunião:', error);
      toast.error('Erro ao excluir reunião');
    }
  };

  const selecionarReuniao = (reuniao) => {
    setReuniaoSelecionada(reuniao);
    setPresencas(reuniao.presencas || {});
  };

  const togglePresenca = (membroId) => {
    setPresencas(prev => ({
      ...prev,
      [membroId]: !prev[membroId]
    }));
  };

  const salvarPresencas = async () => {
    if (!reuniaoSelecionada) return;

    try {
      const response = await fetch('/api/presencas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reuniaoId: reuniaoSelecionada.id,
          presencas
        })
      });

      const data = await response.json();

      if (data.success) {
        // Atualizar a lista de reuniões localmente
        const reunioesAtualizadas = reunioes.map(r => {
          if (r.id === reuniaoSelecionada.id) {
            return { ...r, presencas };
          }
          return r;
        });

        setReunioes(reunioesAtualizadas);
        toast.success('Presenças salvas com sucesso!');
      } else {
        toast.error('Erro ao salvar presenças: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao salvar presenças:', error);
      toast.error('Erro ao salvar presenças');
    }
  };

  const getMembrosPermitidos = (grauReuniao, dataReuniao) => {
    const hierarquia = {
      // Sessões Magnas por grau
      'APRENDIZ': ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'],
      'COMPANHEIRO': ['COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'],
      'MESTRE': ['MESTRE', 'MESTRE INSTALADO'],
      // Sessões Especiais
      'INICIACAO': ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'],
      'PASSAGEM_GRAU': ['COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'],
      'ELEVACAO': ['MESTRE', 'MESTRE INSTALADO'],
      'INSTALACAO': ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'],
      // Outras Sessões
      'A_CAMPO': ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'],
      'EXTRAORDINARIA': ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'],
      'REGULARIZACAO': ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'],
      'FILIACAO': ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO']
    };

    // Determinar o nível da reunião para verificar a data correta
    const reunioesNivelCompanheiro = ['COMPANHEIRO', 'PASSAGEM_GRAU'];
    const reunioesNivelMestre = ['MESTRE', 'ELEVACAO'];

    // Função para obter a data de referência do membro para uma reunião
    const getDataReferencia = (membro, tipoReuniao) => {
      // Se tem data de filiação, ela tem prioridade total
      if (membro.dataFiliacao) {
        return new Date(membro.dataFiliacao);
      }

      // Determinar a data base conforme o nível da reunião
      let dataBase = null;
      if (reunioesNivelMestre.includes(tipoReuniao) && membro.dataElevacao) {
        dataBase = new Date(membro.dataElevacao);
      } else if (reunioesNivelCompanheiro.includes(tipoReuniao) && membro.dataPassagemGrau) {
        dataBase = new Date(membro.dataPassagemGrau);
      } else if (membro.dataIniciacao) {
        dataBase = new Date(membro.dataIniciacao);
      }

      // Se tem data de regularização, usar a mais recente entre ela e a data base
      if (membro.dataRegularizacao) {
        const dataReg = new Date(membro.dataRegularizacao);
        if (!dataBase || dataReg > dataBase) {
          return dataReg;
        }
      }

      return dataBase;
    };

    return membros.filter(m => {
      // Filtrar apenas membros ativos
      if (m.status !== 'ATIVO') {
        return false;
      }

      // Filtrar por grau
      if (!hierarquia[grauReuniao]?.includes(m.grau)) {
        return false;
      }

      if (dataReuniao) {
        const dataReuniaoDate = new Date(dataReuniao);
        const dataRef = getDataReferencia(m, grauReuniao);

        if (dataRef && dataRef > dataReuniaoDate) {
          return false;
        }
      }

      return true;
    });
  };

  const calcularRelatorio = (dataInicio = null, dataFim = null) => {
    const relatorio = {};

    // Data de hoje (sem horário) para comparar
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999); // Fim do dia de hoje

    // Filtrar apenas membros ativos com grau (excluir candidatos, filiados e inativos)
    const membrosAtivos = membros.filter(m => m.grau && m.grau !== 'CANDIDATO' && m.grau !== 'FILIADO' && m.status === 'ATIVO');

    membrosAtivos.forEach(membro => {
      const reunioesPermitidas = reunioes.filter(r => {
        // Quais tipos de reunião cada grau de membro pode participar
        const hierarquia = {
          'APRENDIZ': ['APRENDIZ', 'INICIACAO', 'INSTALACAO', 'A_CAMPO', 'EXTRAORDINARIA', 'REGULARIZACAO', 'FILIACAO'],
          'COMPANHEIRO': ['APRENDIZ', 'COMPANHEIRO', 'INICIACAO', 'PASSAGEM_GRAU', 'INSTALACAO', 'A_CAMPO', 'EXTRAORDINARIA', 'REGULARIZACAO', 'FILIACAO'],
          'MESTRE': ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'INICIACAO', 'PASSAGEM_GRAU', 'ELEVACAO', 'INSTALACAO', 'A_CAMPO', 'EXTRAORDINARIA', 'REGULARIZACAO', 'FILIACAO'],
          'MESTRE INSTALADO': ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'INICIACAO', 'PASSAGEM_GRAU', 'ELEVACAO', 'INSTALACAO', 'A_CAMPO', 'EXTRAORDINARIA', 'REGULARIZACAO', 'FILIACAO']
        };

        // Verificar se o grau da reunião está permitido para o membro
        if (!hierarquia[membro.grau]?.includes(r.grau)) {
          return false;
        }

        // NOVO: Ignorar reuniões futuras (só contar até hoje)
        if (r.data) {
          const dataReuniao = new Date(r.data);
          if (dataReuniao > hoje) {
            return false;
          }
        }

        // Verificar se a reunião aconteceu após a data de referência do membro
        if (r.data) {
          const dataReuniao = new Date(r.data);
          const reunioesNivelMestre = ['MESTRE', 'ELEVACAO'];
          const reunioesNivelCompanheiro = ['COMPANHEIRO', 'PASSAGEM_GRAU'];

          // Função para obter a data de referência
          const getDataRef = () => {
            // Se tem data de filiação, ela tem prioridade total
            if (membro.dataFiliacao) {
              return new Date(membro.dataFiliacao);
            }

            // Determinar a data base conforme o nível da reunião
            let dataBase = null;
            if (reunioesNivelMestre.includes(r.grau) && membro.dataElevacao) {
              dataBase = new Date(membro.dataElevacao);
            } else if (reunioesNivelCompanheiro.includes(r.grau) && membro.dataPassagemGrau) {
              dataBase = new Date(membro.dataPassagemGrau);
            } else if (membro.dataIniciacao) {
              dataBase = new Date(membro.dataIniciacao);
            }

            // Se tem data de regularização, usar a mais recente entre ela e a data base
            if (membro.dataRegularizacao) {
              const dataReg = new Date(membro.dataRegularizacao);
              if (!dataBase || dataReg > dataBase) {
                return dataReg;
              }
            }

            return dataBase;
          };

          const dataRef = getDataRef();
          if (dataRef && dataReuniao < dataRef) {
            return false;
          }
        }

        // Filtrar por período se especificado
        if (dataInicio && dataFim && r.data) {
          const dataReuniao = new Date(r.data);
          const inicio = new Date(dataInicio);
          const fim = new Date(dataFim);

          if (dataReuniao < inicio || dataReuniao > fim) {
            return false;
          }
        }

        return true;
      });

      const totalReunioes = reunioesPermitidas.length;
      const presencasCount = reunioesPermitidas.filter(r => r.presencas?.[membro.id]).length;
      const porcentagem = totalReunioes > 0 ? ((presencasCount / totalReunioes) * 100).toFixed(1) : 0;

      relatorio[membro.id] = {
        nome: membro.nome,
        grau: membro.grau,
        cim: membro.cim || '-',
        dataIniciacao: membro.dataIniciacao || '-',
        total: totalReunioes,
        presencas: presencasCount,
        porcentagem
      };
    });

    return relatorio;
  };

  const gerarPDFRelatorio = async () => {
    setGerandoPDF(true);
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const maxWidth = pageWidth - (2 * margin);
      let yPosition = margin;

      // Adicionar logo centralizado acima do cabeçalho
      try {
        const logoImg = new Image();
        logoImg.src = '/logo.jpeg';
        await new Promise((resolve) => {
          logoImg.onload = () => {
            // Logo de 20x20mm centralizado no topo
            const logoX = (pageWidth - 20) / 2;
            pdf.addImage(logoImg, 'JPEG', logoX, yPosition, 20, 20);
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

      // Espaço para o logo
      yPosition += 28;

      // Cabeçalho
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('A.R.L.S. Sabedoria de Salomão Nº 4774', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;

      pdf.setFontSize(12);
      pdf.text('Relatório de Frequência', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Período
      if (periodoRelatorio.dataInicio && periodoRelatorio.dataFim) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        const inicio = new Date(periodoRelatorio.dataInicio).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        const fim = new Date(periodoRelatorio.dataFim).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        pdf.text(`Período: ${inicio} a ${fim}`, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 8;
      } else {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Período: Todas as reuniões', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 8;
      }

      // Cabeçalho da tabela
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');

      const colWidths = {
        nome: 45,
        cim: 22,
        dataIniciacao: 25,
        grau: 30,
        aplicaveis: 18,
        presencas: 18,
        frequencia: 22
      };

      let xPos = margin;
      pdf.text('Membro', xPos, yPosition);
      xPos += colWidths.nome;
      pdf.text('CIM', xPos, yPosition);
      xPos += colWidths.cim;
      pdf.text('Iniciação', xPos, yPosition);
      xPos += colWidths.dataIniciacao;
      pdf.text('Grau', xPos, yPosition);
      xPos += colWidths.grau;
      pdf.text('Reuniões', xPos, yPosition);
      xPos += colWidths.aplicaveis;
      pdf.text('Presenças', xPos, yPosition);
      xPos += colWidths.presencas;
      pdf.text('Frequência', xPos, yPosition);

      yPosition += 2;
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;

      // Calcular relatório com período
      const relatorio = calcularRelatorio(periodoRelatorio.dataInicio, periodoRelatorio.dataFim);

      // Dados da tabela
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      Object.values(relatorio).forEach((item) => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = margin;
        }

        xPos = margin;
        // Nome (limitado para não ultrapassar a coluna)
        const nomeMaxWidth = colWidths.nome - 2;
        pdf.text(item.nome, xPos, yPosition, { maxWidth: nomeMaxWidth });

        xPos += colWidths.nome;
        // CIM
        pdf.text(item.cim, xPos, yPosition);

        xPos += colWidths.cim;
        // Data de Iniciação formatada
        const dataIniciacaoFormatada = item.dataIniciacao !== '-'
          ? new Date(item.dataIniciacao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
          : '-';
        pdf.text(dataIniciacaoFormatada, xPos, yPosition);

        xPos += colWidths.dataIniciacao;
        // Grau
        pdf.text(item.grau, xPos, yPosition);

        xPos += colWidths.grau;
        // Reuniões centralizado
        pdf.text(String(item.total), xPos + 5, yPosition);

        xPos += colWidths.aplicaveis;
        // Presenças centralizado
        pdf.text(String(item.presencas), xPos + 5, yPosition);

        xPos += colWidths.presencas;
        // Frequência centralizado
        pdf.text(`${item.porcentagem}%`, xPos + 3, yPosition);

        yPosition += 6;
      });

      // Resumo estatístico no PDF
      yPosition += 8;
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = margin;
      }
      const itens = Object.values(relatorio);
      const hojeResumo = new Date();
      hojeResumo.setHours(23, 59, 59, 999);
      const sessoesPeriodoPDF = reunioes.filter(r => {
        if (r.data && new Date(r.data) > hojeResumo) return false;
        if (periodoRelatorio.dataInicio && periodoRelatorio.dataFim && r.data) {
          const dr = new Date(r.data);
          const inicio = new Date(periodoRelatorio.dataInicio);
          const fim = new Date(periodoRelatorio.dataFim);
          if (dr < inicio || dr > fim) return false;
        }
        return true;
      });
      const totalSessoesPDF = sessoesPeriodoPDF.length;
      const mediaFrequenciaPDF = itens.length > 0
        ? (itens.reduce((sum, item) => sum + parseFloat(item.porcentagem), 0) / itens.length).toFixed(1)
        : '0.0';

      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Total de sessões${periodoRelatorio.dataInicio && periodoRelatorio.dataFim ? ' no período' : ''}: ${totalSessoesPDF}`, margin, yPosition);
      pdf.text(`Média de frequência geral: ${mediaFrequenciaPDF}%`, pageWidth / 2 + 10, yPosition);
      yPosition += 8;

      // Rodapé com regras
      yPosition += 5;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text('Regras de contabilização:', margin, yPosition);
      yPosition += 4;
      pdf.text('• Aprendizes: contam apenas reuniões de Aprendiz após sua iniciação', margin, yPosition);
      yPosition += 4;
      pdf.text('• Companheiros: contam reuniões de Aprendiz e Companheiro após sua iniciação', margin, yPosition);
      yPosition += 4;
      pdf.text('• Mestres: contam todas as reuniões após sua iniciação', margin, yPosition);

      const dataAtual = new Date().toLocaleDateString('pt-BR');
      const periodoTexto = periodoRelatorio.dataInicio && periodoRelatorio.dataFim
        ? `_${periodoRelatorio.dataInicio}_a_${periodoRelatorio.dataFim}`
        : '';

      pdf.save(`Relatorio_Frequencia${periodoTexto}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF do relatório');
    } finally {
      setGerandoPDF(false);
    }
  };

  const calcularResumoEstatistico = () => {
    const agora = new Date();
    const anoAtual = agora.getFullYear();
    const mesAtual = agora.getMonth();
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    // Membros ativos elegíveis
    const grausPermitidos = ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'];
    const membrosAtivos = membros.filter(m =>
      grausPermitidos.includes((m.grau || '').toUpperCase()) && m.status === 'ATIVO'
    ).length || 1; // evitar divisão por zero

    const pct = (presencas, sessoes) => {
      if (sessoes === 0 || membrosAtivos === 0) return '—';
      return ((presencas / (sessoes * membrosAtivos)) * 100).toFixed(1) + '%';
    };

    const reunioesPassadas = reunioes.filter(r => r.data && new Date(r.data) <= hoje);

    // Mensal
    const reunioesMes = reunioesPassadas.filter(r => {
      const d = new Date(r.data + 'T00:00:00');
      return d.getFullYear() === anoAtual && d.getMonth() === mesAtual;
    });
    const media = (presencas, sessoes) =>
      sessoes > 0 ? (presencas / sessoes).toFixed(1) : '—';

    const presencasMes = reunioesMes.reduce((sum, r) =>
      sum + Object.values(r.presencas || {}).filter(Boolean).length, 0);
    const mediaMes    = pct(presencasMes, reunioesMes.length);
    const mediaIrmaosMes = media(presencasMes, reunioesMes.length);

    // Anual
    const reunioesAno = reunioesPassadas.filter(r => {
      const d = new Date(r.data + 'T00:00:00');
      return d.getFullYear() === anoAtual;
    });
    const presencasAno = reunioesAno.reduce((sum, r) =>
      sum + Object.values(r.presencas || {}).filter(Boolean).length, 0);
    const mediaAno    = pct(presencasAno, reunioesAno.length);
    const mediaIrmaosAno = media(presencasAno, reunioesAno.length);

    // Geral
    const totalPresencas = reunioesPassadas.reduce((sum, r) =>
      sum + Object.values(r.presencas || {}).filter(Boolean).length, 0);
    const mediaGeral  = pct(totalPresencas, reunioesPassadas.length);
    const mediaIrmaosGeral = media(totalPresencas, reunioesPassadas.length);

    // Membros mais assíduos e menos assíduos (geral) — inclui empates
    const itensRelatorio = Object.values(calcularRelatorio());
    const ordenados = [...itensRelatorio].sort((a, b) => parseFloat(b.porcentagem) - parseFloat(a.porcentagem));
    const maxPct = ordenados.length > 0 ? parseFloat(ordenados[0].porcentagem) : null;
    const minPct = ordenados.length > 0 ? parseFloat(ordenados[ordenados.length - 1].porcentagem) : null;
    const maisAssiduo = maxPct !== null ? ordenados.filter(m => parseFloat(m.porcentagem) === maxPct) : [];
    const menosAssiduo = minPct !== null && minPct !== maxPct ? ordenados.filter(m => parseFloat(m.porcentagem) === minPct) : [];

    return {
      sessoesMes: reunioesMes.length,
      presencasMes,
      mediaMes,
      mediaIrmaosMes,
      sessoesAno: reunioesAno.length,
      presencasAno,
      mediaAno,
      mediaIrmaosAno,
      totalSessoes: reunioesPassadas.length,
      totalPresencas,
      mediaGeral,
      mediaIrmaosGeral,
      membrosAtivos,
      maisAssiduo,
      menosAssiduo,
      anoAtual,
      mesAtualNome: nomesMeses[mesAtual],
    };
  };

  const gerarPDFResumoPresencas = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const r = calcularResumoEstatistico();
      const doc = new jsPDF();
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
      doc.setFontSize(14); doc.setFont(undefined, 'bold');
      doc.text('A.R.L.S. Sabedoria de Salomão Nº 4774', pageWidth / 2, y, { align: 'center' });
      y += 7;
      doc.setFontSize(12);
      doc.text('Resumo Estatístico de Presenças', pageWidth / 2, y, { align: 'center' });
      y += 5;
      doc.setFontSize(9); doc.setFont(undefined, 'normal');
      doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} — ${r.membrosAtivos} irmãos ativos`, pageWidth / 2, y, { align: 'center' });
      y += 12;

      const desenharSecao = (titulo, cor, dados) => {
        doc.setFillColor(...cor);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11); doc.setFont(undefined, 'bold');
        doc.rect(14, y - 5, pageWidth - 28, 7, 'F');
        doc.text(titulo, 16, y);
        doc.setTextColor(0, 0, 0);
        y += 8;

        dados.forEach(([label, valor]) => {
          doc.setFontSize(9); doc.setFont(undefined, 'normal');
          doc.text(label, 18, y);
          doc.setFont(undefined, 'bold');
          doc.text(String(valor), pageWidth - 14, y, { align: 'right' });
          doc.setFont(undefined, 'normal');
          y += 6;
        });
        y += 4;
      };

      desenharSecao(`Mês Atual — ${r.mesAtualNome}`, [30, 58, 138], [
        ['Sessões realizadas', r.sessoesMes],
        ['Total de presenças', r.presencasMes],
        ['Média de irmãos por sessão', r.mediaIrmaosMes],
        ['Frequência média', r.mediaMes],
      ]);

      desenharSecao(`Ano de ${r.anoAtual}`, [21, 128, 61], [
        ['Sessões realizadas', r.sessoesAno],
        ['Total de presenças', r.presencasAno],
        ['Média de irmãos por sessão', r.mediaIrmaosAno],
        ['Frequência média', r.mediaAno],
      ]);

      desenharSecao('Geral — Todos os Registros', [107, 33, 168], [
        ['Total de sessões registradas', r.totalSessoes],
        ['Total de presenças registradas', r.totalPresencas],
        ['Média de irmãos por sessão', r.mediaIrmaosGeral],
        ['Frequência média geral', r.mediaGeral],
      ]);

      // Destaques
      if (r.maisAssiduo.length > 0 || r.menosAssiduo.length > 0) {
        doc.setFillColor(55, 65, 81);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11); doc.setFont(undefined, 'bold');
        doc.rect(14, y - 5, pageWidth - 28, 7, 'F');
        doc.text('Destaques', 16, y);
        doc.setTextColor(0, 0, 0);
        y += 8;

        if (r.maisAssiduo.length > 0) {
          doc.setFontSize(9); doc.setFont(undefined, 'normal');
          doc.text(`Mais assíduo${r.maisAssiduo.length > 1 ? 's' : ''}:`, 18, y);
          doc.setFont(undefined, 'bold');
          const nomesMais = r.maisAssiduo.map(m => m.nome).join(', ');
          doc.text(`${nomesMais} — ${r.maisAssiduo[0].porcentagem}%`, pageWidth - 14, y, { align: 'right' });
          y += 6;
        }
        if (r.menosAssiduo.length > 0) {
          doc.setFont(undefined, 'normal');
          doc.text(`Menor frequência${r.menosAssiduo.length > 1 ? 's' : ''}:`, 18, y);
          doc.setFont(undefined, 'bold');
          const nomesMenos = r.menosAssiduo.map(m => m.nome).join(', ');
          doc.text(`${nomesMenos} — ${r.menosAssiduo[0].porcentagem}%`, pageWidth - 14, y, { align: 'right' });
        }
      }

      doc.save(`resumo_presencas_${r.anoAtual}.pdf`);
      toast.success('PDF do resumo gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF do resumo');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl font-bold text-gray-600">Carregando...</div>
      </div>
    );
  }

  const membrosPermitidos = reuniaoSelecionada ? getMembrosPermitidos(reuniaoSelecionada.grau, reuniaoSelecionada.data) : [];
  const relatorio = calcularRelatorio(periodoRelatorio.dataInicio, periodoRelatorio.dataFim);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-900 text-white p-3 md:p-4 shadow-lg">
        <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => router.push('/dashboard')} className="hover:bg-blue-800 active:bg-blue-700 p-2 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center">
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold">Controle de Presenças</h1>
              <p className="text-xs sm:text-sm text-blue-200 hidden sm:block">Gerenciar reuniões e presenças</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={gerarPDFResumoPresencas}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 hover:bg-blue-800 active:bg-blue-700 border border-blue-700 px-4 py-2 rounded-lg transition"
              title="Gerar PDF do Resumo Estatístico"
            >
              <Download size={20} />
              <span className="hidden sm:inline">Resumo PDF</span>
            </button>
            <button
              onClick={() => setMostrarRelatorio(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 hover:bg-blue-800 active:bg-blue-700 border border-blue-700 px-4 py-2 rounded-lg transition"
            >
              <BarChart3 size={20} />
              <span className="hidden sm:inline">Relatório</span>
            </button>
            <button
              onClick={() => setMostrarFormulario(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 hover:bg-blue-800 active:bg-blue-700 border border-blue-700 px-4 py-2 rounded-lg transition"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Nova Reunião</span>
            </button>
          </div>
        </div>
      </header>

      {/* Modal - Nova Reunião */}
      {mostrarFormulario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-black">Nova Reunião</h2>
              <button onClick={() => setMostrarFormulario(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Data da Reunião</label>
                <input
                  type="date"
                  value={novaReuniao.data}
                  onChange={(e) => setNovaReuniao({ ...novaReuniao, data: e.target.value })}
                  className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Horário</label>
                <input
                  type="time"
                  value={novaReuniao.horario}
                  onChange={(e) => setNovaReuniao({ ...novaReuniao, horario: e.target.value })}
                  className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="19:30"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Reunião</label>
                <select
                  value={novaReuniao.grau}
                  onChange={(e) => setNovaReuniao({ ...novaReuniao, grau: e.target.value })}
                  className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <optgroup label="Sessões Magnas">
                    <option value="APRENDIZ">Aprendiz</option>
                    <option value="COMPANHEIRO">Companheiro</option>
                    <option value="MESTRE">Mestre</option>
                  </optgroup>
                  <optgroup label="Sessões Especiais">
                    <option value="INICIACAO">Iniciação</option>
                    <option value="ELEVACAO">Elevação</option>
                    <option value="PASSAGEM_GRAU">Promoção</option>
                    <option value="INSTALACAO">Instalação</option>
                  </optgroup>
                  <optgroup label="Outras Sessões">
                    <option value="A_CAMPO">A Campo</option>
                    <option value="EXTRAORDINARIA">Extraordinária</option>
                    <option value="REGULARIZACAO">Regularização</option>
                    <option value="FILIACAO">Filiação</option>
                  </optgroup>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={criarReuniao}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  Criar Reunião
                </button>
                <button
                  onClick={() => setMostrarFormulario(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Editar Reunião */}
      {mostrarEdicao && reuniaoEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-black">Editar Reunião</h2>
              <button onClick={() => { setMostrarEdicao(false); setReuniaoEditando(null); }} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Data da Reunião</label>
                <input
                  type="date"
                  value={reuniaoEditando.data}
                  onChange={(e) => setReuniaoEditando({ ...reuniaoEditando, data: e.target.value })}
                  className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Horário</label>
                <input
                  type="time"
                  value={reuniaoEditando.horario}
                  onChange={(e) => setReuniaoEditando({ ...reuniaoEditando, horario: e.target.value })}
                  className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="19:30"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Reunião</label>
                <select
                  value={reuniaoEditando.grau}
                  onChange={(e) => setReuniaoEditando({ ...reuniaoEditando, grau: e.target.value })}
                  className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <optgroup label="Sessões Magnas">
                    <option value="APRENDIZ">Aprendiz</option>
                    <option value="COMPANHEIRO">Companheiro</option>
                    <option value="MESTRE">Mestre</option>
                  </optgroup>
                  <optgroup label="Sessões Especiais">
                    <option value="INICIACAO">Iniciação</option>
                    <option value="ELEVACAO">Elevação</option>
                    <option value="PASSAGEM_GRAU">Promoção</option>
                    <option value="INSTALACAO">Instalação</option>
                  </optgroup>
                  <optgroup label="Outras Sessões">
                    <option value="A_CAMPO">A Campo</option>
                    <option value="EXTRAORDINARIA">Extraordinária</option>
                    <option value="REGULARIZACAO">Regularização</option>
                    <option value="FILIACAO">Filiação</option>
                  </optgroup>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={salvarEdicao}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  Salvar Alterações
                </button>
                <button
                  onClick={() => { setMostrarEdicao(false); setReuniaoEditando(null); }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Relatório */}
      {mostrarRelatorio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl text-gray-700 font-bold">Relatório de Frequência</h2>
              <button onClick={() => { setMostrarRelatorio(false); setBuscaNome(''); }} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            {/* Filtros de Período */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Data Início</label>
                  <input
                    type="date"
                    value={periodoRelatorio.dataInicio}
                    onChange={(e) => setPeriodoRelatorio({ ...periodoRelatorio, dataInicio: e.target.value })}
                    className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold  text-gray-700 mb-2">Data Fim</label>
                  <input
                    type="date"
                    value={periodoRelatorio.dataFim}
                    onChange={(e) => setPeriodoRelatorio({ ...periodoRelatorio, dataFim: e.target.value })}
                    className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={gerarPDFRelatorio}
                  disabled={gerandoPDF}
                  className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
                >
                  <Download size={18} />
                  {gerandoPDF ? 'Gerando...' : 'Gerar PDF'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Deixe as datas em branco para considerar todas as reuniões
              </p>
            </div>

            {/* Busca por nome */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Buscar irmão pelo nome..."
                value={buscaNome}
                onChange={(e) => setBuscaNome(e.target.value)}
                className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-200 text-gray-900 sticky top-0 z-20">
                  <tr>
                    <th className="px-4 py-2 text-left">Membro</th>
                    <th className="px-4 py-2 text-center">CIM</th>
                    <th className="px-4 py-2 text-center">Data Iniciação</th>
                    <th className="px-4 py-2 text-center">Grau</th>
                    <th className="px-4 py-2 text-center">Reuniões</th>
                    <th className="px-4 py-2 text-center">Presenças</th>
                    <th className="px-4 py-2 text-center">Frequência</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(relatorio).filter(item =>
                    item.nome.toLowerCase().includes(buscaNome.toLowerCase())
                  ).map((item, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50 text-gray-900">
                      <td className="px-4 py-3">{item.nome}</td>
                      <td className="px-4 py-3 text-center text-sm">{item.cim}</td>
                      <td className="px-4 py-3 text-center text-sm">
                        {item.dataIniciacao !== '-'
                          ? new Date(item.dataIniciacao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          item.grau === 'APRENDIZ' ? 'bg-blue-100 text-blue-800' :
                          item.grau === 'COMPANHEIRO' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {item.grau}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">{item.total}</td>
                      <td className="px-4 py-3 text-center">{item.presencas}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${
                          parseFloat(item.porcentagem) >= 75 ? 'text-green-600' :
                          parseFloat(item.porcentagem) >= 50 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {item.porcentagem}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Resumo estatístico */}
              {(() => {
                const itens = Object.values(relatorio);
                const hoje = new Date();
                hoje.setHours(23, 59, 59, 999);
                const sessoesPeriodo = reunioes.filter(r => {
                  if (r.data && new Date(r.data) > hoje) return false;
                  if (periodoRelatorio.dataInicio && periodoRelatorio.dataFim && r.data) {
                    const dr = new Date(r.data);
                    const inicio = new Date(periodoRelatorio.dataInicio);
                    const fim = new Date(periodoRelatorio.dataFim);
                    if (dr < inicio || dr > fim) return false;
                  }
                  return true;
                });
                const totalSessoes = sessoesPeriodo.length;
                const mediaFrequencia = itens.length > 0
                  ? (itens.reduce((sum, item) => sum + parseFloat(item.porcentagem), 0) / itens.length).toFixed(1)
                  : '0.0';
                return (
                  <div className="mt-4 flex gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex-1 text-center">
                      <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Total de Sessões</p>
                      <p className="text-2xl font-bold text-blue-800 mt-1">{totalSessoes}</p>
                      <p className="text-xs text-blue-500 mt-1">{periodoRelatorio.dataInicio && periodoRelatorio.dataFim ? 'no período selecionado' : 'total geral'}</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex-1 text-center">
                      <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Média de Frequência</p>
                      <p className={`text-2xl font-bold mt-1 ${parseFloat(mediaFrequencia) >= 75 ? 'text-green-700' : parseFloat(mediaFrequencia) >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{mediaFrequencia}%</p>
                      <p className="text-xs text-green-500 mt-1">{periodoRelatorio.dataInicio && periodoRelatorio.dataFim ? 'média dos membros no período' : 'média geral dos membros'}</p>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <p><strong>Regras de contabilização:</strong></p>
              <ul className="list-disc list-inside mt-2">
                <li>Aprendizes: contam apenas reuniões de Aprendiz após sua iniciação</li>
                <li>Companheiros: contam reuniões de Aprendiz e Companheiro após sua iniciação</li>
                <li>Mestres: contam todas as reuniões (Aprendiz, Companheiro e Mestre) após sua iniciação</li>
                <li>Apenas reuniões realizadas na data de iniciação ou após são contabilizadas</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Resumo Estatístico */}
      {(() => {
        const r = calcularResumoEstatistico();
        return (
          <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6">
            <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart3 size={20} />
                Resumo Estatístico
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Mensal */}
                <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-3">
                    Mês Atual — {r.mesAtualNome}
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Sessões realizadas</span>
                      <span className="font-bold text-blue-700 text-lg">{r.sessoesMes}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total de presenças</span>
                      <span className="font-bold text-blue-700 text-lg">{r.presencasMes}</span>
                    </div>
                    <div className="border-t pt-2 mt-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Média de irmãos/sessão</span>
                        <span className="font-bold text-blue-700">{r.mediaIrmaosMes}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Frequência média</span>
                        <span className="font-bold text-blue-800 text-xl">{r.mediaMes}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Anual */}
                <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                  <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-3">
                    Ano de {r.anoAtual}
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Sessões realizadas</span>
                      <span className="font-bold text-green-700 text-lg">{r.sessoesAno}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total de presenças</span>
                      <span className="font-bold text-green-700 text-lg">{r.presencasAno}</span>
                    </div>
                    <div className="border-t pt-2 mt-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Média de irmãos/sessão</span>
                        <span className="font-bold text-green-700">{r.mediaIrmaosAno}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Frequência média</span>
                        <span className="font-bold text-green-800 text-xl">{r.mediaAno}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Geral */}
                <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                  <p className="text-xs font-bold text-purple-600 uppercase tracking-wide mb-3">
                    Geral — Todos os Registros
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total de sessões</span>
                      <span className="font-bold text-purple-700 text-lg">{r.totalSessoes}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total de presenças</span>
                      <span className="font-bold text-purple-700 text-lg">{r.totalPresencas}</span>
                    </div>
                    <div className="border-t pt-2 mt-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Média de irmãos/sessão</span>
                        <span className="font-bold text-purple-700">{r.mediaIrmaosGeral}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Frequência média</span>
                        <span className="font-bold text-purple-800 text-xl">{r.mediaGeral}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Destaques */}
              {(r.maisAssiduo.length > 0 || r.menosAssiduo.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {r.maisAssiduo.length > 0 && (
                    <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                      <CheckCircle size={22} className="text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-green-600 font-semibold">Mais assíduo{r.maisAssiduo.length > 1 ? 's' : ''}</p>
                        {r.maisAssiduo.map((m, i) => (
                          <p key={i} className="font-bold text-gray-800 text-sm">{m.nome}</p>
                        ))}
                        <p className="text-xs text-gray-500">{r.maisAssiduo[0].porcentagem}% de frequência</p>
                      </div>
                    </div>
                  )}
                  {r.menosAssiduo.length > 0 && (
                    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                      <XCircle size={22} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-red-500 font-semibold">Menor frequência{r.menosAssiduo.length > 1 ? 's' : ''}</p>
                        {r.menosAssiduo.map((m, i) => (
                          <p key={i} className="font-bold text-gray-800 text-sm">{m.nome}</p>
                        ))}
                        <p className="text-xs text-gray-500">{r.menosAssiduo[0].porcentagem}% de frequência</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Reuniões por Mês/Ano */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar size={20} />
                Reuniões ({reunioes.length})
              </h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {reunioes.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Nenhuma reunião criada<br />
                    <span className="text-sm">Clique em "Nova Reunião" para começar</span>
                  </p>
                ) : (
                  agruparReunioesPorMes().map((grupo) => (
                    <div key={grupo.chave} className="border rounded-lg overflow-hidden">
                      {/* Cabeçalho da pasta (mês/ano) */}
                      <button
                        onClick={() => togglePasta(grupo.chave)}
                        className="w-full flex items-center justify-between p-3 bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {pastasAbertas[grupo.chave] ? (
                            <FolderOpen size={20} className="text-yellow-600" />
                          ) : (
                            <FolderClosed size={20} className="text-yellow-600" />
                          )}
                          <span className="font-semibold text-gray-800">{grupo.nome}</span>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            {grupo.reunioes.length}
                          </span>
                        </div>
                        {pastasAbertas[grupo.chave] ? (
                          <ChevronDown size={18} className="text-gray-500" />
                        ) : (
                          <ChevronRight size={18} className="text-gray-500" />
                        )}
                      </button>

                      {/* Reuniões dentro da pasta */}
                      {pastasAbertas[grupo.chave] && (
                        <div className="p-2 space-y-2 bg-gray-50">
                          {grupo.reunioes.map((reuniao) => (
                            <div
                              key={reuniao.id}
                              className={`p-3 rounded-lg border-2 transition-all bg-white ${
                                reuniaoSelecionada?.id === reuniao.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200'
                              }`}
                            >
                              <button
                                onClick={() => selecionarReuniao(reuniao)}
                                className="w-full text-left"
                              >
                                <div className="font-semibold text-gray-800">
                                  {new Date(reuniao.data + 'T00:00:00').toLocaleDateString('pt-BR', {
                                    weekday: 'short',
                                    day: '2-digit',
                                    month: 'short'
                                  })}
                                  {reuniao.horario && (
                                    <span className="ml-2 text-sm font-normal text-gray-600">
                                      <Clock size={12} className="inline mr-1" />
                                      {reuniao.horario}
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm mt-1">
                                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getTipoReuniao(reuniao.grau).cor}`}>
                                    {getTipoReuniao(reuniao.grau).label}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {Object.keys(reuniao.presencas || {}).filter(k => reuniao.presencas[k]).length} presentes
                                </div>
                              </button>
                              <div className="mt-2 flex gap-2">
                                <button
                                  onClick={() => abrirEdicao(reuniao)}
                                  className="flex-1 text-xs text-blue-600 hover:text-blue-800 py-1 hover:bg-blue-50 rounded flex items-center justify-center gap-1"
                                >
                                  <Edit size={12} />
                                  Editar
                                </button>
                                <button
                                  onClick={() => excluirReuniao(reuniao.id)}
                                  className="flex-1 text-xs text-red-600 hover:text-red-800 py-1 hover:bg-red-50 rounded"
                                >
                                  Excluir
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Lista de Membros para Marcar Presença */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Users size={20} />
                {reuniaoSelecionada
                  ? `Presenças - ${new Date(reuniaoSelecionada.data + 'T00:00:00').toLocaleDateString('pt-BR')}${reuniaoSelecionada.horario ? ` às ${reuniaoSelecionada.horario}` : ''} (${getTipoReuniao(reuniaoSelecionada.grau).label})`
                  : 'Selecione uma reunião'}
              </h2>

              {!reuniaoSelecionada ? (
                <div className="text-center py-12 text-gray-500">
                  <Users size={48} className="mx-auto mb-4 text-gray-400" />
                  <p>Selecione uma reunião ao lado para registrar presenças</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="text-sm text-gray-600">
                      <strong>{Object.values(presencas).filter(p => p).length}</strong> de <strong>{membrosPermitidos.length}</strong> membros presentes
                    </div>
                    <button
                      onClick={salvarPresencas}
                      className="w-full sm:w-auto bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-6 py-3 rounded-lg font-semibold transition"
                    >
                      Salvar Presenças
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
                    {membrosPermitidos.map((membro) => (
                      <button
                        key={membro.id}
                        onClick={() => togglePresenca(membro.id)}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          presencas[membro.id]
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-300 bg-white hover:border-gray-400 active:border-gray-500'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-800 truncate">{membro.nome}</div>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <span className="text-xs text-gray-500">CIM: {membro.cim}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                membro.grau === 'APRENDIZ' ? 'bg-blue-100 text-blue-800' :
                                membro.grau === 'COMPANHEIRO' ? 'bg-green-100 text-green-800' :
                                'bg-purple-100 text-purple-800'
                              }`}>
                                {membro.grau}
                              </span>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {presencas[membro.id] ? (
                              <CheckCircle size={28} className="text-green-600" />
                            ) : (
                              <XCircle size={28} className="text-gray-400" />
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
