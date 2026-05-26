"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Send, Users, Calendar, Edit3, Save, X, CheckCircle, AlertCircle, Bell, UserPlus, Award, Plus, Trash2, Cake, Heart, Gift } from 'lucide-react';

export default function AlertasPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [membros, setMembros] = useState([]);
  const [secretario, setSecretário] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState('personalizado'); // 'reuniao', 'personalizado' ou 'aniversarios'

  // Aniversários
  const [aniversarios, setAniversarios] = useState({ nascimentoMembros: [], nascimentoDependentes: [], casamento: [] });
  const [loadingAniversarios, setLoadingAniversarios] = useState(false);
  const [dependentes, setDependentes] = useState([]);

  // Configuração da mensagem de reunião (automática)
  const [editandoMensagemReuniao, setEditandoMensagemReuniao] = useState(false);
  const [mensagemReuniao, setMensagemReuniao] = useState({
    saudacao: 'Saudações meus Irmãos,',
    corpo: 'Gostaria de lembrar por meio dessa que dia {dia} do mês de {mes} teremos reunião no grau de {grau}.',
    despedida: 'Contamos com sua presença!'
  });

  // Email personalizado
  const [tipoEmail, setTipoEmail] = useState('');
  const [assuntoPersonalizado, setAssuntoPersonalizado] = useState('');
  const [mensagemPersonalizada, setMensagemPersonalizada] = useState('');
  const [selectedMembros, setSelectedMembros] = useState([]);
  const [emailsExternos, setEmailsExternos] = useState([]);
  const [novoEmailExterno, setNovoEmailExterno] = useState({ nome: '', email: '' });

  // Templates pré-definidos
  const templates = {
    candidato_aceito: {
      titulo: 'Candidato Aceito',
      assunto: 'Comunicado - A.R.L.S. Sabedoria de Salomão',
      mensagem: `Prezado {nome},

É com grande satisfação que comunicamos que sua candidatura foi aceita pela A.R.L.S. Sabedoria de Salomão nº 4.774.

Em breve entraremos em contato para informar os próximos passos.

Atenciosamente,`
    },
    data_iniciacao: {
      titulo: 'Data de Iniciação',
      assunto: 'Data de Iniciação - A.R.L.S. Sabedoria de Salomão',
      mensagem: `Prezado {nome},

Temos a honra de comunicar que sua cerimônia de iniciação está marcada para o dia {data}.

Por favor, confirme sua disponibilidade respondendo este email.

Atenciosamente,`
    },
    mudanca_grau: {
      titulo: 'Promoção',
      assunto: 'Comunicado - Data de Cerimônia',
      mensagem: `Prezado Irmão {nome},

Informamos que sua cerimônia de elevação/passagem está marcada para o dia {data}.

Contamos com sua presença!

Arenciosamente,`
    },
    aviso_geral: {
      titulo: 'Aviso Geral',
      assunto: 'Aviso - A.R.L.S. Sabedoria de Salomão',
      mensagem: `Prezados Irmãos,

{mensagem}

Atenciosamente,`
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const resMembros = await fetch('/api/membros', { credentials: 'include' });
      const membrosData = await resMembros.json();
      const membrosComEmail = Array.isArray(membrosData)
        ? membrosData.filter(m => m.email && m.status === 'ATIVO')
        : [];
      setMembros(membrosComEmail);

      const secretarioMembro = membrosComEmail.find(m => m.cargo === 'SECRETÁRIO');
      setSecretário(secretarioMembro);

      // Carregar dependentes
      const resDep = await fetch('/api/dependentes', { credentials: 'include' });
      const depData = await resDep.json();
      setDependentes(Array.isArray(depData) ? depData : []);

      // Carregar aniversários do dia
      carregarAniversarios(Array.isArray(membrosData) ? membrosData : [], Array.isArray(depData) ? depData : []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarAniversarios = (todosMembros, todosDependentes) => {
    setLoadingAniversarios(true);

    const hoje = new Date();
    const diaHoje = String(hoje.getDate()).padStart(2, '0');
    const mesHoje = String(hoje.getMonth() + 1).padStart(2, '0');

    const isAniversarioHoje = (dataStr) => {
      if (!dataStr) return false;
      if (dataStr.includes('/')) {
        const partes = dataStr.split('/');
        if (partes.length >= 2) {
          return partes[0] === diaHoje && partes[1] === mesHoje;
        }
      }
      if (dataStr.includes('-')) {
        const partes = dataStr.split('-');
        if (partes.length === 3) {
          return partes[2] === diaHoje && partes[1] === mesHoje;
        }
      }
      return false;
    };

    const nascimentoMembros = todosMembros
      .filter(m => m.status === 'ATIVO' && isAniversarioHoje(m.dataNascimento))
      .map(m => ({ nome: m.nome, data: m.dataNascimento }));

    const nascimentoDependentes = todosDependentes
      .filter(d => isAniversarioHoje(d.dataNascimento))
      .map(d => ({
        nome: d.nome,
        tipo: d.tipoDependente,
        membroNome: d.membro?.nome || 'N/A',
        data: d.dataNascimento,
      }));

    const casamento = todosDependentes
      .filter(d => isAniversarioHoje(d.dataCasamento))
      .map(d => ({
        dependenteNome: d.nome,
        tipo: d.tipoDependente,
        membroNome: d.membro?.nome || 'N/A',
        data: d.dataCasamento,
      }));

    setAniversarios({ nascimentoMembros, nascimentoDependentes, casamento });
    setLoadingAniversarios(false);
  };

  const formatarTipoDependente = (tipo) => {
    const tipos = {
      'ESPOSA': 'Esposa',
      'MARIDO': 'Marido',
      'FILHO': 'Filho',
      'FILHA': 'Filha',
    };
    return tipos[tipo] || tipo;
  };

  const selecionarTemplate = (templateKey) => {
    const template = templates[templateKey];
    if (template) {
      setTipoEmail(templateKey);
      setAssuntoPersonalizado(template.assunto);
      setMensagemPersonalizada(template.mensagem);
    }
  };

  const toggleMembro = (membroId) => {
    setSelectedMembros(prev =>
      prev.includes(membroId)
        ? prev.filter(id => id !== membroId)
        : [...prev, membroId]
    );
  };

  const adicionarEmailExterno = () => {
    if (novoEmailExterno.nome && novoEmailExterno.email) {
      setEmailsExternos(prev => [...prev, { ...novoEmailExterno, id: Date.now() }]);
      setNovoEmailExterno({ nome: '', email: '' });
    }
  };

  const removerEmailExterno = (id) => {
    setEmailsExternos(prev => prev.filter(e => e.id !== id));
  };

  const enviarEmailPersonalizado = async () => {
    const destinatarios = [
      ...selectedMembros.map(id => {
        const m = membros.find(m => m.id === id);
        return { nome: m.nome, email: m.email };
      }),
      ...emailsExternos.map(e => ({ nome: e.nome, email: e.email }))
    ];

    if (destinatarios.length === 0) {
      setResultado({ success: false, message: 'Selecione pelo menos um destinatário' });
      return;
    }

    if (!assuntoPersonalizado || !mensagemPersonalizada) {
      setResultado({ success: false, message: 'Preencha o assunto e a mensagem' });
      return;
    }

    setEnviando(true);
    setResultado(null);

    try {
      const response = await fetch('/api/alertas/email-personalizado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          destinatarios,
          assunto: assuntoPersonalizado,
          mensagem: mensagemPersonalizada
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResultado({
          success: true,
          message: `${data.enviados} email(s) enviado(s) com sucesso!`
        });
        setSelectedMembros([]);
        setEmailsExternos([]);
      } else {
        setResultado({
          success: false,
          message: data.error || 'Erro ao enviar emails'
        });
      }
    } catch (error) {
      setResultado({ success: false, message: 'Erro ao enviar: ' + error.message });
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-900 text-white p-3 md:p-4 shadow-lg">
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="hover:bg-blue-800 active:bg-blue-700 p-2 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <ArrowLeft size={22} />
            </button>
            <h1 className="text-lg md:text-xl font-bold hidden sm:block">Central de Emails</h1>
          </div>
          <div className="sm:hidden">
            <Mail size={24} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-3 md:p-6 lg:p-8">
        {/* Abas */}
        <div className="flex gap-2 mb-4 md:mb-6">
          <button
            onClick={() => setAbaAtiva('reuniao')}
            className={`flex items-center justify-center gap-2 px-3 md:px-4 py-2.5 md:py-3 rounded-lg font-medium transition min-h-[44px] text-sm md:text-base ${
              abaAtiva === 'reuniao'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
            }`}
          >
            <Bell size={18} className="md:w-5 md:h-5" />
            <span className="hidden sm:inline">Alertas de Reunião</span>
            <span className="sm:hidden">Reunião</span>
          </button>
          <button
            onClick={() => setAbaAtiva('personalizado')}
            className={`flex items-center justify-center gap-2 px-3 md:px-4 py-2.5 md:py-3 rounded-lg font-medium transition min-h-[44px] text-sm md:text-base ${
              abaAtiva === 'personalizado'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
            }`}
          >
            <Mail size={18} className="md:w-5 md:h-5" />
            <span className="hidden sm:inline">Email Personalizado</span>
            <span className="sm:hidden">Email</span>
          </button>
          <button
            onClick={() => setAbaAtiva('aniversarios')}
            className={`flex items-center justify-center gap-2 px-3 md:px-4 py-2.5 md:py-3 rounded-lg font-medium transition min-h-[44px] text-sm md:text-base ${
              abaAtiva === 'aniversarios'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
            }`}
          >
            <Cake size={18} className="md:w-5 md:h-5" />
            <span className="hidden sm:inline">Aniversários</span>
            <span className="sm:hidden">Aniv.</span>
          </button>
        </div>

        {/* Aba Alertas de Reunião */}
        {abaAtiva === 'reuniao' && (
          <div className="space-y-4 md:space-y-6">
            {/* Info automático */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
              <div className="flex items-start gap-2 md:gap-3">
                <Calendar className="text-blue-600 mt-0.5 flex-shrink-0" size={18} />
                <div>
                  <h3 className="font-semibold text-blue-900 text-sm md:text-base">Envio Automático</h3>
                  <p className="text-blue-700 text-xs md:text-sm">
                    Os alertas de reunião são enviados <strong>automaticamente ao meio-dia</strong> para
                    reuniões do dia atual e do dia seguinte. Abaixo você pode personalizar a mensagem padrão.
                  </p>
                </div>
              </div>
            </div>

            {/* Editar mensagem padrão */}
            <div className="bg-white text-gray-900 rounded-lg shadow-lg p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h2 className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Edit3 size={18} className="md:w-5 md:h-5" />
                  Mensagem Padrão de Reunião
                </h2>
                {!editandoMensagemReuniao ? (
                  <button
                    onClick={() => setEditandoMensagemReuniao(true)}
                    className="bg-blue-100 text-blue-600 hover:bg-blue-200 px-3 md:px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm md:text-base min-h-[44px]"
                  >
                    <Edit3 size={16} />
                    Editar
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditandoMensagemReuniao(false)}
                      className="bg-green-100 text-green-600 hover:bg-green-200 px-3 md:px-4 py-2 rounded-lg flex items-center gap-2 text-sm md:text-base min-h-[44px]"
                    >
                      <Save size={16} />
                      Salvar
                    </button>
                    <button
                      onClick={() => {
                        setMensagemReuniao({
                          saudacao: 'Saudações meus Irmãos,',
                          corpo: 'Gostaria de lembrar por meio dessa que dia {dia} do mês de {mes} teremos reunião no grau de {grau}.',
                          despedida: 'Contamos com sua presença!'
                        });
                        setEditandoMensagemReuniao(false);
                      }}
                      className="bg-gray-100 text-gray-600 hover:bg-gray-200 px-3 md:px-4 py-2 rounded-lg flex items-center gap-2 text-sm md:text-base min-h-[44px]"
                    >
                      <X size={16} />
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

              {editandoMensagemReuniao ? (
                <div className="space-y-3 md:space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Saudação</label>
                    <input
                      type="text"
                      value={mensagemReuniao.saudacao}
                      onChange={(e) => setMensagemReuniao({...mensagemReuniao, saudacao: e.target.value})}
                      className="w-full p-2.5 md:p-3 border rounded-lg text-sm md:text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Corpo da mensagem
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Use: {'{dia}'} para o dia, {'{mes}'} para o mês, {'{grau}'} para o tipo de reunião
                    </p>
                    <textarea
                      value={mensagemReuniao.corpo}
                      onChange={(e) => setMensagemReuniao({...mensagemReuniao, corpo: e.target.value})}
                      className="w-full p-2.5 md:p-3 border rounded-lg h-24 text-sm md:text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Despedida</label>
                    <input
                      type="text"
                      value={mensagemReuniao.despedida}
                      onChange={(e) => setMensagemReuniao({...mensagemReuniao, despedida: e.target.value})}
                      className="w-full p-2.5 md:p-3 border rounded-lg text-sm md:text-base"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg border overflow-hidden">
                  <div className="bg-blue-900 text-white p-3 flex items-center justify-center gap-2">
                    <span className="font-bold text-xs md:text-sm">Preview do Email</span>
                  </div>
                  <div className="p-3 md:p-4 bg-white text-xs md:text-sm">
                    <p className="mb-2 md:mb-3">{mensagemReuniao.saudacao}</p>
                    <p className="mb-2 md:mb-3">{mensagemReuniao.corpo}</p>
                    <p className="mb-3 md:mb-4">{mensagemReuniao.despedida}</p>
                    {secretario && (
                      <div className="border-t pt-2 md:pt-3 text-gray-600">
                        <p className="font-semibold">{secretario.nome}</p>
                        <p>CIM: {secretario.cim || 'N/A'}</p>
                        <p>Secretário</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Aba Email Personalizado */}
        {abaAtiva === 'personalizado' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Coluna Esquerda - Templates e Destinatários */}
            <div className="space-y-4 md:space-y-6">
              {/* Templates */}
              <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
                <h2 className="text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4">Tipo de Email</h2>
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <button
                    onClick={() => selecionarTemplate('candidato_aceito')}
                    className={`p-3 md:p-4 rounded-lg border-2 text-left transition min-h-[80px] ${
                      tipoEmail === 'candidato_aceito'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <UserPlus size={20} className="text-green-600 mb-1 md:mb-2 md:w-6 md:h-6" />
                    <p className="font-medium text-gray-900 text-xs md:text-sm">Candidato Aceito</p>
                  </button>
                  <button
                    onClick={() => selecionarTemplate('data_iniciacao')}
                    className={`p-3 md:p-4 rounded-lg border-2 text-left transition min-h-[80px] ${
                      tipoEmail === 'data_iniciacao'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Calendar size={20} className="text-blue-600 mb-1 md:mb-2 md:w-6 md:h-6" />
                    <p className="font-medium text-gray-900 text-xs md:text-sm">Data de Iniciação</p>
                  </button>
                  <button
                    onClick={() => selecionarTemplate('mudanca_grau')}
                    className={`p-3 md:p-4 rounded-lg border-2 text-left transition min-h-[80px] ${
                      tipoEmail === 'mudanca_grau'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Award size={20} className="text-purple-600 mb-1 md:mb-2 md:w-6 md:h-6" />
                    <p className="font-medium text-gray-900 text-xs md:text-sm">Promoção</p>
                  </button>
                  <button
                    onClick={() => selecionarTemplate('aviso_geral')}
                    className={`p-3 md:p-4 rounded-lg border-2 text-left transition min-h-[80px] ${
                      tipoEmail === 'aviso_geral'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Mail size={20} className="text-orange-600 mb-1 md:mb-2 md:w-6 md:h-6" />
                    <p className="font-medium text-gray-900 text-xs md:text-sm">Aviso Geral</p>
                  </button>
                </div>
              </div>

              {/* Adicionar Email Externo (Candidatos) */}
              <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
                <h2 className="text-base md:text-lg font-bold text-gray-800 mb-2 md:mb-4 flex items-center gap-2">
                  <UserPlus size={18} className="md:w-5 md:h-5" />
                  Adicionar Destinatário Externo
                </h2>
                <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4">Para candidatos ou pessoas que não estão cadastradas no sistema</p>

                <div className="flex flex-col sm:flex-row gap-2 mb-3 md:mb-4">
                  <input
                    type="text"
                    placeholder="Nome"
                    value={novoEmailExterno.nome}
                    onChange={(e) => setNovoEmailExterno({...novoEmailExterno, nome: e.target.value})}
                    className="flex-1 p-2.5 border text-gray-900 rounded-lg text-sm min-h-[44px]"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={novoEmailExterno.email}
                    onChange={(e) => setNovoEmailExterno({...novoEmailExterno, email: e.target.value})}
                    className="flex-1 p-2.5 border text-gray-900 rounded-lg text-sm min-h-[44px]"
                  />
                  <button
                    onClick={adicionarEmailExterno}
                    disabled={!novoEmailExterno.nome || !novoEmailExterno.email}
                    className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 min-h-[44px] flex items-center justify-center"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                {emailsExternos.length > 0 && (
                  <div className="space-y-2">
                    {emailsExternos.map(ext => (
                      <div key={ext.id} className="flex items-center justify-between bg-green-50 p-2.5 rounded-lg">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{ext.nome}</p>
                          <p className="text-xs text-gray-500 truncate">{ext.email}</p>
                        </div>
                        <button
                          onClick={() => removerEmailExterno(ext.id)}
                          className="text-red-500 hover:text-red-700 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Membros Cadastrados */}
              <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
                <h2 className="text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2">
                  <Users size={18} className="md:w-5 md:h-5" />
                  Membros Cadastrados ({selectedMembros.length} selecionados)
                </h2>

                {membros.length === 0 ? (
                  <p className="text-gray-500 text-sm">Nenhum membro com email cadastrado</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {membros.map(membro => (
                      <label
                        key={membro.id}
                        className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-lg cursor-pointer min-h-[48px]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembros.includes(membro.id)}
                          onChange={() => toggleMembro(membro.id)}
                          className="w-5 h-5 text-blue-600 rounded flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 text-sm truncate">{membro.nome}</p>
                          <p className="text-xs text-gray-500 truncate">{membro.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Coluna Direita - Editor de Email */}
            <div className="space-y-4 md:space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
                <h2 className="text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4">Compor Email</h2>

                <div className="space-y-3 md:space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assunto</label>
                    <input
                      type="text"
                      value={assuntoPersonalizado}
                      onChange={(e) => setAssuntoPersonalizado(e.target.value)}
                      placeholder="Assunto do email..."
                      className="w-full text-gray-900 p-2.5 md:p-3 border rounded-lg text-sm md:text-base min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
                    <p className="text-xs text-gray-500 mb-2">
                      Use {'{nome}'} para inserir o nome do destinatário, {'{data}'} para data
                    </p>
                    <textarea
                      value={mensagemPersonalizada}
                      onChange={(e) => setMensagemPersonalizada(e.target.value)}
                      placeholder="Escreva sua mensagem..."
                      className="w-full p-2.5 md:p-3 border text-gray-900 rounded-lg h-40 md:h-48 resize-none text-sm md:text-base"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              {(assuntoPersonalizado || mensagemPersonalizada) && (
                <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
                  <h2 className="text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4">Preview</h2>
                  <div className="bg-gray-50 rounded-lg border overflow-hidden">
                    <div className="bg-blue-900 text-white p-2.5 md:p-3 flex items-center justify-center gap-2">
                      <span className="font-bold text-xs md:text-sm">Preview do Email</span>
                    </div>
                    <div className="p-3 md:p-4 bg-white">
                      <p className="text-xs text-gray-500 mb-2">Assunto: {assuntoPersonalizado}</p>
                      <div className="text-xs md:text-sm text-gray-900 whitespace-pre-wrap">{mensagemPersonalizada}</div>
                      {secretario && (
                        <div className="border-t mt-3 md:mt-4 pt-2 md:pt-3 text-xs md:text-sm text-gray-600">
                          <p className="font-semibold">{secretario.nome}</p>
                          <p>CIM: {secretario.cim || 'N/A'}</p>
                          <p>Secretário</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Resultado */}
              {resultado && (
                <div className={`p-3 md:p-4 rounded-lg flex items-center gap-2 md:gap-3 text-sm ${
                  resultado.success
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {resultado.success ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                  <span>{resultado.message}</span>
                </div>
              )}

              {/* Botão Enviar */}
              <button
                onClick={enviarEmailPersonalizado}
                disabled={enviando || (selectedMembros.length === 0 && emailsExternos.length === 0)}
                className="w-full bg-blue-600 text-white py-3 md:py-4 rounded-lg font-bold text-base md:text-lg hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 md:gap-3 transition min-h-[52px]"
              >
                {enviando ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send size={20} className="md:w-[22px] md:h-[22px]" />
                    <span>Enviar ({selectedMembros.length + emailsExternos.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Aba Aniversários */}
        {abaAtiva === 'aniversarios' && (
          <div className="space-y-4 md:space-y-6">
            {/* Info automático */}
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-3 md:p-4">
              <div className="flex items-start gap-2 md:gap-3">
                <Gift className="text-pink-600 mt-0.5 flex-shrink-0" size={18} />
                <div>
                  <h3 className="font-semibold text-pink-900 text-sm md:text-base">Envio Automático de Lembretes</h3>
                  <p className="text-pink-700 text-xs md:text-sm">
                    Os lembretes de aniversário são enviados <strong>automaticamente ao meio-dia</strong> para
                    todos os membros quando houver aniversariantes do dia (nascimento de membros, familiares ou casamento).
                  </p>
                </div>
              </div>
            </div>

            {/* Aniversariantes do Dia */}
            <div className="bg-white text-gray-900 rounded-lg shadow-lg p-4 md:p-6">
              <h2 className="text-base md:text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Cake size={20} className="text-pink-500" />
                Aniversariantes de Hoje
              </h2>

              {loadingAniversarios ? (
                <div className="text-center py-8 text-gray-500">Carregando...</div>
              ) : (
                <>
                  {/* Aniversário de Membros */}
                  {aniversarios.nascimentoMembros.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <Cake size={16} className="text-blue-500" />
                        Aniversário de Irmãos
                      </h3>
                      <div className="space-y-2">
                        {aniversarios.nascimentoMembros.map((m, i) => (
                          <div key={i} className="bg-blue-50 p-3 rounded-lg flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Cake size={20} className="text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{m.nome}</p>
                              <p className="text-xs text-gray-500">Data: {m.data}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Aniversário de Dependentes */}
                  {aniversarios.nascimentoDependentes.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <Gift size={16} className="text-green-500" />
                        Aniversário de Familiares
                      </h3>
                      <div className="space-y-2">
                        {aniversarios.nascimentoDependentes.map((d, i) => (
                          <div key={i} className="bg-green-50 p-3 rounded-lg flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <Gift size={20} className="text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{d.nome}</p>
                              <p className="text-xs text-gray-500">
                                {formatarTipoDependente(d.tipo)} do Ir∴ {d.membroNome}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Aniversário de Casamento */}
                  {aniversarios.casamento.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <Heart size={16} className="text-red-500" />
                        Aniversário de Casamento
                      </h3>
                      <div className="space-y-2">
                        {aniversarios.casamento.map((c, i) => (
                          <div key={i} className="bg-red-50 p-3 rounded-lg flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                              <Heart size={20} className="text-red-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">Ir∴ {c.membroNome} e {c.dependenteNome}</p>
                              <p className="text-xs text-gray-500">Data: {c.data}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nenhum aniversário */}
                  {aniversarios.nascimentoMembros.length === 0 &&
                   aniversarios.nascimentoDependentes.length === 0 &&
                   aniversarios.casamento.length === 0 && (
                    <div className="text-center py-8">
                      <Cake size={48} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500">Nenhum aniversariante hoje</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
