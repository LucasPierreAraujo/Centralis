"use client"
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Eye, EyeOff, Plus } from 'lucide-react';
import ModalCadastroLoja from '../components/ModalCadastroLoja';

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
