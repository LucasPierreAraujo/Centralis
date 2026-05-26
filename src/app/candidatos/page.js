"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Edit, ChevronRight, ChevronDown, Check, Home, User, Info, X, Settings, ArrowLeft } from 'lucide-react';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

const ETAPAS = [
  {
    numero: 1,
    titulo: 'Formulário de Interesse',
    responsavel: 'Mestres Maçons Proponentes e Secretaria da Loja',
    descricao: 'O candidato manifesta interesse preenchendo a Pré-Proposta de Ingresso, documento de controle interno da Loja.',
  },
  {
    numero: 2,
    titulo: 'Entrega e Preenchimento do Formulário de Indicação',
    responsavel: 'Mestres Proponentes, Candidato e Secretaria',
    descricao: 'Se aprovada a Pré-Proposta, a Loja entrega o Formulário Oficial de Indicação de Candidato (GOB).',
  },
  {
    numero: 3,
    titulo: 'Documentos para o Drive',
    responsavel: 'Secretário',
    descricao: 'Upload no Drive: certidões civil/criminais, RG/CPF, foto 3x4, comprovante de endereço, certidão de casamento (se casado), SPC/Serasa.',
  },
  {
    numero: 4,
    titulo: 'Envio de Documentação ao GOB (Em PDF)',
    responsavel: 'Secretário',
    descricao: 'Envio ao GOB dos documentos: formulário de indicação do candidato, certidões civil e criminais (federal e estadual), RG/CPF, foto 3x4, comprovante de endereço.',
  },
  {
    numero: 5,
    titulo: 'Boletim',
    responsavel: 'Secretário',
    descricao: 'Data da primeira publicação no boletim GOB Federal.',
  },
  {
    numero: 6,
    titulo: 'Sindicância',
    responsavel: 'Venerável Mestre',
    descricao: 'Após o nome sair no Boletim, o Venerável Mestre escolherá os sindicantes para realizar as sindicâncias nos próximos 15 dias.',
  },
  {
    numero: 7,
    titulo: 'Escrutínio',
    responsavel: 'Venerável Mestre',
    descricao: 'Após 15 dias da publicação no Boletim do GOB, realiza-se o escrutínio secreto por meio de esferas.\n⚪ Aprovação  |  ⚫ Reprovação',
  },
  {
    numero: 8,
    titulo: 'Pagamento das Taxas',
    responsavel: 'Tesouraria da Loja',
    descricao: 'Recolhimento das taxas após aprovação:\n• GOB-CE: R$ 550,00 (pasta, avental, luvas, ritual e diploma) + R$ 150,00 de AMPM\n• GOB Poder Central: R$ 210,00\n• Loja: Valor complementar para um salário mínimo vigente',
  },
  {
    numero: 9,
    titulo: 'Agendamento e Realização da Cerimônia',
    responsavel: 'Venerável Mestre e Corpo Ritualístico',
    descricao: 'O Venerável Mestre agenda a data da cerimônia e organiza os preparativos ritualísticos e materiais.\n⚠️ Deve ser informado ao GOB-CE por prancha.',
  },
  {
    numero: 10,
    titulo: 'Registro do Novo Obreiro',
    responsavel: 'Secretaria da Loja e Guarda dos Selos',
    descricao: 'Comunicação imediata à Guarda dos Selos (até 48h após a iniciação) para emissão do CIM, via Formulário de Comunicação de Iniciação do GOB.',
  },
  {
    numero: 11,
    titulo: 'Repasse do CIM e Cadastro no E-GOB Card',
    responsavel: 'Venerável Mestre',
    descricao: 'Repasse dos dados maçônicos aos Iniciados e cadastro no E-GOB Card (identidade maçônica virtual) e Palavra Semestral.',
  },
];

const STATUS_INFO = {
  EM_ANDAMENTO: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  APROVADO:     { label: 'Iniciado',      color: 'bg-green-100 text-green-800 border-green-300' },
  REPROVADO:    { label: 'Reprovado',     color: 'bg-red-100 text-red-800 border-red-300' },
  DESISTIU:     { label: 'Desistiu',      color: 'bg-gray-100 text-gray-700 border-gray-300' },
};

