"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, LogOut, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, Edit2, X, Save, Shield } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const STATUS_LABEL = {
  PENDENTE:       { label: 'Aguardando código',   cor: 'bg-gray-100 text-gray-600' },
  TRIAL:          { label: 'Trial (48h)',          cor: 'bg-yellow-100 text-yellow-700' },
  TRIAL_EXPIRADO: { label: 'Trial expirado',       cor: 'bg-red-100 text-red-600' },
  ATIVA:          { label: 'Ativa',                cor: 'bg-green-100 text-green-700' },
  EXPIRADA:       { label: 'Expirada',             cor: 'bg-red-100 text-red-600' },
  SUSPENSA:       { label: 'Suspensa',             cor: 'bg-orange-100 text-orange-700' },
};

const PLANO_LABEL = {
  MENSAL:    '30 dias',
  QUINZENAL: '15 dias',
  ANUAL:     '365 dias',
  DEFINITIVO: 'Definitivo',
};

function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// ─────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────
export default function AdminPierre() {
  const [autenticado, setAutenticado] = useState(false);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    fetch('/api/admin/lojas').then(r => {
      if (r.ok) setAutenticado(true);
      setVerificando(false);
    }).catch(() => setVerificando(false));
  }, []);

  if (verificando) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
    </div>
  );

  if (!autenticado) return <TelaLogin onLogin={() => setAutenticado(true)} />;
  return <PainelAdmin onLogout={() => setAutenticado(false)} />;
}

