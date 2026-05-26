"use client"
import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Eye, EyeOff, Plus, X, Upload, ChevronLeft, ChevronRight, CheckCircle, Trash2 } from 'lucide-react';
import { RITOS, CARGOS_PADRAO, getTerminologiaPadrao } from '../../lib/rito';

// ─────────────────────────────────────────────────────────────
// Componente principal de Login
// ─────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (data.success) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setError(data.message);
      }
    } catch {
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Sistema de Gestão Maçônica</h1>
          <p className="text-gray-500 text-sm">Faça login para acessar sua loja</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700">Usuário</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:border-blue-600 focus:outline-none"
              placeholder="Digite seu usuário"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:border-blue-600 focus:outline-none pr-12"
                placeholder="Digite sua senha"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:bg-gray-400"
          >
            <LogIn size={20} />
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-200 text-center">
          <p className="text-gray-500 text-sm mb-3">Não tem uma loja cadastrada?</p>
          <button
            onClick={() => setModalAberto(true)}
            className="w-full flex items-center justify-center gap-2 bg-white border-2 border-blue-600 text-blue-600 py-2.5 rounded-lg font-semibold hover:bg-blue-50 transition"
          >
            <Plus size={18} />
            Cadastrar nova loja
          </button>
        </div>
      </div>

      {modalAberto && <ModalCadastroLoja onClose={() => setModalAberto(false)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal multi-step de cadastro de loja
// ─────────────────────────────────────────────────────────────
function ModalCadastroLoja({ onClose }) {
  const [etapa, setEtapa] = useState(1); // 1=dados, 2=rito&cargos, 3=credenciais, 4=validação, 5=sucesso
  const [enviando, setEnviando] = useState(false);
  const [lojaId, setLojaId] = useState('');
  const [mensagemErro, setMensagemErro] = useState('');
  const [codigoDigitado, setCodigoDigitado] = useState('');
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploadandoLogo, setUploadandoLogo] = useState(false);
  const logoInputRef = useRef(null);

  const [form, setForm] = useState({
    nome: '',
    endereco: '',
    oriente: '',
    logoUrl: '',
    emailVeneravel: '',
    rito: 'REAA',
    cargos: [...CARGOS_PADRAO],
    terminologia: getTerminologiaPadrao('REAA'),
    username: '',
    password: '',
    confirmarSenha: '',
    emailRemetente: '',
    emailRemetenteSenha: '',
  });

  const set = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }));

  const handleRitoChange = (novoRito) => {
    setForm(f => ({
      ...f,
      rito: novoRito,
      terminologia: getTerminologiaPadrao(novoRito),
    }));
  };

  const handleCargoChange = (idx, valor) => {
    const novos = [...form.cargos];
    novos[idx] = valor;
    set('cargos', novos);
  };

  const handleCargoAdd = () => set('cargos', [...form.cargos, '']);

  const handleCargoRemove = (idx) => set('cargos', form.cargos.filter((_, i) => i !== idx));

  const handleUploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadandoLogo(true);
    try {
      const reader = new FileReader();
      reader.onload = (ev) => setLogoPreview(ev.target.result);
      reader.readAsDataURL(file);

      const data = new FormData();
      data.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: data });
      const json = await res.json();
      if (json.url) set('logoUrl', json.url);
    } catch {
      setMensagemErro('Erro ao fazer upload da logo.');
    } finally {
      setUploadandoLogo(false);
    }
  };

  const handleEnviarSolicitacao = async () => {
    setMensagemErro('');
    if (!form.nome || !form.emailVeneravel || !form.username || !form.password) {
      setMensagemErro('Preencha todos os campos obrigatórios.');
      return;
    }
    if (form.password !== form.confirmarSenha) {
      setMensagemErro('As senhas não coincidem.');
      return;
    }
    if (form.password.length < 8) {
      setMensagemErro('A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch('/api/lojas/solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome,
          endereco: form.endereco,
          oriente: form.oriente,
          logoUrl: form.logoUrl,
          emailVeneravel: form.emailVeneravel,
          rito: form.rito,
          cargos: form.cargos.filter(c => c.trim()),
          terminologia: form.terminologia,
          username: form.username,
          password: form.password,
          emailRemetente: form.emailRemetente || null,
          emailRemetenteSenha: form.emailRemetenteSenha || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLojaId(data.lojaId);
        setEtapa(3);
      } else {
        setMensagemErro(data.message || 'Erro ao enviar solicitação.');
      }
    } catch {
      setMensagemErro('Erro de conexão. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const handleValidarCodigo = async () => {
    setMensagemErro('');
    if (!codigoDigitado || codigoDigitado.length !== 6) {
      setMensagemErro('Digite o código de 6 dígitos.');
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch('/api/lojas/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lojaId, codigo: codigoDigitado }),
      });
      const data = await res.json();
      if (data.success) {
        setEtapa(5);
      } else {
        setMensagemErro(data.message || 'Código inválido ou expirado.');
      }
    } catch {
      setMensagemErro('Erro de conexão. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-blue-900 rounded-t-xl">
          <h2 className="text-white font-bold text-lg">Cadastrar Nova Loja</h2>
          <button onClick={onClose} className="text-blue-200 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Indicador de etapas */}
        {etapa < 5 && (
          <div className="flex items-center justify-center gap-2 px-6 pt-5">
            {[1, 2, 3, 4].map(n => (
              <React.Fragment key={n}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  etapa > n ? 'bg-green-500 text-white' :
                  etapa === n ? 'bg-blue-600 text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {etapa > n ? <CheckCircle size={14} /> : n}
                </div>
                {n < 4 && <div className={`flex-1 h-1 rounded ${etapa > n ? 'bg-green-400' : 'bg-gray-200'}`} />}
              </React.Fragment>
            ))}
          </div>
        )}
        {etapa < 5 && (
          <p className="text-center text-sm text-gray-500 pt-1 pb-4">
            {etapa === 1 ? 'Dados da Loja' : etapa === 2 ? 'Rito & Cargos' : etapa === 3 ? 'Credenciais' : 'Confirmar Cadastro'}
          </p>
        )}

        <div className="p-6">
          {/* ─── Etapa 1: Dados da Loja ─── */}
          {etapa === 1 && (
            <div className="space-y-4">
              <Campo label="Nome da Loja *" placeholder="Ex: A.R.L.S. Nome da Loja Nº 1234">
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => set('nome', e.target.value)}
                  className="input-campo"
                  placeholder="Ex: A.R.L.S. Nome da Loja Nº 1234"
                />
              </Campo>

              <Campo label="Endereço" placeholder="">
                <input
                  type="text"
                  value={form.endereco}
                  onChange={e => set('endereco', e.target.value)}
                  className="input-campo"
                  placeholder="Rua, nº, bairro, cidade - UF"
                />
              </Campo>

              <Campo label="Oriente" placeholder="">
                <input
                  type="text"
                  value={form.oriente}
                  onChange={e => set('oriente', e.target.value)}
                  className="input-campo"
                  placeholder="Ex: Porto Alegre, RS"
                />
              </Campo>

              <Campo label="Logo da Loja" placeholder="">
                <div className="flex items-center gap-3">
                  {logoPreview && (
                    <img src={logoPreview} alt="Logo" className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
                  )}
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadandoLogo}
                    className="flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-lg px-4 py-2.5 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition text-sm"
                  >
                    <Upload size={16} />
                    {uploadandoLogo ? 'Enviando...' : logoPreview ? 'Trocar logo' : 'Escolher imagem'}
                  </button>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} />
                </div>
              </Campo>

              <Campo label="E-mail do Venerável Mestre *" placeholder="">
                <input
                  type="email"
                  value={form.emailVeneravel}
                  onChange={e => set('emailVeneravel', e.target.value)}
                  className="input-campo"
                  placeholder="email@exemplo.com"
                />
              </Campo>
            </div>
          )}

          {/* ─── Etapa 2: Rito & Cargos ─── */}
          {etapa === 2 && (
            <div className="space-y-5">
              <Campo label="Rito da Loja *" placeholder="">
                <select
                  value={form.rito}
                  onChange={e => handleRitoChange(e.target.value)}
                  className="input-campo"
                >
                  {RITOS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </Campo>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Nomes das Cerimônias</p>
                <p className="text-xs text-gray-500 mb-3">Pré-preenchido conforme o rito selecionado. Edite se necessário.</p>
                <div className="space-y-3">
                  <Campo label="Iniciação (1° Grau)" placeholder="">
                    <input type="text" value={form.terminologia.INICIACAO} onChange={e => set('terminologia', { ...form.terminologia, INICIACAO: e.target.value })} className="input-campo" />
                  </Campo>
                  <Campo label="2° Grau (Companheiro)" placeholder="">
                    <input type="text" value={form.terminologia.PASSAGEM_GRAU} onChange={e => set('terminologia', { ...form.terminologia, PASSAGEM_GRAU: e.target.value })} className="input-campo" />
                  </Campo>
                  <Campo label="3° Grau (Mestre)" placeholder="">
                    <input type="text" value={form.terminologia.ELEVACAO} onChange={e => set('terminologia', { ...form.terminologia, ELEVACAO: e.target.value })} className="input-campo" />
                  </Campo>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">Cargos da Loja</p>
                  <button type="button" onClick={handleCargoAdd} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium">
                    <Plus size={16} /> Adicionar
                  </button>
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {form.cargos.map((cargo, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={cargo}
                        onChange={e => handleCargoChange(idx, e.target.value)}
                        className="input-campo flex-1"
                        placeholder={`Cargo ${idx + 1}`}
                      />
                      <button type="button" onClick={() => handleCargoRemove(idx)} className="text-red-400 hover:text-red-600 p-1 flex-shrink-0">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Etapa 3: Credenciais de Acesso ─── */}
          {etapa === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                Defina o usuário e senha que serão usados para acessar o sistema com esta loja.
              </p>

              <Campo label="Nome de usuário *" placeholder="">
                <input
                  type="text"
                  value={form.username}
                  onChange={e => set('username', e.target.value)}
                  className="input-campo"
                  placeholder="nome.usuario"
                  autoComplete="off"
                />
              </Campo>

              <Campo label="Senha *" placeholder="">
                <PasswordInput
                  value={form.password}
                  onChange={v => set('password', v)}
                  placeholder="Mínimo 8 caracteres"
                />
              </Campo>

              <Campo label="Confirmar Senha *" placeholder="">
                <PasswordInput
                  value={form.confirmarSenha}
                  onChange={v => set('confirmarSenha', v)}
                  placeholder="Repita a senha"
                />
              </Campo>

              <div className="border-t border-gray-200 pt-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800 space-y-1">
                  <p className="font-semibold">E-mail para envio de alertas (opcional)</p>
                  <p>O sistema usará este e-mail para enviar lembretes de reunião aos membros.</p>
                  <p>
                    <span className="font-medium">Atenção:</span> use uma{' '}
                    <strong>senha de app do Gmail</strong>, não a senha normal da conta.
                    Para gerar:{' '}
                    <span className="font-mono text-xs bg-amber-100 px-1 rounded">
                      Conta Google → Segurança → Verificação em duas etapas → Senhas de app
                    </span>
                  </p>
                  <p className="text-xs text-amber-600">Pode ser configurado depois nas configurações da loja.</p>
                </div>

                <div className="space-y-4">
                  <Campo label="E-mail remetente" placeholder="">
                    <input
                      type="email"
                      value={form.emailRemetente}
                      onChange={e => set('emailRemetente', e.target.value)}
                      className="input-campo"
                      placeholder="loja@gmail.com"
                      autoComplete="off"
                    />
                  </Campo>

                  <Campo label="Senha de app do Gmail" placeholder="">
                    <PasswordInput
                      value={form.emailRemetenteSenha}
                      onChange={v => set('emailRemetenteSenha', v)}
                      placeholder="xxxx xxxx xxxx xxxx"
                    />
                  </Campo>
                </div>
              </div>
            </div>
          )}

          {/* ─── Etapa 4: Código de Validação ─── */}
          {etapa === 4 && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-3xl">📧</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Verifique seu e-mail</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Enviamos um código de 6 dígitos para <strong>{form.emailVeneravel}</strong>.<br/>
                  Digite-o abaixo para ativar o cadastro.
                </p>
              </div>

              <input
                type="text"
                maxLength={6}
                value={codigoDigitado}
                onChange={e => setCodigoDigitado(e.target.value.replace(/\D/g, ''))}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-4 text-center text-3xl font-bold tracking-widest text-gray-800 focus:border-blue-600 focus:outline-none"
                placeholder="000000"
              />

              <p className="text-xs text-gray-500">O código expira em 30 minutos.</p>
            </div>
          )}

          {/* ─── Etapa 5: Sucesso ─── */}
          {etapa === 5 && (
            <div className="text-center space-y-4 py-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={40} className="text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Loja ativada!</h3>
              <p className="text-gray-600 text-sm">
                A loja <strong>{form.nome}</strong> foi cadastrada com sucesso.<br/>
                Faça login com o usuário <strong>{form.username}</strong> para acessar.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition"
              >
                Ir para o Login
              </button>
            </div>
          )}

          {/* Mensagem de erro */}
          {mensagemErro && (
            <div className="mt-4 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">
              {mensagemErro}
            </div>
          )}

          {/* Botões de navegação */}
          {etapa < 5 && (
            <div className="flex gap-3 mt-6">
              {etapa > 1 && etapa !== 4 && (
                <button
                  onClick={() => { setMensagemErro(''); setEtapa(e => e - 1); }}
                  className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-300 text-gray-600 py-2.5 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  <ChevronLeft size={18} /> Voltar
                </button>
              )}
              {etapa === 1 && (
                <button
                  onClick={() => { setMensagemErro(''); setEtapa(2); }}
                  disabled={!form.nome || !form.emailVeneravel}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Próximo <ChevronRight size={18} />
                </button>
              )}
              {etapa === 2 && (
                <button
                  onClick={() => { setMensagemErro(''); setEtapa(3); }}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 transition"
                >
                  Próximo <ChevronRight size={18} />
                </button>
              )}
              {etapa === 3 && (
                <button
                  onClick={handleEnviarSolicitacao}
                  disabled={enviando || !form.username || !form.password || !form.confirmarSenha}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {enviando ? 'Enviando...' : 'Enviar código'}
                </button>
              )}
              {etapa === 4 && (
                <button
                  onClick={handleValidarCodigo}
                  disabled={enviando || codigoDigitado.length !== 6}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg font-bold hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {enviando ? 'Validando...' : <><CheckCircle size={18} /> Ativar Loja</>}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Estilos inline para campos */}
      <style jsx global>{`
        .input-campo {
          width: 100%;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          padding: 10px 14px;
          color: #1f2937;
          font-size: 15px;
          outline: none;
          transition: border-color 0.2s;
        }
        .input-campo:focus {
          border-color: #2563eb;
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Componentes auxiliares
// ─────────────────────────────────────────────────────────────
function Campo({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input-campo pr-12"
        placeholder={placeholder}
        autoComplete="new-password"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
