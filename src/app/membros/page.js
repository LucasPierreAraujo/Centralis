// SEU ARQUIVO: MembrosPage.js

"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Edit, ArrowLeft, Save, X, Upload, Search, Users, UserPlus } from 'lucide-react';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

export default function MembrosPage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [membros, setMembros] = useState([]);
  const [dependentes, setDependentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showFormDependente, setShowFormDependente] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingDependenteId, setEditingDependenteId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('membros'); // membros, filiados, candidatos, dependentes, outros

  // Candidatos (tabela Candidato — mesma do POP)
  const [candidatosPop, setCandidatosPop] = useState([]);
  const [showFormCandidato, setShowFormCandidato] = useState(false);
  const [editingCandidatoId, setEditingCandidatoId] = useState(null);
  const [mestresProponentes, setMestresProponentes] = useState([]);
  const [formDataCandidato, setFormDataCandidato] = useState({
    nome: '', dataNascimento: '', nomeConjuge: '',
    enderecoResidencial: '', telefone: '', telefoneFixo: '',
    enderecoProfissional: '', grauInstrucao: '',
    email: '', proponenteIds: [], observacoes: ''
  });

  // Estado do formulário de dependente
  const [dependenteForm, setDependenteForm] = useState({
    membroId: '',
    conjuge: { tipo: '', nome: '', dataNascimento: '', dataCasamento: '' },
    filhos: []
  });

  const [formData, setFormData] = useState({
    nome: '',
    grau: '',
    status: 'ATIVO',
    cim: '',
    cargo: '', // Será string com cargos separados por " / "
    assinaturaUrl: '',
    email: '',
    dataNascimento: '',
    dataIniciacao: '',
    dataFiliacao: '',
    dataPassagemGrau: '',
    dataElevacao: '',
    dataInstalacao: '',
    dataRegularizacao: '',
    dataKitPlacet: ''
  });

  // Estado para controlar checkboxes de cargos
  const [cargosSelecionados, setCargosSelecionados] = useState([]);

  const graus = ['CANDIDATO', 'APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO', 'FILIADO', 'DEPENDENTE', 'OUTROS'];
  const statusOptions = ['ATIVO', 'INATIVO'];
  const cargosDisponiveis = [
    'VENERÁVEL MESTRE',
    '1º VIGILANTE',
    '2º VIGILANTE',
    'ORADOR',
    'SECRETÁRIO',
    'TESOUREIRO',
    '1º DIÁCONO',
    '2º DIÁCONO',
    'MESTRE DE HARMONIA',
    'PREPARADOR',
    'GUARDA DO TEMPLO',
    'MEMBRO DO MINISTÉRIO PÚBLICO',
  ];

  // ================== CARREGAR MEMBROS ==================
  const carregarMembros = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/membros');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setMembros(data);
      } else if (data.membros && Array.isArray(data.membros)) {
        setMembros(data.membros);
      } else {
        console.error('Resposta inesperada. Tipo:', typeof data, 'Dados:', data);
        setMembros([]);
      }
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
      setMembros([]);
    } finally {
      setLoading(false);
    }
  };

  // ================== CARREGAR DEPENDENTES ==================
  const carregarDependentes = async () => {
    try {
      const response = await fetch('/api/dependentes');
      if (response.ok) {
        const data = await response.json();
        setDependentes(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Erro ao carregar dependentes:', error);
      setDependentes([]);
    }
  };

  const carregarCandidatosPop = async () => {
    try {
      const res = await fetch('/api/candidatos');
      const data = await res.json();
      setCandidatosPop(Array.isArray(data) ? data : []);
    } catch { setCandidatosPop([]); }
  };

  useEffect(() => {
    carregarMembros();
    carregarDependentes();
    carregarCandidatosPop();
  }, []);

  // Atualiza mestres proponentes quando membros carrega
  useEffect(() => {
    setMestresProponentes(membros.filter(m =>
      ['MESTRE', 'MESTRE INSTALADO'].includes(m.grau?.toUpperCase()) && m.status === 'ATIVO'
    ));
  }, [membros]);

  const abrirNovoCandidato = () => {
    setEditingCandidatoId(null);
    setFormDataCandidato({
      nome: '', dataNascimento: '', nomeConjuge: '',
      enderecoResidencial: '', telefone: '', telefoneFixo: '',
      enderecoProfissional: '', grauInstrucao: '',
      email: '', proponenteIds: [], observacoes: ''
    });
    setShowFormCandidato(true);
  };

  const abrirEditarCandidato = (cand) => {
    setEditingCandidatoId(cand.id);
    let ids = [];
    try { ids = JSON.parse(cand.proponenteIds || '[]'); } catch {}
    setFormDataCandidato({
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
    setShowFormCandidato(true);
  };

  const salvarCandidato = async () => {
    if (!formDataCandidato.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    try {
      const method = editingCandidatoId ? 'PUT' : 'POST';
      const proponenteNomes = mestresProponentes
        .filter(m => formDataCandidato.proponenteIds.includes(m.id))
        .map(m => m.nome).join(', ');
      const res = await fetch('/api/candidatos', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formDataCandidato, ...(editingCandidatoId && { id: editingCandidatoId }), proponenteNomes })
      });
      if (!res.ok) throw new Error();
      toast.success(editingCandidatoId ? 'Candidato atualizado!' : 'Candidato cadastrado!');
      setShowFormCandidato(false);
      carregarCandidatosPop();
    } catch { toast.error('Erro ao salvar candidato'); }
  };

  const excluirCandidatoPop = async (id, nome) => {
    const ok = await confirm.confirm({
      title: 'Excluir Candidato',
      message: `Deseja realmente excluir "${nome}"?`,
      confirmText: 'Excluir', cancelText: 'Cancelar', type: 'danger'
    });
    if (!ok) return;
    try {
      await fetch('/api/candidatos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      toast.success('Candidato excluído');
      carregarCandidatosPop();
    } catch { toast.error('Erro ao excluir'); }
  };

  // ================== VALIDAÇÃO ==================
  const validarCampos = () => {
    const { grau, cim, dataIniciacao, dataFiliacao, dataPassagemGrau, dataElevacao, dataInstalacao } = formData;

    if (grau === 'MESTRE INSTALADO') {
      if (!cim) { toast.error('CIM é obrigatório para Mestre Instalado'); return false; }
      if (!dataIniciacao && !dataFiliacao) { toast.error('Data de Iniciação ou Filiação é obrigatória para Mestre Instalado'); return false; }
      if (!dataPassagemGrau) { toast.error('Data de Promoção é obrigatória para Mestre Instalado'); return false; }
      if (!dataElevacao) { toast.error('Data de Elevação é obrigatória para Mestre Instalado'); return false; }
      if (!dataInstalacao) { toast.error('Data de Instalação é obrigatória para Mestre Instalado'); return false; }
    } else if (grau === 'FILIADO') {
      if (!cim) { toast.error('CIM é obrigatório para Filiado'); return false; }
      if (!dataIniciacao && !dataFiliacao) { toast.error('Data de Iniciação ou Filiação é obrigatória para Filiado'); return false; }
      if (!dataPassagemGrau) { toast.error('Data de Promoção é obrigatória para Filiado'); return false; }
      if (!dataElevacao) { toast.error('Data de Elevação é obrigatória para Filiado'); return false; }
    } else if (grau === 'MESTRE') {
      if (!cim) { toast.error('CIM é obrigatório para Mestre'); return false; }
      if (!dataIniciacao && !dataFiliacao) { toast.error('Data de Iniciação ou Filiação é obrigatória para Mestre'); return false; }
      if (!dataPassagemGrau) { toast.error('Data de Promoção é obrigatória para Mestre'); return false; }
      if (!dataElevacao) { toast.error('Data de Elevação é obrigatória para Mestre'); return false; }
    } else if (grau === 'COMPANHEIRO') {
      if (!cim) { toast.error('CIM é obrigatório para Companheiro'); return false; }
      if (!dataIniciacao) { toast.error('Data de Iniciação é obrigatória para Companheiro'); return false; }
      if (!dataPassagemGrau) { toast.error('Data de Promoção é obrigatória para Companheiro'); return false; }
    } else if (grau === 'APRENDIZ') {
      if (!cim) { toast.error('CIM é obrigatório para Aprendiz'); return false; }
      if (!dataIniciacao) { toast.error('Data de Iniciação é obrigatória para Aprendiz'); return false; }
    }

    return true;
  };

  // ================== UPLOAD DE ASSINATURA ==================
  const handleAssinaturaUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Validar tamanho (max 2MB para evitar problemas com limite do servidor)
  if (file.size > 2 * 1024 * 1024) {
    toast.error('Imagem muito grande! Máximo 2MB');
    return;
  }

  // Validar tipo
  if (!file.type.startsWith('image/')) {
    toast.error('Apenas imagens são permitidas!');
    return;
  }

  // Mostrar loading
  const loadingElement = document.createElement('div');
  loadingElement.className = 'text-center text-sm text-gray-600 mt-2';
  loadingElement.textContent = 'Fazendo upload...';
  e.target.parentElement.appendChild(loadingElement);

  try {
    // Converter para base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        // Enviar para API de upload
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: reader.result })
        });

        // Verificar se houve erro HTTP
        if (!response.ok) {
          if (response.status === 413) {
            toast.error('Imagem muito grande! Reduza o tamanho e tente novamente.');
            loadingElement.remove();
            return;
          }
          const errorData = await response.json().catch(() => ({}));
          console.error('Erro HTTP:', response.status, errorData);
          toast.error(errorData.error || `Erro no servidor (${response.status})`);
          loadingElement.remove();
          return;
        }

        const data = await response.json();

        if (data.success) {
          setFormData({ ...formData, assinaturaUrl: data.url });
          toast.success('Upload realizado com sucesso!');
        } else {
          console.error('Erro no upload:', data.error);
          toast.error(data.error || 'Erro no upload. Tente novamente.');
        }
      } catch (error) {
        console.error('Erro:', error);
        toast.error('Erro ao fazer upload. Verifique sua conexão.');
      } finally {
        loadingElement.remove();
      }
    };
    reader.readAsDataURL(file);
  } catch (error) {
    console.error('Erro ao ler arquivo:', error);
    toast.error('Erro ao processar imagem');
    loadingElement.remove();
  }
};

  // ================== GERENCIAR CARGOS ==================
  const handleCargoToggle = (cargo) => {
    let novosCargos;
    if (cargosSelecionados.includes(cargo)) {
      novosCargos = cargosSelecionados.filter(c => c !== cargo);
    } else {
      novosCargos = [...cargosSelecionados, cargo];
    }

    // Ordenar para que "Membro do Ministério Público" sempre fique por último
    const cargosOrdenados = novosCargos.sort((a, b) => {
      if (a === 'MEMBRO DO MINISTÉRIO PÚBLICO') return 1;
      if (b === 'MEMBRO DO MINISTÉRIO PÚBLICO') return -1;
      return 0;
    });

    setCargosSelecionados(cargosOrdenados);
    // Atualizar formData.cargo como string separada por " / "
    setFormData({ ...formData, cargo: cargosOrdenados.join(' / ') });
  };

  // ================== SUBMIT ==================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarCampos()) return;

    try {
      const method = editingId ? 'PUT' : 'POST';
      const bodyData = editingId ? { ...formData, id: editingId } : formData;

      const response = await fetch('/api/membros', {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });
      
      const data = await response.json();

      if (!response.ok) {
        console.error('Erro na API:', data);
        toast.error(`Erro ao salvar membro: ${data.details || data.error || 'Erro desconhecido'}`);
        return;
      }

      toast.success(editingId ? 'Membro atualizado com sucesso!' : 'Membro salvo com sucesso!');

      // Resetar formulário após sucesso
      setFormData({
        nome: '',
        grau: '',
        status: 'ATIVO',
        cim: '',
        cargo: '',
        assinaturaUrl: '',
        email: '',
        dataNascimento: '',
        dataIniciacao: '',
        dataFiliacao: '',
        dataPassagemGrau: '',
        dataElevacao: '',
        dataInstalacao: '',
        dataRegularizacao: '',
        dataKitPlacet: ''
      });
      setCargosSelecionados([]);
      setShowForm(false);
      setEditingId(null);
      carregarMembros();
    } catch (error) {
      console.error('Erro ao salvar membro:', error);
      toast.error('Erro ao salvar membro');
    }
  };

  // ================== DELETE ==================
  const handleDelete = async (id) => {
    const membro = membros.find(m => m.id === id);
    const confirmed = await confirm.confirm({
      title: 'Excluir Membro',
      message: `Deseja realmente excluir o membro "${membro?.nome}"? Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      await fetch('/api/membros', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      toast.success('Membro excluído com sucesso!');
      carregarMembros();
    } catch (error) {
      console.error('Erro ao excluir membro:', error);
      toast.error('Erro ao excluir membro');
    }
  };

  // ================== EDIT ==================
  const handleEdit = (membro) => {
    // Determinar a aba correta para o membro
    if (['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'].includes(membro.grau)) {
      setAbaAtiva('membros');
    } else if (membro.grau === 'FILIADO') {
      setAbaAtiva('filiados');
    } else if (membro.grau === 'CANDIDATO') {
      setAbaAtiva('candidatos');
    } else if (membro.grau === 'DEPENDENTE') {
      setAbaAtiva('dependentes');
    } else {
      setAbaAtiva('outros');
    }

    setFormData({
      nome: membro.nome,
      grau: membro.grau,
      status: membro.status,
      cim: membro.cim || '',
      cargo: membro.cargo || '',
      assinaturaUrl: membro.assinaturaUrl || '',
      email: membro.email || '',
      dataNascimento: membro.dataNascimento || '',
      dataIniciacao: membro.dataIniciacao || '',
      dataFiliacao: membro.dataFiliacao || '',
      dataPassagemGrau: membro.dataPassagemGrau || '',
      dataElevacao: membro.dataElevacao || '',
      dataInstalacao: membro.dataInstalacao || '',
      dataRegularizacao: membro.dataRegularizacao || '',
      dataKitPlacet: membro.dataKitPlacet || ''
    });

    // Inicializar cargos selecionados a partir do cargo salvo
    // Apenas para Mestre e Mestre Instalado
    if (membro.cargo && ['MESTRE', 'MESTRE INSTALADO'].includes(membro.grau)) {
      const cargos = membro.cargo.split(' / ').map(c => c.trim());
      setCargosSelecionados(cargos);
    } else {
      setCargosSelecionados([]);
    }

    setEditingId(membro.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setFormData({
      nome: '',
      grau: '',
      status: 'ATIVO',
      cim: '',
      cargo: '',
      assinaturaUrl: '',
      email: '',
      dataNascimento: '',
      dataIniciacao: '',
      dataFiliacao: '',
      dataPassagemGrau: '',
      dataElevacao: '',
      dataInstalacao: '',
      dataRegularizacao: ''
    });
    setCargosSelecionados([]);
    setShowForm(false);
    setEditingId(null);
  };

  // ================== FUNÇÕES PARA DEPENDENTES ==================
  const handleCancelDependente = () => {
    setDependenteForm({
      membroId: '',
      conjuge: { tipo: '', nome: '', dataNascimento: '', dataCasamento: '' },
      filhos: []
    });
    setShowFormDependente(false);
    setEditingDependenteId(null);
  };

  const adicionarFilho = () => {
    setDependenteForm({
      ...dependenteForm,
      filhos: [...dependenteForm.filhos, { nome: '', dataNascimento: '' }]
    });
  };

  const removerFilho = (index) => {
    const novosFilhos = dependenteForm.filhos.filter((_, i) => i !== index);
    setDependenteForm({ ...dependenteForm, filhos: novosFilhos });
  };

  const atualizarFilho = (index, campo, valor) => {
    const novosFilhos = [...dependenteForm.filhos];
    novosFilhos[index] = { ...novosFilhos[index], [campo]: valor };
    setDependenteForm({ ...dependenteForm, filhos: novosFilhos });
  };

  const handleSubmitDependente = async (e) => {
    e.preventDefault();

    if (!dependenteForm.membroId) {
      toast.error('Selecione um membro');
      return;
    }

    // Verificar se tem pelo menos cônjuge ou filho
    const temConjuge = dependenteForm.conjuge.tipo && dependenteForm.conjuge.nome;
    const temFilhos = dependenteForm.filhos.some(f => f.nome);

    if (!temConjuge && !temFilhos) {
      toast.error('Adicione pelo menos um cônjuge ou filho');
      return;
    }

    try {
      // Salvar cônjuge se preenchido
      if (temConjuge) {
        const conjugeResponse = await fetch('/api/dependentes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            membroId: dependenteForm.membroId,
            tipoDependente: dependenteForm.conjuge.tipo,
            nome: dependenteForm.conjuge.nome,
            dataNascimento: dependenteForm.conjuge.dataNascimento || null,
            dataCasamento: dependenteForm.conjuge.dataCasamento || null
          })
        });

        if (!conjugeResponse.ok) {
          const error = await conjugeResponse.json();
          toast.error(error.error || 'Erro ao salvar cônjuge');
          return;
        }
      }

      // Salvar filhos
      for (const filho of dependenteForm.filhos) {
        if (filho.nome) {
          const filhoResponse = await fetch('/api/dependentes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              membroId: dependenteForm.membroId,
              tipoDependente: 'FILHO',
              nome: filho.nome,
              dataNascimento: filho.dataNascimento || null
            })
          });

          if (!filhoResponse.ok) {
            const error = await filhoResponse.json();
            toast.error(error.error || 'Erro ao salvar filho');
            return;
          }
        }
      }

      toast.success('Dependentes salvos com sucesso!');
      handleCancelDependente();
      carregarDependentes();
    } catch (error) {
      console.error('Erro ao salvar dependentes:', error);
      toast.error('Erro ao salvar dependentes');
    }
  };

  const handleDeleteDependente = async (id) => {
    const dependente = dependentes.find(d => d.id === id);
    const confirmed = await confirm.confirm({
      title: 'Excluir Dependente',
      message: `Deseja realmente excluir "${dependente?.nome}"? Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      await fetch('/api/dependentes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      toast.success('Dependente excluído com sucesso!');
      carregarDependentes();
    } catch (error) {
      console.error('Erro ao excluir dependente:', error);
      toast.error('Erro ao excluir dependente');
    }
  };

  const handleEditDependente = async (dependente) => {
    setEditingDependenteId(dependente.id);
    // Carregar dados existentes para edição individual
    setDependenteForm({
      membroId: dependente.membroId,
      conjuge: ['ESPOSA', 'MARIDO'].includes(dependente.tipoDependente)
        ? { tipo: dependente.tipoDependente, nome: dependente.nome, dataNascimento: dependente.dataNascimento || '', dataCasamento: dependente.dataCasamento || '' }
        : { tipo: '', nome: '', dataNascimento: '', dataCasamento: '' },
      filhos: ['FILHO', 'FILHA'].includes(dependente.tipoDependente)
        ? [{ nome: dependente.nome, dataNascimento: dependente.dataNascimento || '', id: dependente.id }]
        : []
    });
    setShowFormDependente(true);
  };

  const handleUpdateDependente = async (e) => {
    e.preventDefault();

    if (!editingDependenteId) return;

    try {
      const dependenteOriginal = dependentes.find(d => d.id === editingDependenteId);

      let updateData = {};
      if (['ESPOSA', 'MARIDO'].includes(dependenteOriginal.tipoDependente)) {
        updateData = {
          id: editingDependenteId,
          tipoDependente: dependenteForm.conjuge.tipo,
          nome: dependenteForm.conjuge.nome,
          dataNascimento: dependenteForm.conjuge.dataNascimento || null,
          dataCasamento: dependenteForm.conjuge.dataCasamento || null
        };
      } else {
        updateData = {
          id: editingDependenteId,
          tipoDependente: 'FILHO',
          nome: dependenteForm.filhos[0]?.nome,
          dataNascimento: dependenteForm.filhos[0]?.dataNascimento || null
        };
      }

      const response = await fetch('/api/dependentes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Erro ao atualizar dependente');
        return;
      }

      toast.success('Dependente atualizado com sucesso!');
      handleCancelDependente();
      carregarDependentes();
    } catch (error) {
      console.error('Erro ao atualizar dependente:', error);
      toast.error('Erro ao atualizar dependente');
    }
  };

  // Membros que podem ter dependentes (apenas membros ativos com graus válidos)
  const membrosParaDependentes = membros.filter(m =>
    m.status === 'ATIVO' &&
    ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO', 'FILIADO'].includes(m.grau)
  );

  // Agrupar dependentes por membro
  const dependentesPorMembro = dependentes.reduce((acc, dep) => {
    if (!acc[dep.membroId]) {
      acc[dep.membroId] = { membro: dep.membro, dependentes: [] };
    }
    acc[dep.membroId].dependentes.push(dep);
    return acc;
  }, {});

  // ================== CAMPOS CONDICIONAIS ==================
  const mostrarCIM = ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO', 'FILIADO'].includes(formData.grau);
  const mostrarDataIniciacao = ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO', 'FILIADO'].includes(formData.grau);
  const mostrarDataFiliacao = ['MESTRE', 'MESTRE INSTALADO', 'FILIADO'].includes(formData.grau);
  const mostrarDataPassagemGrau = ['COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO', 'FILIADO'].includes(formData.grau);
  const mostrarDataElevacao = ['MESTRE', 'MESTRE INSTALADO', 'FILIADO'].includes(formData.grau);
  const mostrarCargo = ['MESTRE', 'MESTRE INSTALADO', 'FILIADO'].includes(formData.grau);
  const mostrarDataInstalacao = ['MESTRE INSTALADO', 'FILIADO'].includes(formData.grau);
  const dataInstalacaoObrigatoria = formData.grau === 'MESTRE INSTALADO';
  const mostrarDataRegularizacao = ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'].includes(formData.grau);
  const mostrarTextoAlertaEmail = ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO', 'FILIADO'].includes(formData.grau);
  const mostrarAssinatura = !['OUTROS', 'DEPENDENTE'].includes(formData.grau);

  // ================== FILTRAR POR ABA ==================
  const grausPorAba = {
    membros: ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'],
    filiados: ['FILIADO'],
    candidatos: ['CANDIDATO'],
    dependentes: ['DEPENDENTE'],
    outros: ['OUTROS']
  };

  const membrosFiltradosPorAba = membros
    .filter(m => grausPorAba[abaAtiva]?.includes(m.grau))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

  const contadorPorAba = {
    membros: membros.filter(m => grausPorAba.membros.includes(m.grau)).length,
    filiados: membros.filter(m => grausPorAba.filiados.includes(m.grau)).length,
    candidatos: candidatosPop.length,
    dependentes: dependentes.length, // Conta os dependentes reais, não membros com grau DEPENDENTE
    outros: membros.filter(m => grausPorAba.outros.includes(m.grau)).length
  };

  // Graus disponíveis para a aba atual
  // Quando editando candidato ou outros, permite promover para graus maçônicos
  const grausParaAba = editingId && ['candidatos', 'outros'].includes(abaAtiva)
    ? ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO', 'CANDIDATO', 'OUTROS']
    : (grausPorAba[abaAtiva] || graus);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-900 text-white p-3 md:p-4 shadow-lg">
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => router.push('/dashboard')} className="hover:bg-blue-800 active:bg-blue-700 p-2 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center">
              <ArrowLeft size={22} />
            </button>
            <h1 className="text-lg md:text-2xl font-bold hidden sm:block">Gerenciar Membros</h1>
            <h1 className="text-lg font-bold sm:hidden">Membros</h1>
          </div>
          <button onClick={() => {
            if (abaAtiva === 'dependentes') {
              setDependenteForm({ membroId: '', conjuge: { tipo: '', nome: '', dataNascimento: '', dataCasamento: '' }, filhos: [] });
              setShowFormDependente(true);
            } else if (abaAtiva === 'candidatos') {
              abrirNovoCandidato();
            } else {
              const grauPadrao = grausParaAba.length === 1 ? grausParaAba[0] : '';
              setFormData({ ...formData, grau: grauPadrao });
              setShowForm(true);
            }
          }} className="flex items-center gap-2 hover:bg-blue-800 border border-blue-700 px-4 py-2 rounded-lg transition">
            <Plus size={20} /> {abaAtiva === 'membros' ? 'Novo Membro' : abaAtiva === 'filiados' ? 'Novo Filiado' : abaAtiva === 'candidatos' ? 'Novo Candidato' : abaAtiva === 'dependentes' ? 'Novo Dependente' : 'Novo Registro'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Abas - Responsivas */}
        <div className="bg-white rounded-lg shadow-lg mb-6 overflow-hidden">
          <div className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory">
            <button
              onClick={() => setAbaAtiva('membros')}
              className={`flex-1 min-w-[70px] sm:min-w-[100px] px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap snap-start ${
                abaAtiva === 'membros'
                  ? 'bg-blue-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
              }`}
            >
              <span className="hidden xs:inline">Membros</span>
              <span className="xs:hidden">Memb.</span>
              <span className={`ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${
                abaAtiva === 'membros' ? 'bg-blue-700' : 'bg-gray-300'
              }`}>
                {contadorPorAba.membros}
              </span>
            </button>
            <button
              onClick={() => setAbaAtiva('filiados')}
              className={`flex-1 min-w-[70px] sm:min-w-[100px] px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap snap-start ${
                abaAtiva === 'filiados'
                  ? 'bg-blue-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
              }`}
            >
              <span className="hidden xs:inline">Filiados</span>
              <span className="xs:hidden">Fil.</span>
              <span className={`ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${
                abaAtiva === 'filiados' ? 'bg-blue-700' : 'bg-gray-300'
              }`}>
                {contadorPorAba.filiados}
              </span>
            </button>
            <button
              onClick={() => setAbaAtiva('candidatos')}
              className={`flex-1 min-w-[70px] sm:min-w-[100px] px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap snap-start ${
                abaAtiva === 'candidatos'
                  ? 'bg-blue-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
              }`}
            >
              <span className="hidden xs:inline">Candidatos</span>
              <span className="xs:hidden">Cand.</span>
              <span className={`ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${
                abaAtiva === 'candidatos' ? 'bg-blue-700' : 'bg-gray-300'
              }`}>
                {contadorPorAba.candidatos}
              </span>
            </button>
            <button
              onClick={() => setAbaAtiva('dependentes')}
              className={`flex-1 min-w-[70px] sm:min-w-[100px] px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap snap-start ${
                abaAtiva === 'dependentes'
                  ? 'bg-blue-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
              }`}
            >
              <span className="hidden xs:inline">Dependentes</span>
              <span className="xs:hidden">Dep.</span>
              <span className={`ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${
                abaAtiva === 'dependentes' ? 'bg-blue-700' : 'bg-gray-300'
              }`}>
                {contadorPorAba.dependentes}
              </span>
            </button>
            <button
              onClick={() => setAbaAtiva('outros')}
              className={`flex-1 min-w-[70px] sm:min-w-[100px] px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap snap-start ${
                abaAtiva === 'outros'
                  ? 'bg-blue-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
              }`}
            >
              Outros
              <span className={`ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${
                abaAtiva === 'outros' ? 'bg-blue-700' : 'bg-gray-300'
              }`}>
                {contadorPorAba.outros}
              </span>
            </button>
          </div>
        </div>

        {/* Formulário de Dependentes */}
        {showFormDependente && abaAtiva === 'dependentes' && (
          <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              {editingDependenteId ? 'Editar Dependente' : 'Novo Dependente'}
            </h2>
            <form onSubmit={editingDependenteId ? handleUpdateDependente : handleSubmitDependente} className="space-y-6">
              {/* Selecionar Membro */}
              {!editingDependenteId && (
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">
                    Selecione o Membro <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={dependenteForm.membroId}
                    onChange={(e) => setDependenteForm({ ...dependenteForm, membroId: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-800"
                    required
                  >
                    <option value="">Selecione um membro...</option>
                    {membrosParaDependentes.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nome} - {m.grau}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Membro selecionado em edição */}
              {editingDependenteId && dependenteForm.membroId && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <span className="text-sm text-gray-600">Membro:</span>
                  <span className="ml-2 font-bold text-gray-800">
                    {membros.find(m => m.id === dependenteForm.membroId)?.nome}
                  </span>
                </div>
              )}

              {/* Cônjuge */}
              {(!editingDependenteId || ['ESPOSA', 'MARIDO'].includes(dependentes.find(d => d.id === editingDependenteId)?.tipoDependente)) && (
                <div className="border-2 border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <Users size={20} /> Cônjuge
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-1 text-gray-700">Tipo</label>
                      <select
                        value={dependenteForm.conjuge.tipo}
                        onChange={(e) => setDependenteForm({
                          ...dependenteForm,
                          conjuge: { ...dependenteForm.conjuge, tipo: e.target.value }
                        })}
                        className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-800"
                      >
                        <option value="">Selecione...</option>
                        <option value="ESPOSA">Esposa</option>
                        <option value="MARIDO">Marido</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1 text-gray-700">Nome Completo</label>
                      <input
                        type="text"
                        value={dependenteForm.conjuge.nome}
                        onChange={(e) => setDependenteForm({
                          ...dependenteForm,
                          conjuge: { ...dependenteForm.conjuge, nome: e.target.value }
                        })}
                        className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-800"
                        placeholder="Nome completo do cônjuge"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1 text-gray-700">Data de Nascimento</label>
                      <input
                        type="date"
                        value={dependenteForm.conjuge.dataNascimento}
                        onChange={(e) => setDependenteForm({
                          ...dependenteForm,
                          conjuge: { ...dependenteForm.conjuge, dataNascimento: e.target.value }
                        })}
                        className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-800"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1 text-gray-700">Data de Casamento</label>
                      <input
                        type="date"
                        value={dependenteForm.conjuge.dataCasamento}
                        onChange={(e) => setDependenteForm({
                          ...dependenteForm,
                          conjuge: { ...dependenteForm.conjuge, dataCasamento: e.target.value }
                        })}
                        className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Filhos */}
              {(!editingDependenteId || ['FILHO', 'FILHA'].includes(dependentes.find(d => d.id === editingDependenteId)?.tipoDependente)) && (
                <div className="border-2 border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <UserPlus size={20} /> Filho(a)
                    </h3>
                    {!editingDependenteId && (
                      <button
                        type="button"
                        onClick={adicionarFilho}
                        className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm"
                      >
                        <Plus size={16} /> Adicionar Filho(a)
                      </button>
                    )}
                  </div>

                  {dependenteForm.filhos.length === 0 && !editingDependenteId ? (
                    <p className="text-gray-500 text-sm italic">Clique em &quot;Adicionar Filho(a)&quot; para cadastrar filhos</p>
                  ) : (
                    <div className="space-y-4">
                      {dependenteForm.filhos.map((filho, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-gray-700">Filho(a) {index + 1}</span>
                            {!editingDependenteId && (
                              <button
                                type="button"
                                onClick={() => removerFilho(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-bold mb-1 text-gray-700">Nome Completo</label>
                              <input
                                type="text"
                                value={filho.nome}
                                onChange={(e) => atualizarFilho(index, 'nome', e.target.value)}
                                className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-800"
                                placeholder="Nome completo"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-bold mb-1 text-gray-700">Data de Nascimento</label>
                              <input
                                type="date"
                                value={filho.dataNascimento}
                                onChange={(e) => atualizarFilho(index, 'dataNascimento', e.target.value)}
                                className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-800"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-2">
                <button type="submit" className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                  <Save size={20} /> {editingDependenteId ? 'Atualizar' : 'Salvar'}
                </button>
                <button type="button" onClick={handleCancelDependente} className="flex items-center gap-2 bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600">
                  <X size={20} /> Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Formulário */}
        {showForm && abaAtiva !== 'dependentes' && abaAtiva !== 'candidatos' && (
          <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              {editingId
                ? `Editar ${abaAtiva === 'membros' ? 'Membro' : abaAtiva === 'filiados' ? 'Filiado' : abaAtiva === 'candidatos' ? 'Candidato' : abaAtiva === 'dependentes' ? 'Dependente' : 'Registro'}`
                : `Novo ${abaAtiva === 'membros' ? 'Membro' : abaAtiva === 'filiados' ? 'Filiado' : abaAtiva === 'candidatos' ? 'Candidato' : abaAtiva === 'dependentes' ? 'Dependente' : 'Registro'}`
              }
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome e Grau */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">
                    Nome Completo <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">
                    Grau <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formData.grau}
                    onChange={(e) => {
                      const novoGrau = e.target.value;
                      // Limpar cargos se mudar para grau que não tem cargo
                      if (['APRENDIZ', 'COMPANHEIRO', 'CANDIDATO', 'OUTROS'].includes(novoGrau)) {
                        setCargosSelecionados([]);
                        setFormData({ ...formData, grau: novoGrau, cargo: '' });
                      } else {
                        setFormData({ ...formData, grau: novoGrau });
                      }
                    }}
                    className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-800"
                    required
                  >
                    <option value="">Selecione</option>
                    {grausParaAba.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              {/* CIM e Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mostrarCIM && (
                  <div>
                    <label className="block text-sm font-bold mb-1 text-gray-700">
                      CIM <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.cim}
                      onChange={(e) => setFormData({ ...formData, cim: e.target.value })}
                      className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-800"
                      placeholder="Número do CIM"
                      required={mostrarCIM}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">
                    Status <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-800"
                  >
                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Email e Data de Nascimento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">
                    E-mail{mostrarTextoAlertaEmail && ' (para alertas de reunião)'}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-800"
                    placeholder="exemplo@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={formData.dataNascimento}
                    onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-800"
                  />
                </div>
              </div>

              {/* Cargo */}
              {mostrarCargo && (
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">Cargo em Loja (pode selecionar múltiplos)</label>
                  <div className="border-2 border-gray-300 rounded p-3 space-y-2">
                    {cargosDisponiveis.map(cargo => (
                      <label key={cargo} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cargosSelecionados.includes(cargo)}
                          onChange={() => handleCargoToggle(cargo)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-gray-800">{cargo}</span>
                      </label>
                    ))}
                    {cargosSelecionados.length === 0 && (
                      <p className="text-sm text-gray-500 italic">Nenhum cargo selecionado</p>
                    )}
                  </div>
                  {formData.cargo && (
                    <p className="text-sm text-gray-600 mt-2">
                      Cargos: <strong>{formData.cargo}</strong>
                    </p>
                  )}
                </div>
              )}

              {/* Datas de Iniciação/Filiação */}
              {(mostrarDataIniciacao || mostrarDataFiliacao) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mostrarDataIniciacao && (
                    <div>
                      <label className="block text-sm font-bold mb-1 text-gray-700">
                        Data de Iniciação <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.dataIniciacao}
                        onChange={(e) => setFormData({ ...formData, dataIniciacao: e.target.value })}
                        className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-800"
                      />
                    </div>
                  )}
                  {mostrarDataFiliacao && (
                    <div>
                      <label className="block text-sm font-bold mb-1 text-gray-700">
                        Data de Filiação <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.dataFiliacao}
                        onChange={(e) => setFormData({ ...formData, dataFiliacao: e.target.value })}
                        className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-800"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Datas de Grau/Elevação/Instalação */}
              {(mostrarDataPassagemGrau || mostrarDataElevacao || mostrarDataInstalacao) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {mostrarDataPassagemGrau && (
                    <div>
                      <label className="block text-sm font-bold mb-1 text-gray-700">
                        Data de Promoção <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.dataPassagemGrau}
                        onChange={(e) => setFormData({ ...formData, dataPassagemGrau: e.target.value })}
                        className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-800"
                      />
                    </div>
                  )}
                  {mostrarDataElevacao && (
                    <div>
                      <label className="block text-sm font-bold mb-1 text-gray-700">
                        Data de Elevação <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.dataElevacao}
                        onChange={(e) => setFormData({ ...formData, dataElevacao: e.target.value })}
                        className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-800"
                      />
                    </div>
                  )}
                  {mostrarDataInstalacao && (
                    <div>
                      <label className="block text-sm font-bold mb-1 text-gray-700">
                        Data de Instalação {dataInstalacaoObrigatoria && <span className="text-red-600">*</span>}
                      </label>
                      <input
                        type="date"
                        value={formData.dataInstalacao}
                        onChange={(e) => setFormData({ ...formData, dataInstalacao: e.target.value })}
                        className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-800"
                        required={dataInstalacaoObrigatoria}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Data de Regularização */}
              {mostrarDataRegularizacao && (
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">
                    Data de Regularização
                  </label>
                  <input
                    type="date"
                    value={formData.dataRegularizacao}
                    onChange={(e) => setFormData({ ...formData, dataRegularizacao: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-800"
                  />
                </div>
              )}

              {/* Data do Kit Placet */}
              <div>
                <label className="block text-sm font-bold mb-1 text-gray-700">
                  Data do Kit Placet
                </label>
                <input
                  type="date"
                  value={formData.dataKitPlacet}
                  onChange={(e) => setFormData({ ...formData, dataKitPlacet: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-800"
                />
              </div>

              {/* Upload de Assinatura */}
              {mostrarAssinatura && (
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">Assinatura (Opcional)</label>
                  <div className="border-2 border-dashed border-gray-300 rounded p-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAssinaturaUpload}
                      className="hidden"
                      id="assinatura-upload"
                    />
                    <label htmlFor="assinatura-upload" className="flex flex-col items-center cursor-pointer">
                      {formData.assinaturaUrl ? (
                        <img src={formData.assinaturaUrl} alt="Assinatura" className="max-h-32 mb-2"/>
                      ) : (
                        <Upload size={32} className="text-gray-400 mb-2" />
                      )}
                      <span className="text-sm text-gray-600">{formData.assinaturaUrl ? 'Clique para alterar' : 'Clique para adicionar assinatura'}</span>
                      <span className="text-xs text-gray-500 mt-1">PNG, JPG até 2MB</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-2">
                <button type="submit" className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                  <Save size={20}/> Salvar
                </button>
                <button type="button" onClick={handleCancel} className="flex items-center gap-2 bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600">
                  <X size={20}/> Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Campo de Busca - não mostrar na aba dependentes */}
        {!loading && abaAtiva !== 'dependentes' && abaAtiva !== 'candidatos' && Array.isArray(membrosFiltradosPorAba) && membrosFiltradosPorAba.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por nome, CIM ou cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
            {searchTerm && (
              <div className="mt-2 text-sm text-gray-600">
                {membrosFiltradosPorAba.filter(m =>
                  m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  m.cim?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  m.cargo?.toLowerCase().includes(searchTerm.toLowerCase())
                ).length} resultado(s) encontrado(s)
              </div>
            )}
          </div>
        )}

        {/* Lista de Dependentes */}
        {abaAtiva === 'dependentes' && (
          <>
            {loading ? (
              <div className="text-center py-8 text-gray-600">Carregando...</div>
            ) : dependentes.length === 0 ? (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-600">
                Nenhum dependente cadastrado
              </div>
            ) : (
              <div className="space-y-4">
                {Object.values(dependentesPorMembro).sort((a, b) => (a.membro?.nome || '').localeCompare(b.membro?.nome || '', 'pt-BR', { sensitivity: 'base' })).map(({ membro, dependentes: deps }) => (
                  <div key={membro?.id || 'unknown'} className="bg-white rounded-lg shadow-lg overflow-hidden">
                    {/* Header do Membro */}
                    <div className="bg-blue-900 text-white p-4">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <Users size={20} />
                        {membro?.nome || 'Membro não encontrado'}
                      </h3>
                      <span className="text-blue-200 text-sm">{membro?.grau}</span>
                    </div>

                    {/* Lista de Dependentes */}
                    <div className="p-4 space-y-3">
                      {deps.map(dep => (
                        <div key={dep.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                dep.tipoDependente === 'ESPOSA' || dep.tipoDependente === 'MARIDO'
                                  ? 'bg-pink-100 text-pink-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {dep.tipoDependente === 'ESPOSA' ? 'Esposa' :
                                 dep.tipoDependente === 'MARIDO' ? 'Marido' :
                                 dep.tipoDependente === 'FILHO' ? 'Filho(a)' :
                                 dep.tipoDependente}
                              </span>
                              <span className="font-semibold text-gray-900">{dep.nome}</span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {dep.dataNascimento && (
                                <span>Nasc: {new Date(dep.dataNascimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                              )}
                              {dep.dataCasamento && (
                                <span className="ml-3">Casamento: {new Date(dep.dataCasamento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditDependente(dep)}
                              className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
                              title="Editar"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteDependente(dep.id)}
                              className="bg-red-600 text-white p-2 rounded hover:bg-red-700 transition"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Lista de Candidatos (aba candidatos — usa tabela Candidato do POP) */}
        {abaAtiva === 'candidatos' && (
          candidatosPop.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-600">
              Nenhum candidato cadastrado
            </div>
          ) : (
            <div className="space-y-3">
              {candidatosPop
                .filter(c => !searchTerm || c.nome.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(cand => {
                  const STATUS_INFO = {
                    EM_ANDAMENTO: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800 border-blue-300' },
                    APROVADO:     { label: 'Iniciado',      color: 'bg-green-100 text-green-800 border-green-300' },
                    REPROVADO:    { label: 'Reprovado',     color: 'bg-red-100 text-red-800 border-red-300' },
                    DESISTIU:     { label: 'Desistiu',      color: 'bg-gray-100 text-gray-700 border-gray-300' },
                  };
                  const si = STATUS_INFO[cand.status] || STATUS_INFO.EM_ANDAMENTO;
                  return (
                    <div key={cand.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900">{cand.nome}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${si.color}`}>{si.label}</span>
                        </div>
                        <div className="text-xs text-gray-500 space-x-3">
                          {cand.telefone && <span>📱 {cand.telefone}</span>}
                          {cand.grauInstrucao && <span>🎓 {cand.grauInstrucao}</span>}
                          {cand.proponenteNomes && <span>Proponentes: {cand.proponenteNomes}</span>}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">Etapa {cand.etapaAtual} de 11</div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => abrirEditarCandidato(cand)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => excluirCandidatoPop(cand.id, cand.nome)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Excluir">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )
        )}

        {/* Lista de Membros */}
        {abaAtiva !== 'dependentes' && abaAtiva !== 'candidatos' && (loading ? (
          <div className="text-center py-8 text-gray-600">Carregando...</div>
        ) : !Array.isArray(membrosFiltradosPorAba) || membrosFiltradosPorAba.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-600">
            Nenhum {abaAtiva === 'membros' ? 'membro' : abaAtiva === 'filiados' ? 'filiado' : 'registro'} cadastrado
          </div>
        ) : (
          <>
            {/* Desktop - Tabela */}
            <div className="hidden md:block bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-blue-900 text-white sticky top-0 z-20">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold">Nome</th>
                      <th className="px-4 py-3 text-left font-bold">Grau</th>
                      <th className="px-4 py-3 text-left font-bold">CIM</th>
                      <th className="px-4 py-3 text-left font-bold">Cargo</th>
                      <th className="px-4 py-3 text-center font-bold">Status</th>
                      <th className="px-4 py-3 text-center font-bold sticky right-0 bg-blue-900">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(membrosFiltradosPorAba) && membrosFiltradosPorAba
                      .filter(membro => {
                        if (!searchTerm) return true;
                        const termo = searchTerm.toLowerCase();
                        return (
                          membro.nome.toLowerCase().includes(termo) ||
                          membro.cim?.toLowerCase().includes(termo) ||
                          membro.cargo?.toLowerCase().includes(termo)
                        );
                      })
                      .map((membro, index) => (
                      <tr
                        key={membro.id}
                        className={`border-b hover:bg-blue-50 transition ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3 text-gray-900 font-semibold">{membro.nome}</td>
                        <td className="px-4 py-3 text-gray-800">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            membro.grau === 'APRENDIZ' ? 'bg-blue-100 text-blue-800' :
                            membro.grau === 'COMPANHEIRO' ? 'bg-green-100 text-green-800' :
                            membro.grau === 'MESTRE' ? 'bg-purple-100 text-purple-800' :
                            membro.grau === 'MESTRE INSTALADO' ? 'bg-indigo-100 text-indigo-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {membro.grau}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-800">{membro.cim || '-'}</td>
                        <td className="px-4 py-3 text-gray-800 text-sm max-w-xs truncate" title={membro.cargo || '-'}>
                          {membro.cargo || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            membro.status === 'ATIVO' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {membro.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 sticky right-0 bg-inherit">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleEdit(membro)}
                              className="bg-blue-600 text-white p-3 rounded hover:bg-blue-700 transition"
                              title="Editar"
                            >
                              <Edit size={20}/>
                            </button>
                            <button
                              onClick={() => handleDelete(membro.id)}
                              className="bg-red-600 text-white p-3 rounded hover:bg-red-700 transition"
                              title="Excluir"
                            >
                              <Trash2 size={20}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile - Cards */}
            <div className="md:hidden space-y-4">
              {Array.isArray(membrosFiltradosPorAba) && membrosFiltradosPorAba
                .filter(membro => {
                  if (!searchTerm) return true;
                  const termo = searchTerm.toLowerCase();
                  return (
                    membro.nome.toLowerCase().includes(termo) ||
                    membro.cim?.toLowerCase().includes(termo) ||
                    membro.cargo?.toLowerCase().includes(termo)
                  );
                })
                .map(membro => (
                <div key={membro.id} className="bg-white rounded-lg p-4 shadow-lg border-l-4 border-blue-600">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg mb-1">{membro.nome}</h3>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                        membro.grau === 'APRENDIZ' ? 'bg-blue-100 text-blue-800' :
                        membro.grau === 'COMPANHEIRO' ? 'bg-green-100 text-green-800' :
                        membro.grau === 'MESTRE' ? 'bg-purple-100 text-purple-800' :
                        membro.grau === 'MESTRE INSTALADO' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {membro.grau}
                      </span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      membro.status === 'ATIVO' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {membro.status}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">CIM:</span>
                      <span className="font-semibold text-gray-900">{membro.cim || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Cargo:</span>
                      <span className="text-right font-semibold text-gray-900">{membro.cargo || '-'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(membro)}
                      className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2"
                    >
                      <Edit size={18}/>
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(membro.id)}
                      className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition font-medium flex items-center justify-center gap-2"
                    >
                      <Trash2 size={18}/>
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ))}
      </main>

      {/* Modal Novo/Editar Candidato */}
      {showFormCandidato && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowFormCandidato(false)}>
          <div className="bg-white rounded-xl p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{editingCandidatoId ? 'Editar Candidato' : 'Novo Candidato'}</h2>
              <button onClick={() => setShowFormCandidato(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo *</label>
                <input type="text" value={formDataCandidato.nome}
                  onChange={e => setFormDataCandidato({ ...formDataCandidato, nome: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none text-base"
                  placeholder="Nome completo do candidato" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Data de Nascimento</label>
                <input type="date" value={formDataCandidato.dataNascimento}
                  onChange={e => setFormDataCandidato({ ...formDataCandidato, dataNascimento: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none text-base" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nome da Esposa / Cônjuge</label>
                <input type="text" value={formDataCandidato.nomeConjuge}
                  onChange={e => setFormDataCandidato({ ...formDataCandidato, nomeConjuge: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none text-base"
                  placeholder="Nome completo" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Endereço Residencial</label>
                <textarea value={formDataCandidato.enderecoResidencial}
                  onChange={e => setFormDataCandidato({ ...formDataCandidato, enderecoResidencial: e.target.value })}
                  rows={2} className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none resize-none text-base"
                  placeholder="Rua, número, bairro, cidade — CEP" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Telefone Celular</label>
                  <input type="tel" value={formDataCandidato.telefone}
                    onChange={e => setFormDataCandidato({ ...formDataCandidato, telefone: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none text-base"
                    placeholder="(88) 99999-9999" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Telefone Fixo</label>
                  <input type="tel" value={formDataCandidato.telefoneFixo}
                    onChange={e => setFormDataCandidato({ ...formDataCandidato, telefoneFixo: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none text-base"
                    placeholder="(88) 3333-4444" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Endereço Profissional</label>
                <textarea value={formDataCandidato.enderecoProfissional}
                  onChange={e => setFormDataCandidato({ ...formDataCandidato, enderecoProfissional: e.target.value })}
                  rows={2} className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none resize-none text-base"
                  placeholder="Local de trabalho, endereço..." />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Grau de Instrução</label>
                <select value={formDataCandidato.grauInstrucao}
                  onChange={e => setFormDataCandidato({ ...formDataCandidato, grauInstrucao: e.target.value })}
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
                {mestresProponentes.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Nenhum Mestre ativo encontrado</p>
                ) : (
                  <div className="border-2 border-gray-300 rounded-lg max-h-44 overflow-y-auto divide-y divide-gray-100">
                    {mestresProponentes.map(m => {
                      const sel = formDataCandidato.proponenteIds.includes(m.id);
                      return (
                        <label key={m.id} className={`flex items-center gap-3 px-3 py-3 cursor-pointer ${sel ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                          <input type="checkbox" checked={sel}
                            onChange={() => {
                              const ids = sel
                                ? formDataCandidato.proponenteIds.filter(id => id !== m.id)
                                : [...formDataCandidato.proponenteIds, m.id];
                              setFormDataCandidato({ ...formDataCandidato, proponenteIds: ids });
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
              <button onClick={() => setShowFormCandidato(false)}
                className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition">
                Cancelar
              </button>
              <button onClick={salvarCandidato}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
                {editingCandidatoId ? 'Salvar' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}