// ─────────────────────────────────────────────────────────────
// Tela de Login
// ─────────────────────────────────────────────────────────────
function TelaLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      const r = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const d = await r.json();
      if (d.success) onLogin();
      else setErro(d.message || 'Credenciais inválidas.');
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-center mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <Shield size={24} className="text-white" />
          </div>
        </div>
        <h1 className="text-white text-xl font-bold text-center mb-1">Painel Admin</h1>
        <p className="text-gray-500 text-sm text-center mb-6">Acesso restrito</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Usuário"
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Senha"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none pr-12"
            />
            <button type="button" onClick={() => setShow(s => !s)}
              className="absolute right-3 top-3 text-gray-500 hover:text-gray-300">
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {erro && <p className="text-red-400 text-sm">{erro}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Painel principal
// ─────────────────────────────────────────────────────────────
function PainelAdmin({ onLogout }) {
  const [lojas, setLojas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('TODOS');
  const [lojaEditando, setLojaEditando] = useState(null);
  const [lojaAtivando, setLojaAtivando] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/lojas');
      if (r.ok) setLojas(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const logout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    onLogout();
  };

  const lojasFiltradas = filtro === 'TODOS' ? lojas : lojas.filter(l => l.statusCalculado === filtro || l.status === filtro);

  const contadores = lojas.reduce((acc, l) => {
    const s = l.statusCalculado || l.status;
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield size={22} className="text-blue-400" />
          <h1 className="text-lg font-bold">Painel Admin — Lojas</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={carregar} className="text-gray-400 hover:text-white transition p-2 rounded-lg hover:bg-gray-800">
            <RefreshCw size={16} />
          </button>
          <button onClick={logout} className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition px-3 py-2 rounded-lg hover:bg-gray-800 text-sm">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { key: 'TODOS',         label: 'Total',          cor: 'border-blue-600',   count: lojas.length },
            { key: 'TRIAL',         label: 'Trial (48h)',     cor: 'border-yellow-500', count: (contadores.TRIAL || 0) },
            { key: 'ATIVA',         label: 'Ativas',          cor: 'border-green-500',  count: (contadores.ATIVA || 0) },
            { key: 'EXPIRADA',      label: 'Expiradas',       cor: 'border-red-500',    count: (contadores.EXPIRADA || 0) + (contadores.TRIAL_EXPIRADO || 0) + (contadores.SUSPENSA || 0) },
          ].map(c => (
            <button key={c.key} onClick={() => setFiltro(c.key)}
              className={`bg-gray-900 border-2 rounded-xl p-4 text-left transition hover:bg-gray-800 ${filtro === c.key ? c.cor : 'border-gray-800'}`}>
              <p className="text-2xl font-bold text-white">{c.count}</p>
              <p className="text-gray-400 text-sm mt-1">{c.label}</p>
            </button>
          ))}
        </div>

        {/* Tabela */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : lojasFiltradas.length === 0 ? (
          <div className="text-center py-16 text-gray-500">Nenhuma loja encontrada.</div>
        ) : (
          <div className="space-y-3">
            {lojasFiltradas.map(loja => (
              <CartaoLoja
                key={loja.id}
                loja={loja}
                onAtualizar={carregar}
                onEditar={() => setLojaEditando(loja)}
                onAtivar={() => setLojaAtivando(loja)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modais */}
      {lojaEditando && (
        <ModalEditar loja={lojaEditando} onClose={() => setLojaEditando(null)} onSalvo={carregar} />
      )}
      {lojaAtivando && (
        <ModalAtivar loja={lojaAtivando} onClose={() => setLojaAtivando(null)} onAtivado={carregar} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Cartão de loja
// ─────────────────────────────────────────────────────────────
function CartaoLoja({ loja, onAtualizar, onEditar, onAtivar }) {
  const [atualizando, setAtualizando] = useState(false);
  const st = STATUS_LABEL[loja.statusCalculado] || STATUS_LABEL[loja.status] || { label: loja.status, cor: 'bg-gray-100 text-gray-600' };

  const acao = async (payload) => {
    setAtualizando(true);
    try {
      const r = await fetch('/api/admin/lojas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: loja.id, ...payload }),
      });
      if (r.ok) onAtualizar();
    } finally {
      setAtualizando(false);
    }
  };

  const horasTrialRestantes = loja.status === 'TRIAL' && loja.trialAtivadoEm
    ? Math.max(0, 48 - (Date.now() - new Date(loja.trialAtivadoEm).getTime()) / (1000 * 60 * 60))
    : null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-white font-semibold truncate">{loja.nome}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cor}`}>{st.label}</span>
            {loja.plano && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900 text-blue-300 font-medium">
                {loja.plano} — {PLANO_LABEL[loja.plano]}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-400 space-y-0.5">
            {loja.oriente && <p>Oriente: {loja.oriente}</p>}
            {loja.endereco && <p>{loja.endereco}</p>}
            <p>Email Venerável: {loja.emailVeneravel}</p>
            <p className="text-gray-600 text-xs">Criada em: {fmt(loja.createdAt)}</p>
          </div>

          {/* Avisos de tempo */}
          {horasTrialRestantes !== null && (
            <div className={`mt-2 flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${horasTrialRestantes > 0 ? 'bg-yellow-900/40 text-yellow-300' : 'bg-red-900/40 text-red-400'}`}>
              <Clock size={14} />
              {horasTrialRestantes > 0
                ? `Trial: ${horasTrialRestantes.toFixed(1)}h restantes para ativar`
                : 'Trial expirado — loja bloqueada'}
            </div>
          )}
          {loja.status === 'ATIVA' && loja.planoExpiraEm && loja.diasRestantes !== null && (
            <div className={`mt-2 flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${loja.diasRestantes > 5 ? 'bg-gray-800 text-gray-400' : loja.diasRestantes > 0 ? 'bg-yellow-900/40 text-yellow-300' : 'bg-red-900/40 text-red-400'}`}>
              <AlertTriangle size={14} />
              {loja.diasRestantes > 0
                ? `Assinatura expira em ${loja.diasRestantes} dia${loja.diasRestantes !== 1 ? 's' : ''} (${fmt(loja.planoExpiraEm)})`
                : 'Assinatura expirada'}
            </div>
          )}
          {loja.status === 'ATIVA' && !loja.planoExpiraEm && loja.plano === 'DEFINITIVO' && (
            <div className="mt-2 flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-green-900/30 text-green-400">
              <CheckCircle size={14} /> Plano definitivo — sem expiração
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex flex-wrap gap-2 items-start">
          <button onClick={onEditar}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 text-xs font-medium transition">
            <Edit2 size={13} /> Editar
          </button>

          {(loja.status === 'TRIAL' || loja.statusCalculado === 'TRIAL_EXPIRADO' || loja.status === 'EXPIRADA' || loja.status === 'PENDENTE') && (
            <button onClick={onAtivar}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-white text-xs font-semibold transition">
              <CheckCircle size={13} /> Ativar
            </button>
          )}

          {loja.status === 'ATIVA' && (
            <button onClick={onAtivar}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-xs font-medium transition">
              <RefreshCw size={13} /> Plano
            </button>
          )}

          {loja.status === 'ATIVA' && (
            <button onClick={() => acao({ acao: 'SUSPENDER' })} disabled={atualizando}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-700 hover:bg-orange-600 text-white text-xs font-medium transition disabled:opacity-50">
              <XCircle size={13} /> Suspender
            </button>
          )}

          {(loja.status === 'SUSPENSA' || loja.status === 'EXPIRADA') && (
            <button onClick={() => acao({ acao: 'REATIVAR' })} disabled={atualizando}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-white text-xs font-medium transition disabled:opacity-50">
              <CheckCircle size={13} /> Reativar
            </button>
          )}
        </div>
      </div>

      {/* Usuários da loja */}
      {loja.users?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <p className="text-xs text-gray-600 mb-1">Usuários cadastrados:</p>
          <div className="flex flex-wrap gap-2">
            {loja.users.map(u => (
              <span key={u.id} className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">
                {u.username} <span className="text-gray-600">({u.role})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal de Ativação / Mudança de Plano
// ─────────────────────────────────────────────────────────────
function ModalAtivar({ loja, onClose, onAtivado }) {
  const [plano, setPlano] = useState('MENSAL');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const jaAtiva = loja.status === 'ATIVA';

  const handleSalvar = async () => {
    setErro('');
    setSalvando(true);
    try {
      const r = await fetch('/api/admin/lojas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: loja.id, acao: jaAtiva ? 'MUDAR_PLANO' : 'ATIVAR', plano }),
      });
      const d = await r.json();
      if (d.success) { onAtivado(); onClose(); }
      else setErro(d.error || 'Erro ao ativar.');
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal titulo={jaAtiva ? 'Mudar Plano' : `Ativar Loja — ${loja.nome}`} onClose={onClose}>
      <p className="text-gray-400 text-sm mb-4">Selecione o plano de assinatura:</p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { val: 'QUINZENAL', label: 'Quinzenal',   sub: '15 dias' },
          { val: 'MENSAL',    label: 'Mensal',       sub: '30 dias' },
          { val: 'ANUAL',     label: 'Anual',        sub: '365 dias' },
          { val: 'DEFINITIVO',label: 'Definitivo',   sub: 'Sem expiração' },
        ].map(p => (
          <button key={p.val} onClick={() => setPlano(p.val)}
            className={`p-3 rounded-xl border-2 text-left transition ${plano === p.val ? 'border-blue-500 bg-blue-900/30' : 'border-gray-700 hover:border-gray-600'}`}>
            <p className="text-white font-semibold text-sm">{p.label}</p>
            <p className="text-gray-400 text-xs mt-0.5">{p.sub}</p>
          </button>
        ))}
      </div>
      {erro && <p className="text-red-400 text-sm mb-3">{erro}</p>}
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition text-sm">Cancelar</button>
        <button onClick={handleSalvar} disabled={salvando}
          className="flex-1 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition text-sm disabled:opacity-50">
          {salvando ? 'Salvando...' : jaAtiva ? 'Salvar Plano' : 'Ativar Loja'}
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal de Edição de dados da loja
// ─────────────────────────────────────────────────────────────
function ModalEditar({ loja, onClose, onSalvo }) {
  const [form, setForm] = useState({
    nome: loja.nome || '',
    endereco: loja.endereco || '',
    oriente: loja.oriente || '',
    emailVeneravel: loja.emailVeneravel || '',
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSalvar = async () => {
    setErro('');
    setSalvando(true);
    try {
      const r = await fetch('/api/admin/lojas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: loja.id, acao: 'EDITAR', ...form }),
      });
      const d = await r.json();
      if (d.success) { onSalvo(); onClose(); }
      else setErro(d.error || 'Erro ao salvar.');
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal titulo={`Editar — ${loja.nome}`} onClose={onClose}>
      <div className="space-y-3 mb-4">
        {[
          { label: 'Nome da Loja', key: 'nome' },
          { label: 'Endereço', key: 'endereco' },
          { label: 'Oriente', key: 'oriente' },
          { label: 'E-mail do Venerável', key: 'emailVeneravel', type: 'email' },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
            <input
              type={f.type || 'text'}
              value={form[f.key]}
              onChange={e => set(f.key, e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        ))}
      </div>
      {erro && <p className="text-red-400 text-sm mb-3">{erro}</p>}
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition text-sm">Cancelar</button>
        <button onClick={handleSalvar} disabled={salvando}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition text-sm disabled:opacity-50">
          <Save size={15} /> {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal base reutilizável
// ─────────────────────────────────────────────────────────────
function Modal({ titulo, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-white font-semibold">{titulo}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