export default function CandidatosPage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const scrollPosRef = React.useRef(null);

  const [candidatos, setCandidatos] = useState([]);
  const [membros, setMembros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [candidatoAberto, setCandidatoAberto] = useState(null);
  const [datasBoletim, setDatasBoletim] = useState({});
  const [showConfig, setShowConfig] = useState(false);
  const [etapasConfig, setEtapasConfig] = useState(ETAPAS);
  const [modeloSindicanciaUrl, setModeloSindicanciaUrl] = useState(null);
  const [uploadandoModelo, setUploadandoModelo] = useState(false);
  const [enviandoSindicancia, setEnviandoSindicancia] = useState(null);
  const [etapasConfigTemp, setEtapasConfigTemp] = useState(ETAPAS);

  const [showSenhaModal, setShowSenhaModal] = useState(false);
  const [showSindicantesModal, setShowSindicantesModal] = useState(false);
  const [senhaInput, setSenhaInput] = useState('');
  const [senhaError, setSenhaError] = useState(false);
  const [sindicantesSelecionados, setSindicantesSelecionados] = useState([]);
  const [candidatoSindicantes, setCandidatoSindicantes] = useState(null);
  const [modalSenhaAcao, setModalSenhaAcao] = useState('escolher'); // 'ver' | 'escolher' | 'excluir'
  const [showVerSindicantesModal, setShowVerSindicantesModal] = useState(false);

  const [formData, setFormData] = useState({
    nome: '', dataNascimento: '', nomeConjuge: '',
    enderecoResidencial: '', telefone: '', telefoneFixo: '',
    enderecoProfissional: '', grauInstrucao: '',
    email: '', proponenteIds: [], observacoes: ''
  });

  useEffect(() => { carregarDados(); }, []);

  useEffect(() => {
    if (!loading && scrollPosRef.current !== null) {
      window.scrollTo(0, scrollPosRef.current);
      scrollPosRef.current = null;
    }
  }, [loading]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [resCand, resMembros, resConfig, resModelo] = await Promise.all([
        fetch('/api/candidatos'),
        fetch('/api/membros'),
        fetch('/api/configuracao-etapas'),
        fetch('/api/configuracao-geral?chave=modelo_sindicancia_url'),
      ]);
      const dataCand = await resCand.json();
      const dataMembros = await resMembros.json();
      const dataConfig = await resConfig.json();
      const dataModelo = await resModelo.json();
      setCandidatos(Array.isArray(dataCand) ? dataCand : []);
      setMembros((Array.isArray(dataMembros) ? dataMembros : []).filter(m =>
        ['MESTRE', 'MESTRE INSTALADO'].includes(m.grau?.toUpperCase()) && m.status === 'ATIVO'
      ));
      if (Array.isArray(dataConfig)) setEtapasConfig(dataConfig);
      if (dataModelo?.valor) setModeloSindicanciaUrl(dataModelo.valor);
    } catch {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const uploadModelo = async (file) => {
    if (!file || !file.name.endsWith('.docx')) {
      toast.error('Selecione um arquivo .docx');
      return;
    }
    setUploadandoModelo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload-raw', { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      // Salvar URL na config
      await fetch('/api/configuracao-geral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: 'modelo_sindicancia_url', valor: data.url }),
      });
      setModeloSindicanciaUrl(data.url);
      toast.success('Modelo enviado com sucesso!');
    } catch (err) {
      toast.error('Erro ao enviar modelo: ' + err.message);
    } finally {
      setUploadandoModelo(false);
    }
  };

  const enviarSindicancia = async (candidatoId) => {
    setEnviandoSindicancia(candidatoId);
    try {
      const res = await fetch('/api/candidatos/enviar-sindicancia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidatoId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Sindicância enviada para ${data.enviados} sindicante(s)!`);
      if (data.erros?.length) {
        data.erros.forEach(e => toast.warning(`${e.sindicante}: ${e.erro}`));
      }
    } catch (err) {
      toast.error('Erro ao enviar: ' + err.message);
    } finally {
      setEnviandoSindicancia(null);
    }
  };

  const abrirNovo = () => {
    setEditingId(null);
    setFormData({
      nome: '', dataNascimento: '', nomeConjuge: '',
      enderecoResidencial: '', telefone: '', telefoneFixo: '',
      enderecoProfissional: '', grauInstrucao: '',
      email: '', proponenteIds: [], observacoes: ''
    });
    setShowForm(true);
  };

  const abrirEditar = (cand) => {
    setEditingId(cand.id);
    let ids = [];
    try { ids = JSON.parse(cand.proponenteIds || '[]'); } catch {}
    setFormData({
      nome: cand.nome || '',
      dataNascimento: cand.dataNascimento || '',
      nomeConjuge: cand.nomeConjuge || '',
      enderecoResidencial: cand.enderecoResidencial || '',
      telefone: cand.telefone || '',
      telefoneFixo: cand.telefoneFixo || '',
      enderecoProfissional: cand.enderecoProfissional || '',
      grauInstrucao: cand.grauInstrucao || '',
      email: cand.email || '',
      proponenteIds: ids,
      observacoes: cand.observacoes || ''
    });
    setShowForm(true);
  };

  const salvar = async () => {
    if (!formData.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    try {
      const method = editingId ? 'PUT' : 'POST';
      const proponenteNomes = membros.filter(m => formData.proponenteIds.includes(m.id)).map(m => m.nome).join(', ');
      const res = await fetch('/api/candidatos', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, ...(editingId && { id: editingId }), proponenteNomes })
      });
      if (!res.ok) throw new Error();
      toast.success(editingId ? 'Candidato atualizado!' : 'Candidato cadastrado!');
      setShowForm(false);
      scrollPosRef.current = window.scrollY;
      carregarDados();
    } catch { toast.error('Erro ao salvar candidato'); }
  };

  const excluir = async (id) => {
    const ok = await confirm.confirm({
      title: 'Excluir Candidato',
      message: 'Deseja realmente excluir este candidato?',
      confirmText: 'Excluir', cancelText: 'Cancelar', type: 'danger'
    });
    if (!ok) return;
    try {
      await fetch('/api/candidatos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      toast.success('Candidato excluído');
      if (candidatoAberto === id) setCandidatoAberto(null);
      scrollPosRef.current = window.scrollY;
      carregarDados();
    } catch { toast.error('Erro ao excluir'); }
  };

  const concluirEtapa = async (cand, numeroEtapa) => {
    const etapas = typeof cand.etapas === 'object' && cand.etapas !== null ? { ...cand.etapas } : {};
    const key = String(numeroEtapa);
    const jaConcluida = etapas[key]?.concluida;
    const dataEtapa = numeroEtapa === 5
      ? (datasBoletim[cand.id] || new Date().toISOString().split('T')[0])
      : new Date().toISOString().split('T')[0];
    etapas[key] = jaConcluida ? { concluida: false, data: null } : { concluida: true, data: dataEtapa };

    // recalcular etapa atual
    let novaEtapaAtual = 1;
    for (let i = 1; i <= 11; i++) {
      if (etapas[String(i)]?.concluida) { novaEtapaAtual = Math.min(i + 1, 11); }
      else { novaEtapaAtual = i; break; }
    }
    const todasConcluidas = Array.from({ length: 11 }, (_, i) => i + 1).every(i => etapas[String(i)]?.concluida);
    const novoStatus = todasConcluidas ? 'APROVADO' : cand.status === 'APROVADO' ? 'EM_ANDAMENTO' : cand.status;

    // Promover a membro apenas quando completar a última etapa pela primeira vez
    const devePromover = !jaConcluida && todasConcluidas && cand.status !== 'APROVADO';

    try {
      await fetch('/api/candidatos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cand.id, etapaAtual: novaEtapaAtual, etapas, status: novoStatus })
      });

      if (devePromover) {
        const resPromover = await fetch('/api/candidatos/promover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidatoId: cand.id })
        });
        const dataPromover = await resPromover.json();
        if (dataPromover.success) {
          toast.success(`${cand.nome} promovido a Aprendiz e adicionado como membro!`);
        } else {
          toast.error('Erro ao promover: ' + (dataPromover.error || 'Erro desconhecido'));
        }
      } else if (!jaConcluida) {
        toast.success(`Etapa ${numeroEtapa} concluída!`);
      }

      scrollPosRef.current = window.scrollY;
      carregarDados();
    } catch { toast.error('Erro ao atualizar etapa'); }
  };

  const alterarStatus = async (cand, novoStatus) => {
    try {
      await fetch('/api/candidatos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cand.id, status: novoStatus })
      });
      toast.success('Status atualizado');
      scrollPosRef.current = window.scrollY;
      carregarDados();
    } catch { toast.error('Erro ao alterar status'); }
  };

  const getEtapasObj = (cand) =>
    typeof cand.etapas === 'object' && cand.etapas !== null ? cand.etapas : {};

  const abrirEscolhaSindicantes = (e, cand) => {
    e.stopPropagation();
    setCandidatoSindicantes(cand);
    setModalSenhaAcao('escolher');
    setSenhaInput('');
    setSenhaError(false);
    setShowSenhaModal(true);
  };

  const abrirVerSindicantes = (e, cand) => {
    e.stopPropagation();
    setCandidatoSindicantes(cand);
    setModalSenhaAcao('ver');
    setSenhaInput('');
    setSenhaError(false);
    setShowSenhaModal(true);
  };

  const abrirExcluirSindicantes = (e, cand) => {
    e.stopPropagation();
    setCandidatoSindicantes(cand);
    setModalSenhaAcao('excluir');
    setSenhaInput('');
    setSenhaError(false);
    setShowSenhaModal(true);
  };

  const confirmarSenha = async () => {
    try {
      const res = await fetch('/api/candidatos/verificar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ senha: senhaInput }),
      });
      const data = await res.json();
      if (data.success) {
        setShowSenhaModal(false);
        if (modalSenhaAcao === 'ver') {
          setShowVerSindicantesModal(true);
        } else if (modalSenhaAcao === 'excluir') {
          excluirSindicantes(candidatoSindicantes);
        } else {
          const etapas = getEtapasObj(candidatoSindicantes);
          setSindicantesSelecionados(etapas['6']?.sindicantes || []);
          setShowSindicantesModal(true);
        }
      } else {
        setSenhaError(true);
      }
    } catch {
      setSenhaError(true);
    }
  };

  const excluirSindicantes = async (cand) => {
    const etapas = typeof cand.etapas === 'object' && cand.etapas !== null ? { ...cand.etapas } : {};
    const { sindicantes, sindicanteNomes, ...resto } = etapas['6'] || {};
    etapas['6'] = Object.keys(resto).length > 0 ? resto : undefined;
    if (etapas['6'] === undefined) delete etapas['6'];
    try {
      await fetch('/api/candidatos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cand.id, etapas })
      });
      toast.success('Sindicantes removidos');
      setShowVerSindicantesModal(false);
      scrollPosRef.current = window.scrollY;
      carregarDados();
    } catch { toast.error('Erro ao remover sindicantes'); }
  };

  const salvarSindicantes = async () => {
    if (sindicantesSelecionados.length !== 3) {
      toast.error('Selecione exatamente 3 sindicantes');
      return;
    }
    const cand = candidatoSindicantes;
    const etapas = typeof cand.etapas === 'object' && cand.etapas !== null ? { ...cand.etapas } : {};
    const sindicanteNomes = membros
      .filter(m => sindicantesSelecionados.includes(m.id))
      .map(m => m.nome);
    etapas['6'] = { ...etapas['6'], sindicantes: sindicantesSelecionados, sindicanteNomes };
    try {
      await fetch('/api/candidatos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cand.id, etapas })
      });
      toast.success('Sindicantes definidos!');
      setShowSindicantesModal(false);
      setCandidatoSindicantes(null);
      scrollPosRef.current = window.scrollY;
      carregarDados();
    } catch { toast.error('Erro ao salvar sindicantes'); }
  };

  const stats = {
    emAndamento: candidatos.filter(c => c.status === 'EM_ANDAMENTO').length,
    aprovados:   candidatos.filter(c => c.status === 'APROVADO').length,
    reprovados:  candidatos.filter(c => c.status === 'REPROVADO').length,
    desistiram:  candidatos.filter(c => c.status === 'DESISTIU').length,
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-900 text-white p-3 md:p-4 shadow-lg">
        <div className="w-full flex justify-between items-center gap-2">
          <div className="flex items-center gap-1 md:gap-3 min-w-0">
            <button onClick={() => router.push('/pop')} className="hover:bg-blue-800 p-2 rounded-lg transition min-w-[40px] min-h-[40px] flex items-center justify-center flex-shrink-0" title="Voltar ao POP">
              <ArrowLeft size={20} />
            </button>
            <button onClick={() => router.push('/dashboard')} className="hover:bg-blue-800 p-2 rounded-lg transition min-w-[40px] min-h-[40px] flex items-center justify-center flex-shrink-0" title="Início">
              <Home size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-2xl font-bold leading-tight">Candidatos</h1>
              <p className="text-xs text-blue-200 hidden sm:block">Iniciação / Prazos / POP</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setShowTutorial(true)}
              className="hover:bg-blue-800 border border-blue-600 p-2 rounded-lg transition min-w-[40px] min-h-[40px] flex items-center justify-center"
              title="Como usar"
            >
              <Info size={18} />
            </button>
            <button
              onClick={() => { setEtapasConfigTemp(etapasConfig); setShowConfig(true); }}
              className="hover:bg-blue-800 border border-blue-600 p-2 rounded-lg transition min-w-[40px] min-h-[40px] flex items-center justify-center"
              title="Configurações"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={abrirNovo}
              className="flex items-center gap-1 border border-blue-300 hover:bg-blue-800 px-3 py-2 rounded-lg font-semibold text-sm transition min-h-[40px]"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Novo Candidato</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </div>
      </header>

      <div className="p-3 md:p-4 max-w-3xl mx-auto">

        {/* Tutorial inline (colapsável) */}
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowTutorial(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2 text-blue-800 font-semibold text-sm">
              <Info size={16} />
              Como usar esta página
            </div>
            {showTutorial ? <ChevronDown size={16} className="text-blue-600" /> : <ChevronRight size={16} className="text-blue-600" />}
          </button>
          {showTutorial && (
            <div className="px-4 pb-4 text-sm text-blue-900 space-y-3 border-t border-blue-200">
              <div className="pt-3 space-y-2">
                <p className="font-bold text-blue-800">Gerenciando candidatos:</p>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">+</span>
                  <span>Toque em <strong>Novo</strong> para cadastrar um candidato com nome, contato e mestres proponentes.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">▼</span>
                  <span>Toque no <strong>nome do candidato</strong> para expandir e ver o pipeline completo das 11 etapas.</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-blue-800">Marcando etapas:</p>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-7 h-7 border-2 border-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">1</span>
                  <span>Etapa <strong>pendente</strong> — toque no círculo ou no botão <strong>"Concluir"</strong> para marcar como feita.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                    <Check size={13} className="text-white" />
                  </span>
                  <span>Etapa <strong>concluída</strong> (verde) — toque novamente para desmarcar se necessário.</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 flex gap-0.5 mt-1">
                    <div className="w-4 h-2 bg-green-500 rounded-sm" />
                    <div className="w-4 h-2 bg-blue-400 rounded-sm" />
                    <div className="w-4 h-2 bg-gray-200 rounded-sm" />
                  </div>
                  <span>A <strong>barra colorida</strong> no card mostra o progresso: verde = concluída, azul = atual, cinza = pendente.</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-blue-800">Status do candidato:</p>
                <p>Use os botões de status para marcar o candidato como <strong>Em Andamento</strong>, <strong>Iniciado</strong>, <strong>Reprovado</strong> ou <strong>Desistiu</strong>. Quando todas as 11 etapas forem concluídas, o status muda automaticamente para <strong>Iniciado</strong>.</p>
              </div>
            </div>
          )}
        </div>

        {/* Modelo Word para Sindicância */}
        <div className="mb-4 bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-700">Modelo Word — Sindicância</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {modeloSindicanciaUrl
                ? 'Modelo configurado. Faça upload para substituir.'
                : 'Nenhum modelo configurado. Faça upload do arquivo .docx.'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Use <code className="bg-gray-100 px-1 rounded">{'{nome}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{nascido_em}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{nome_esposa}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{endereco_residencial}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{telefone_celular}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{telefone_fixo}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{endereco_profissional}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{grau_instrucao}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{nome_sindicante}'}</code> no documento.
            </p>
          </div>
          <label className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition min-h-[40px] ${uploadandoModelo ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
            {uploadandoModelo ? 'Enviando...' : modeloSindicanciaUrl ? 'Substituir Modelo' : 'Upload Modelo (.docx)'}
            <input
              type="file"
              accept=".docx"
              className="hidden"
              disabled={uploadandoModelo}
              onChange={e => { if (e.target.files[0]) uploadModelo(e.target.files[0]); e.target.value = ''; }}
            />
          </label>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-lg shadow p-3 border-l-4 border-blue-500">
            <div className="text-2xl font-bold text-blue-700">{stats.emAndamento}</div>
            <div className="text-xs text-gray-500 mt-0.5">Em Andamento</div>
          </div>
          <div className="bg-white rounded-lg shadow p-3 border-l-4 border-green-500">
            <div className="text-2xl font-bold text-green-700">{stats.aprovados}</div>
            <div className="text-xs text-gray-500 mt-0.5">Iniciados</div>
          </div>
          <div className="bg-white rounded-lg shadow p-3 border-l-4 border-red-400">
            <div className="text-2xl font-bold text-red-600">{stats.reprovados}</div>
            <div className="text-xs text-gray-500 mt-0.5">Reprovados</div>
          </div>
          <div className="bg-white rounded-lg shadow p-3 border-l-4 border-gray-400">
            <div className="text-2xl font-bold text-gray-600">{stats.desistiram}</div>
            <div className="text-xs text-gray-500 mt-0.5">Desistiram</div>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="text-center py-12 text-gray-500 font-semibold">Carregando...</div>
        ) : candidatos.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow">
            <User size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-lg font-semibold">Nenhum candidato cadastrado</p>
            <button onClick={abrirNovo} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              Cadastrar primeiro candidato
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {candidatos.map(cand => {
              const etapasObj = getEtapasObj(cand);
              const concluidas = Object.values(etapasObj).filter(e => e?.concluida).length;
              const aberto = candidatoAberto === cand.id;
              const statusInfo = STATUS_INFO[cand.status] || STATUS_INFO.EM_ANDAMENTO;

              return (
                <div key={cand.id} className="bg-white rounded-lg shadow overflow-hidden">
                  {/* Card resumo */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer active:bg-gray-50 hover:bg-gray-50 transition select-none"
                    onClick={() => setCandidatoAberto(aberto ? null : cand.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 text-base leading-tight">{cand.nome}</h3>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        Etapa {cand.etapaAtual} de 11
                        {cand.proponenteNomes && <span className="ml-2 text-gray-400">· {cand.proponenteNomes}</span>}
                      </div>
                      {/* Barra progresso */}
                      <div className="flex gap-0.5">
                        {Array.from({ length: 11 }, (_, i) => {
                          const num = i + 1;
                          const concluida = etapasObj[String(num)]?.concluida;
                          const atual = num === cand.etapaAtual && !concluida;
                          return (
                            <div key={num} className={`h-2 flex-1 rounded-sm ${concluida ? 'bg-green-500' : atual ? 'bg-blue-400' : 'bg-gray-200'}`} />
                          );
                        })}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{concluidas}/11 etapas concluídas</div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); abrirEditar(cand); }}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); excluir(cand.id); }}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 size={18} />
                      </button>
                      <div className="min-w-[32px] flex justify-center">
                        {aberto ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
                      </div>
                    </div>
                  </div>

                  {/* Detalhe expandido */}
                  {aberto && (
                    <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">

                      {/* Dados */}
                      {(cand.email || cand.telefone || cand.dataNascimento || cand.cim) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          {cand.email && <div><span className="text-gray-500">Email: </span><span className="font-medium text-gray-800 break-all">{cand.email}</span></div>}
                          {cand.telefone && <div><span className="text-gray-500">Telefone: </span><span className="font-medium text-gray-800">{cand.telefone}</span></div>}
                          {cand.dataNascimento && <div><span className="text-gray-500">Nascimento: </span><span className="font-medium text-gray-800">{cand.dataNascimento.split('-').reverse().join('/')}</span></div>}
                          {cand.cim && <div><span className="text-gray-500">CIM: </span><span className="font-medium text-blue-700">{cand.cim}</span></div>}
                        </div>
                      )}

                      {cand.observacoes && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-gray-700">
                          <span className="font-semibold text-yellow-700">Observações: </span>{cand.observacoes}
                        </div>
                      )}

                      {/* Botões de status */}
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Alterar Status</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(STATUS_INFO).map(([key, info]) => (
                            <button
                              key={key}
                              onClick={() => alterarStatus(cand, key)}
                              className={`text-xs px-3 py-2 rounded-full border font-semibold transition min-h-[36px] ${cand.status === key ? info.color : 'bg-white text-gray-500 border-gray-300 active:bg-gray-100 hover:bg-gray-100'}`}
                            >
                              {info.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Pipeline */}
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Etapas do Processo</p>
                        <div className="space-y-2">
                          {etapasConfig.map(etapa => {
                            const etapaData = etapasObj[String(etapa.numero)];
                            const concluida = etapaData?.concluida === true;
                            const isAtual = etapa.numero === cand.etapaAtual && !concluida;

                            return (
                              <div
                                key={etapa.numero}
                                className={`rounded-lg border p-3 ${concluida ? 'bg-green-50 border-green-200' : isAtual ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'}`}
                              >
                                <div className="flex items-start gap-3">
                                  {/* Círculo / check — toque-friendly */}
                                  <button
                                    onClick={() => concluirEtapa(cand, etapa.numero)}
                                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition active:scale-95 ${
                                      concluida
                                        ? 'bg-green-500 border-green-500 text-white'
                                        : isAtual
                                        ? 'border-blue-500 text-blue-600 bg-white active:bg-blue-50'
                                        : 'border-gray-300 text-gray-400 bg-white active:bg-gray-50'
                                    }`}
                                    title={concluida ? 'Desmarcar etapa' : 'Marcar como concluída'}
                                  >
                                    {concluida
                                      ? <Check size={18} />
                                      : <span className="text-sm font-bold">{etapa.numero}</span>
                                    }
                                  </button>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                      <span className={`font-semibold text-sm ${concluida ? 'text-green-700 line-through' : isAtual ? 'text-blue-800' : 'text-gray-700'}`}>
                                        {etapa.titulo}
                                      </span>
                                      {isAtual && (
                                        <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold">
                                          Etapa Atual
                                        </span>
                                      )}
                                      {concluida && etapaData?.data && etapa.numero !== 5 && (
                                        <span className="text-xs text-green-600 font-medium">{etapaData.data.split('-').reverse().join('/')}</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500 mb-1">
                                      <span className="font-semibold">Responsável:</span> {etapa.responsavel}
                                    </p>
                                    <p className="text-xs text-gray-600 whitespace-pre-line">{etapa.descricao}</p>

                                    {/* Escolha de sindicantes (etapa 6) */}
                                    {etapa.numero === 6 && (() => {
                                      const sindicanteNomes = etapasObj['6']?.sindicanteNomes || [];
                                      return (
                                        <div className="mt-2 space-y-2">
                                          {sindicanteNomes.length > 0 && (
                                            <p className="text-xs text-gray-400 italic">Sindicantes definidos — senha necessária para visualizar.</p>
                                          )}
                                          <div className="flex flex-wrap gap-2">
                                            {sindicanteNomes.length > 0 && (
                                              <button
                                                onClick={e => abrirVerSindicantes(e, cand)}
                                                className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-purple-400 text-purple-700 bg-white hover:bg-purple-50 active:bg-purple-100 min-h-[36px] transition"
                                              >
                                                Ver Sindicantes
                                              </button>
                                            )}
                                            <button
                                              onClick={e => abrirEscolhaSindicantes(e, cand)}
                                              className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-purple-600 text-white active:bg-purple-700 hover:bg-purple-700 min-h-[36px] transition"
                                            >
                                              {sindicanteNomes.length > 0 ? 'Alterar Sindicantes' : 'Escolher Sindicantes'}
                                            </button>
                                            {sindicanteNomes.length > 0 && (
                                              <button
                                                onClick={e => abrirExcluirSindicantes(e, cand)}
                                                className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-red-300 text-red-600 bg-white hover:bg-red-50 active:bg-red-100 min-h-[36px] transition"
                                              >
                                                Remover Sindicantes
                                              </button>
                                            )}
                                            {sindicanteNomes.length > 0 && modeloSindicanciaUrl && (
                                              <button
                                                onClick={e => { e.stopPropagation(); enviarSindicancia(cand.id); }}
                                                disabled={enviandoSindicancia === cand.id}
                                                className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 active:bg-green-800 min-h-[36px] transition disabled:opacity-50"
                                              >
                                                {enviandoSindicancia === cand.id ? 'Enviando...' : '📧 Enviar Sindicância'}
                                              </button>
                                            )}
                                            {sindicanteNomes.length > 0 && !modeloSindicanciaUrl && (
                                              <p className="text-xs text-orange-600 italic self-center">⚠️ Faça upload do modelo .docx para enviar</p>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })()}

                                    {/* Data mínima para escrutínio (etapa 7) */}
                                    {etapa.numero === 7 && (() => {
                                      const dataBoletim = etapasObj['5']?.data;
                                      if (!dataBoletim) return (
                                        <p className="mt-2 text-xs text-orange-600 font-semibold">
                                          ⚠️ Preencha a data do Boletim (etapa 4) para calcular o prazo.
                                        </p>
                                      );
                                      const d = new Date(dataBoletim);
                                      d.setDate(d.getDate() + 15);
                                      const prazo = d.toISOString().split('T')[0].split('-').reverse().join('/');
                                      return (
                                        <p className="mt-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                                          📅 Realizar sindicância a partir de: {prazo}
                                        </p>
                                      );
                                    })()}

                                    {/* Campo de data para etapa 4 - Boletim */}
                                    {etapa.numero === 5 && (
                                      <div className="mt-2">
                                        <label className="block text-xs font-bold text-gray-600 mb-1">
                                          Data de publicação no Boletim
                                        </label>
                                        <input
                                          type="date"
                                          value={concluida ? (etapaData?.data || '') : (datasBoletim[cand.id] || '')}
                                          onChange={e => setDatasBoletim(prev => ({ ...prev, [cand.id]: e.target.value }))}
                                          disabled={concluida}
                                          className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500 w-full sm:w-auto"
                                        />
                                        {concluida && etapaData?.data && (
                                          <p className="text-xs text-green-600 mt-1">
                                            Publicado em: {etapaData.data.split('-').reverse().join('/')}
                                          </p>
                                        )}
                                      </div>
                                    )}

                                    {/* Botão explícito para mobile */}
                                    <button
                                      onClick={() => concluirEtapa(cand, etapa.numero)}
                                      className={`mt-2 text-xs px-3 py-1.5 rounded-lg font-semibold transition min-h-[36px] ${
                                        concluida
                                          ? 'bg-green-100 text-green-700 border border-green-300 active:bg-green-200'
                                          : 'bg-blue-600 text-white active:bg-blue-700'
                                      }`}
                                    >
                                      {concluida ? '✓ Concluída — toque para desfazer' : 'Marcar como concluída'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Tutorial */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowTutorial(false)}>
          <div className="bg-white rounded-xl p-5 max-w-md w-full max-h-[85vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Info size={20} className="text-blue-600" /> Como usar</h2>
              <button onClick={() => setShowTutorial(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="space-y-4 text-sm text-gray-700">
              <section>
                <p className="font-bold text-gray-800 mb-2">1. Cadastrar um candidato</p>
                <p>Toque em <strong>Novo</strong> no canto superior direito. Preencha o nome (obrigatório), contato e selecione os <strong>Mestres Proponentes</strong> na lista.</p>
              </section>
              <section>
                <p className="font-bold text-gray-800 mb-2">2. Ver o processo de um candidato</p>
                <p>Toque no <strong>nome do candidato</strong> na lista para expandir e ver as 11 etapas do POP de Iniciação.</p>
              </section>
              <section>
                <p className="font-bold text-gray-800 mb-2">3. Marcar etapas concluídas</p>
                <p>Dentro do candidato expandido, cada etapa tem um botão <strong>"Marcar como concluída"</strong>. Você também pode tocar no círculo numerado. A etapa fica verde e a data é registrada automaticamente.</p>
                <div className="mt-2 flex gap-2 items-center">
                  <div className="w-8 h-8 border-2 border-gray-300 rounded-full flex items-center justify-center text-gray-400 font-bold text-sm">3</div>
                  <span className="text-xs text-gray-500">→ pendente</span>
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center"><Check size={14} className="text-white" /></div>
                  <span className="text-xs text-gray-500">→ concluída</span>
                </div>
              </section>
              <section>
                <p className="font-bold text-gray-800 mb-2">4. Barra de progresso</p>
                <div className="flex gap-0.5 mb-1">
                  <div className="h-3 flex-1 bg-green-500 rounded-sm" />
                  <div className="h-3 flex-1 bg-green-500 rounded-sm" />
                  <div className="h-3 flex-1 bg-blue-400 rounded-sm" />
                  <div className="h-3 flex-1 bg-gray-200 rounded-sm" />
                  <div className="h-3 flex-1 bg-gray-200 rounded-sm" />
                </div>
                <p className="text-xs text-gray-500"><span className="text-green-600 font-semibold">Verde</span> = concluída · <span className="text-blue-600 font-semibold">Azul</span> = etapa atual · <span className="text-gray-400 font-semibold">Cinza</span> = pendente</p>
              </section>
              <section>
                <p className="font-bold text-gray-800 mb-2">5. Status do candidato</p>
                <p>Use os botões de status para registrar <strong>Em Andamento</strong>, <strong>Iniciado</strong>, <strong>Reprovado</strong> ou <strong>Desistiu</strong>. Ao concluir todas as 11 etapas, o status muda automaticamente para <strong>Iniciado</strong>.</p>
              </section>
            </div>
            <button onClick={() => setShowTutorial(false)} className="mt-5 w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition">
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal Novo/Editar */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Editar Candidato' : 'Novo Candidato'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>

            <div className="space-y-4">

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo *</label>
                <input type="text" value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none text-base"
                  placeholder="Nome completo do candidato" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Data de Nascimento</label>
                <input type="date" value={formData.dataNascimento}
                  onChange={e => setFormData({ ...formData, dataNascimento: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none text-base" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nome da Esposa / Cônjuge</label>
                <input type="text" value={formData.nomeConjuge}
                  onChange={e => setFormData({ ...formData, nomeConjuge: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none text-base"
                  placeholder="Nome completo" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Endereço Residencial</label>
                <textarea value={formData.enderecoResidencial}
                  onChange={e => setFormData({ ...formData, enderecoResidencial: e.target.value })}
                  rows={2} className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none resize-none text-base"
                  placeholder="Rua, número, bairro, cidade — CEP" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Telefone Celular</label>
                  <input type="tel" value={formData.telefone}
                    onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none text-base"
                    placeholder="(88) 99999-9999" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Telefone Fixo</label>
                  <input type="tel" value={formData.telefoneFixo}
                    onChange={e => setFormData({ ...formData, telefoneFixo: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none text-base"
                    placeholder="(88) 3333-4444" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Endereço Profissional</label>
                <textarea value={formData.enderecoProfissional}
                  onChange={e => setFormData({ ...formData, enderecoProfissional: e.target.value })}
                  rows={2} className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none resize-none text-base"
                  placeholder="Local de trabalho, endereço..." />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Grau de Instrução</label>
                <select value={formData.grauInstrucao}
                  onChange={e => setFormData({ ...formData, grauInstrucao: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none text-base bg-white">
                  <option value="">Selecione...</option>
                  <option>Ensino Fundamental</option>
                  <option>Ensino Médio</option>
                  <option>Ensino Superior (Graduação)</option>
                  <option>Pós-graduação / Especialização</option>
                  <option>Mestrado</option>
                  <option>Doutorado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Mestres Proponentes</label>
                {membros.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Nenhum Mestre ativo encontrado</p>
                ) : (
                  <div className="border-2 border-gray-300 rounded-lg max-h-44 overflow-y-auto divide-y divide-gray-100">
                    {membros.map(m => {
                      const sel = formData.proponenteIds.includes(m.id);
                      return (
                        <label key={m.id} className={`flex items-center gap-3 px-3 py-3 cursor-pointer ${sel ? 'bg-blue-50' : 'active:bg-gray-50 hover:bg-gray-50'}`}>
                          <input type="checkbox" checked={sel}
                            onChange={() => {
                              const ids = sel ? formData.proponenteIds.filter(id => id !== m.id) : [...formData.proponenteIds, m.id];
                              setFormData({ ...formData, proponenteIds: ids });
                            }}
                            className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          <span className={`text-sm ${sel ? 'font-semibold text-blue-900' : 'text-gray-800'}`}>{m.nome}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold active:bg-gray-100 hover:bg-gray-100 transition">
                Cancelar
              </button>
              <button onClick={salvar} className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold active:bg-blue-700 hover:bg-blue-700 transition">
                {editingId ? 'Salvar' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Senha — Sindicantes */}
      {showSenhaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setShowSenhaModal(false)}>
          <div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">Área Restrita</h2>
              <button onClick={() => setShowSenhaModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Digite a senha para escolher os sindicantes.</p>
            <input
              type="password"
              value={senhaInput}
              onChange={e => { setSenhaInput(e.target.value); setSenhaError(false); }}
              onKeyDown={e => e.key === 'Enter' && confirmarSenha()}
              placeholder="Senha"
              autoFocus
              className={`w-full border-2 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none text-base ${senhaError ? 'border-red-400' : 'border-gray-300 focus:border-blue-500'}`}
            />
            {senhaError && <p className="text-xs text-red-600 mt-1">Senha incorreta.</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowSenhaModal(false)} className="flex-1 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition">Cancelar</button>
              <button onClick={confirmarSenha} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Sindicantes */}
      {showVerSindicantesModal && candidatoSindicantes && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setShowVerSindicantesModal(false)}>
          <div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">Sindicantes</h2>
              <button onClick={() => setShowVerSindicantesModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Candidato: <strong className="text-gray-800">{candidatoSindicantes.nome}</strong></p>
            <ol className="space-y-2">
              {(getEtapasObj(candidatoSindicantes)['6']?.sindicanteNomes || []).map((nome, i) => (
                <li key={i} className="flex items-center gap-3 p-2 bg-purple-50 border border-purple-100 rounded-lg">
                  <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                  <span className="text-sm font-semibold text-purple-900">{nome}</span>
                </li>
              ))}
            </ol>
            <button onClick={() => setShowVerSindicantesModal(false)} className="mt-5 w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition">
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modal Escolher Sindicantes */}
      {showSindicantesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setShowSindicantesModal(false)}>
          <div className="bg-white rounded-xl p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-bold text-gray-900">Escolher Sindicantes</h2>
              <button onClick={() => setShowSindicantesModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <p className="text-sm text-gray-500 mb-1">
              Candidato: <strong className="text-gray-800">{candidatoSindicantes?.nome}</strong>
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Selecione exatamente <strong>3 Mestres</strong> para realizar a sindicância.{' '}
              <span className={`font-bold ${sindicantesSelecionados.length === 3 ? 'text-green-600' : 'text-blue-600'}`}>
                ({sindicantesSelecionados.length}/3)
              </span>
            </p>

            {membros.length === 0 ? (
              <p className="text-sm text-gray-500 italic py-4 text-center">Nenhum Mestre ativo encontrado.</p>
            ) : (
              <div className="border-2 border-gray-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100">
                {membros.map(m => {
                  const sel = sindicantesSelecionados.includes(m.id);
                  const bloqueado = !sel && sindicantesSelecionados.length >= 3;
                  return (
                    <label
                      key={m.id}
                      className={`flex items-center gap-3 px-4 py-3 ${bloqueado ? 'opacity-40 cursor-not-allowed' : sel ? 'bg-purple-50 cursor-pointer' : 'hover:bg-gray-50 cursor-pointer'}`}
                    >
                      <input
                        type="checkbox"
                        checked={sel}
                        disabled={bloqueado}
                        onChange={() => {
                          if (sel) setSindicantesSelecionados(prev => prev.filter(id => id !== m.id));
                          else if (sindicantesSelecionados.length < 3) setSindicantesSelecionados(prev => [...prev, m.id]);
                        }}
                        className="w-5 h-5 text-purple-600 flex-shrink-0"
                      />
                      <div>
                        <p className={`text-sm ${sel ? 'font-semibold text-purple-900' : 'text-gray-800'}`}>{m.nome}</p>
                        <p className="text-xs text-gray-400">{m.grau}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowSindicantesModal(false)} className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition">Cancelar</button>
              <button
                onClick={salvarSindicantes}
                disabled={sindicantesSelecionados.length !== 3}
                className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Salvar Sindicantes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Configurações */}
      {showConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowConfig(false)}>
          <div className="bg-white rounded-xl p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Settings size={20} className="text-blue-600" /> Configurar Etapas</h2>
              <button onClick={() => setShowConfig(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <p className="text-xs text-gray-500 mb-4">As alterações valem para todos os candidatos a partir de agora.</p>

            <div className="space-y-4">
              {etapasConfigTemp.map((etapa, idx) => (
                <div key={etapa.numero} className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-bold text-blue-700">Etapa {etapa.numero}</p>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Título</label>
                    <input
                      type="text"
                      value={etapa.titulo}
                      onChange={e => setEtapasConfigTemp(prev => prev.map((et, i) => i === idx ? { ...et, titulo: e.target.value } : et))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Responsável</label>
                    <input
                      type="text"
                      value={etapa.responsavel}
                      onChange={e => setEtapasConfigTemp(prev => prev.map((et, i) => i === idx ? { ...et, responsavel: e.target.value } : et))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição</label>
                    <textarea
                      value={etapa.descricao}
                      onChange={e => setEtapasConfigTemp(prev => prev.map((et, i) => i === idx ? { ...et, descricao: e.target.value } : et))}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none resize-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setEtapasConfigTemp(ETAPAS); }}
                className="py-3 px-4 border border-gray-300 text-gray-500 text-sm rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Restaurar padrão
              </button>
              <button
                onClick={() => setShowConfig(false)}
                className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/configuracao-etapas', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ etapas: etapasConfigTemp }),
                    });
                    if (!res.ok) throw new Error();
                    setEtapasConfig(etapasConfigTemp);
                    setShowConfig(false);
                    toast.success('Configurações salvas!');
                  } catch { toast.error('Erro ao salvar configurações'); }
                }}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
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
