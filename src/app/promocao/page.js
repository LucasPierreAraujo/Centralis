"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Award, User, ChevronRight, ChevronDown, Check, Trash2, ArrowLeft } from 'lucide-react';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

const ETAPAS = [
  {
    numero: 1,
    titulo: 'Requisitos Mínimos',
    responsavel: 'Garante e Comissão de Passagens de Graus',
    descricao: '• Garante autorizar\n• Estar 100% em dia com a tesouraria\n• 50% de presença no último ano\n• Apresentação de trabalhos\n• Um ano da iniciação ou da promoção',
  },
  {
    numero: 2,
    titulo: 'Sabatina',
    responsavel: 'Venerável Mestre',
    descricao: '• Acertar 70% da Sabatina\n• Escrutínio Secreto dos Companheiros ou Mestres',
    temData: true,
  },
  {
    numero: 3,
    titulo: 'Solicitação do Boleto do GOB CE',
    responsavel: 'Secretário e Tesoureiro',
    descricao: '• Em até 48 horas após a Sabatina\n• Informar possível data da passagem de grau',
  },
  {
    numero: 4,
    titulo: 'Pagamento do Boleto GOB CE',
    responsavel: 'Tesoureiro',
    descricao: '',
  },
  {
    numero: 5,
    titulo: 'Realização da Passagem de Grau',
    responsavel: 'Venerável Mestre e Irmãos Mestres',
    descricao: '',
    temData: true,
  },
  {
    numero: 6,
    titulo: 'Comunicação de Colação de Grau',
    responsavel: 'Secretário',
    descricao: 'Realizar imediatamente após a passagem de grau.',
    temData: true,
  },
  {
    numero: 7,
    titulo: 'Pagamento do Boleto GOB Central',
    responsavel: 'Tesoureiro',
    descricao: '',
  },
];

const STATUS_INFO = {
  EM_ANDAMENTO: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  CONCLUIDO:    { label: 'Concluído',    color: 'bg-green-100 text-green-800 border-green-300' },
  REPROVADO:    { label: 'Reprovado',    color: 'bg-red-100 text-red-800 border-red-300' },
};

export default function PromocaoPage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const scrollPosRef = React.useRef(null);

  const [membros, setMembros] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aberto, setAberto] = useState(null);
  // { [regId]: { [etapaNum]: date } } — para etapas com temData: true
  const [datasEtapas, setDatasEtapas] = useState({});

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
      const [resMembros, resRegistros] = await Promise.all([
        fetch('/api/membros'),
        fetch('/api/promocao'),
      ]);
      const dataMembros = await resMembros.json();
      const dataRegistros = await resRegistros.json();
      setMembros(Array.isArray(dataMembros) ? dataMembros.filter(m => m.status === 'ATIVO') : []);
      setRegistros(Array.isArray(dataRegistros) ? dataRegistros : []);
    } catch {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const iniciarProcesso = async (membroId, tipo) => {
    try {
      const res = await fetch('/api/promocao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membroId, tipo }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success('Processo iniciado!');
      scrollPosRef.current = window.scrollY;
      carregarDados();
      setAberto(data.registro.id);
    } catch { toast.error('Erro ao iniciar processo'); }
  };

  const concluirEtapa = async (registro, numeroEtapa) => {
    const etapas = typeof registro.etapas === 'object' && registro.etapas !== null ? { ...registro.etapas } : {};
    const key = String(numeroEtapa);
    const jaConcluida = etapas[key]?.concluida;
    const etapaConfig = ETAPAS.find(e => e.numero === numeroEtapa);
    const dataEtapa = etapaConfig?.temData
      ? (datasEtapas[registro.id]?.[key] || new Date().toISOString().split('T')[0])
      : new Date().toISOString().split('T')[0];
    etapas[key] = jaConcluida
      ? { concluida: false, data: null }
      : { concluida: true, data: dataEtapa };

    const todasConcluidas = ETAPAS.every(e => etapas[String(e.numero)]?.concluida);
    const novoStatus = todasConcluidas ? 'CONCLUIDO' : registro.status === 'CONCLUIDO' ? 'EM_ANDAMENTO' : registro.status;

    // Ao concluir etapa 6 (Comunicação), promover grau do membro
    const devePromover = !jaConcluida && numeroEtapa === 6 && registro.status !== 'CONCLUIDO';

    try {
      await fetch('/api/promocao', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: registro.id, etapas, status: novoStatus }),
      });

      if (devePromover) {
        const dataPassagem = etapas['5']?.data || new Date().toISOString().split('T')[0];
        const resPromover = await fetch('/api/promocao/concluir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ registroId: registro.id, dataPassagem }),
        });
        const dataPromover = await resPromover.json();
        if (dataPromover.success) {
          toast.success(`Membro promovido a ${dataPromover.novoGrau}! Grau e data atualizados.`);
        } else {
          toast.error('Erro ao promover membro: ' + (dataPromover.error || 'Erro desconhecido'));
        }
      } else if (!jaConcluida) {
        toast.success(`Etapa ${numeroEtapa} concluída!`);
      }

      scrollPosRef.current = window.scrollY;
      carregarDados();
    } catch { toast.error('Erro ao atualizar etapa'); }
  };

  const alterarStatus = async (registro, novoStatus) => {
    try {
      await fetch('/api/promocao', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: registro.id, status: novoStatus }),
      });
      toast.success('Status atualizado');
      scrollPosRef.current = window.scrollY;
      carregarDados();
    } catch { toast.error('Erro ao alterar status'); }
  };

  const excluir = async (id) => {
    const ok = await confirm.confirm({
      title: 'Remover processo',
      message: 'Deseja remover este processo? O progresso será perdido.',
      confirmText: 'Remover', cancelText: 'Cancelar', type: 'danger',
    });
    if (!ok) return;
    try {
      await fetch('/api/promocao', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      toast.success('Processo removido');
      if (aberto === id) setAberto(null);
      carregarDados();
    } catch { toast.error('Erro ao remover'); }
  };

  const aprendizes = membros.filter(m => m.grau?.toUpperCase() === 'APRENDIZ');
  const companheiros = membros.filter(m => m.grau?.toUpperCase() === 'COMPANHEIRO');

  const registroDoMembro = (membroId, tipo) =>
    registros.find(r => r.membroId === membroId && r.tipo === tipo);

  const renderSecao = (titulo, cor, membrosLista, tipo) => {
    if (membrosLista.length === 0) return null;
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className={`px-4 py-3 flex items-center gap-2 border-b ${cor.header}`}>
          <Award size={18} className={cor.icon} />
          <h2 className={`font-bold text-sm ${cor.title}`}>{titulo}</h2>
          <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${cor.badge}`}>{membrosLista.length}</span>
        </div>
        <div className="divide-y divide-gray-100">
          {membrosLista.map(membro => {
            const reg = registroDoMembro(membro.id, tipo);
            const estaAberto = aberto === (reg?.id || `novo-${membro.id}`);
            const etapasObj = reg && typeof reg.etapas === 'object' && reg.etapas !== null ? reg.etapas : {};
            const concluidas = Object.values(etapasObj).filter(e => e?.concluida).length;
            const statusInfo = reg ? (STATUS_INFO[reg.status] || STATUS_INFO.EM_ANDAMENTO) : null;

            return (
              <div key={membro.id}>
                {/* Linha do membro */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 active:bg-gray-50 select-none"
                  onClick={() => setAberto(estaAberto ? null : (reg?.id || `novo-${membro.id}`))}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${cor.avatar}`}>
                    <User size={16} className={cor.icon} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-800 text-sm truncate">{membro.nome}</p>
                      {statusInfo && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      )}
                    </div>
                    {reg && (
                      <div className="flex gap-0.5 mt-1">
                        {ETAPAS.map(e => {
                          const conc = etapasObj[String(e.numero)]?.concluida;
                          return <div key={e.numero} className={`h-1.5 flex-1 rounded-sm ${conc ? 'bg-green-500' : 'bg-gray-200'}`} />;
                        })}
                      </div>
                    )}
                    {reg && <p className="text-xs text-gray-400 mt-0.5">{concluidas}/{ETAPAS.length} etapas</p>}
                    {!reg && <p className="text-xs text-gray-400">Processo não iniciado</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {reg && (
                      <button
                        onClick={e => { e.stopPropagation(); excluir(reg.id); }}
                        className="min-w-[40px] min-h-[40px] flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    {estaAberto ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                  </div>
                </div>

                {/* Painel expandido */}
                {estaAberto && (
                  <div className="bg-gray-50 border-t border-gray-100 px-4 py-4 space-y-3">
                    {!reg ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500 mb-3">Nenhum processo iniciado para este membro.</p>
                        <button
                          onClick={() => iniciarProcesso(membro.id, tipo)}
                          className={`px-5 py-2.5 rounded-lg text-sm font-semibold text-white ${cor.btn}`}
                        >
                          Iniciar Processo
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Botões de status */}
                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Alterar Status</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(STATUS_INFO).map(([key, info]) => (
                              <button
                                key={key}
                                onClick={() => alterarStatus(reg, key)}
                                className={`text-xs px-3 py-2 rounded-full border font-semibold transition min-h-[36px] ${reg.status === key ? info.color : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-100'}`}
                              >
                                {info.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Etapas */}
                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Etapas</p>
                          <div className="space-y-2">
                            {ETAPAS.map(etapa => {
                              const etapaData = etapasObj[String(etapa.numero)];
                              const concluida = etapaData?.concluida === true;
                              return (
                                <div key={etapa.numero} className={`rounded-lg border p-3 ${concluida ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                                  <div className="flex items-start gap-3">
                                    <button
                                      onClick={() => concluirEtapa(reg, etapa.numero)}
                                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition active:scale-95 ${
                                        concluida ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-400 bg-white active:bg-gray-50'
                                      }`}
                                    >
                                      {concluida ? <Check size={18} /> : <span className="text-sm font-bold">{etapa.numero}</span>}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className={`font-semibold text-sm ${concluida ? 'text-green-700 line-through' : 'text-gray-700'}`}>
                                          {etapa.titulo}
                                        </span>
                                        {concluida && etapaData?.data && (
                                          <span className="text-xs text-green-600 font-medium">{etapaData.data.split('-').reverse().join('/')}</span>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-500 mb-1">
                                        <span className="font-semibold">Responsável:</span> {etapa.responsavel}
                                      </p>
                                      {etapa.descricao && <p className="text-xs text-gray-600 whitespace-pre-line">{etapa.descricao}</p>}

                                      {etapa.temData && (
                                        <div className="mt-2">
                                          <label className="block text-xs font-bold text-gray-600 mb-1">
                                            {etapa.numero === 2 ? 'Data da Sabatina' : etapa.numero === 5 ? 'Data da Passagem de Grau' : 'Data da Comunicação'}
                                          </label>
                                          <input
                                            type="date"
                                            value={concluida ? (etapaData?.data || '') : (datasEtapas[reg.id]?.[String(etapa.numero)] || '')}
                                            onChange={e => setDatasEtapas(prev => ({ ...prev, [reg.id]: { ...prev[reg.id], [String(etapa.numero)]: e.target.value } }))}
                                            disabled={concluida}
                                            className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500 w-full sm:w-auto"
                                          />
                                          {concluida && etapaData?.data && (
                                            <p className="text-xs text-green-600 mt-1">
                                              Realizada em: {etapaData.data.split('-').reverse().join('/')}
                                            </p>
                                          )}
                                        </div>
                                      )}

                                      <button
                                        onClick={() => concluirEtapa(reg, etapa.numero)}
                                        className={`mt-2 text-xs px-3 py-1.5 rounded-lg font-semibold transition min-h-[36px] ${
                                          concluida ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-blue-600 text-white active:bg-blue-700'
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
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-900 text-white p-3 md:p-4 shadow-lg">
        <div className="w-full flex items-center gap-1 md:gap-3">
          <button
            onClick={() => router.push('/pop')}
            className="hover:bg-blue-800 p-2 rounded-lg transition min-w-[40px] min-h-[40px] flex items-center justify-center flex-shrink-0"
            title="Voltar ao POP"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="hover:bg-blue-800 p-2 rounded-lg transition min-w-[40px] min-h-[40px] flex items-center justify-center flex-shrink-0"
            title="Início"
          >
            <Home size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-2xl font-bold leading-tight">Promoção / Elevação</h1>
            <p className="text-xs text-blue-200 hidden sm:block">Passagem de Grau</p>
          </div>
        </div>
      </header>

      <div className="p-3 md:p-4 max-w-3xl mx-auto space-y-4">
        {loading ? (
          <div className="text-center py-12 text-gray-500 font-semibold">Carregando...</div>
        ) : (
          <>
            {renderSecao(
              'Promoção — Aprendiz → Companheiro',
              {
                header: 'bg-blue-50 border-blue-200',
                icon: 'text-blue-600',
                title: 'text-blue-800',
                badge: 'bg-blue-100 text-blue-700',
                avatar: 'bg-blue-100',
                btn: 'bg-blue-600 hover:bg-blue-700',
              },
              aprendizes,
              'PROMOCAO'
            )}
            {renderSecao(
              'Elevação — Companheiro → Mestre',
              {
                header: 'bg-purple-50 border-purple-200',
                icon: 'text-purple-600',
                title: 'text-purple-800',
                badge: 'bg-purple-100 text-purple-700',
                avatar: 'bg-purple-100',
                btn: 'bg-purple-600 hover:bg-purple-700',
              },
              companheiros,
              'ELEVACAO'
            )}
            {aprendizes.length === 0 && companheiros.length === 0 && (
              <div className="text-center py-16 bg-white rounded-lg shadow">
                <Award size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-lg font-semibold">Nenhum membro elegível</p>
                <p className="text-gray-400 text-sm mt-1">Não há Aprendizes ou Companheiros ativos</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
