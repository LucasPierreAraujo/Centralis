"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Calendar, Trash2, Edit, ArrowLeft, Eye } from 'lucide-react';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

export default function AtasPage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [atas, setAtas] = useState([]);
  const [atasFiltradas, setAtasFiltradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    carregarUsuario();
    carregarAtas();
  }, []);

  // Filtrar atas quando usuário ou atas mudarem
  useEffect(() => {
    if (currentUser && atas.length > 0) {
      filtrarAtasPorGrau();
    } else if (atas.length > 0 && !currentUser) {
      setAtasFiltradas(atas);
    }
  }, [currentUser, atas]);

  const carregarUsuario = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      router.push('/login');
    }
  };

  const filtrarAtasPorGrau = () => {
    // Admin, Veneravel e Secretario veem todas as atas
    // Também quem tem permissão 'atas' vê todas
    const temPermissaoTotal =
      currentUser.role === 'ADMIN' ||
      currentUser.role === 'VENERAVEL' ||
      currentUser.role === 'SECRETARIO' ||
      (currentUser.permissions && currentUser.permissions.includes('atas'));

    if (temPermissaoTotal) {
      setAtasFiltradas(atas);
      return;
    }

    // Se não tem grau definido e não tem permissão total, não vê nenhuma ata
    if (!currentUser.grau) {
      setAtasFiltradas([]);
      return;
    }

    // Filtrar baseado no grau do usuário
    const grauUsuario = currentUser.grau;
    let livrosPermitidos = [];

    if (grauUsuario === 'APRENDIZ') {
      livrosPermitidos = ['APRENDIZ'];
    } else if (grauUsuario === 'COMPANHEIRO') {
      livrosPermitidos = ['APRENDIZ', 'COMPANHEIRO'];
    } else if (grauUsuario === 'MESTRE' || grauUsuario === 'MESTRE INSTALADO' || grauUsuario === 'FILIADO') {
      livrosPermitidos = ['APRENDIZ', 'COMPANHEIRO', 'MESTRE'];
    }

    const filtradas = atas.filter(ata => livrosPermitidos.includes(ata.livro));
    setAtasFiltradas(filtradas);
  };

  const carregarAtas = async () => {
    try {
      const response = await fetch('/api/atas');
      const data = await response.json();

      // Verificar se data é um array
      if (Array.isArray(data)) {
        setAtas(data);
      } else {
        console.error('API retornou dados inválidos:', data);
        setAtas([]);
      }
    } catch (error) {
      console.error('Erro ao carregar atas:', error);
      setAtas([]);
    } finally {
      setLoading(false);
    }
  };

  const excluirAta = async (id) => {
    const ata = atas.find(a => a.id === id);
    const confirmed = await confirm.confirm({
      title: 'Excluir Ata',
      message: `Deseja realmente excluir a ata "${ata?.numero}/${ata?.ano}"? Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/atas/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Ata excluída com sucesso!');
        carregarAtas();
      } else {
        toast.error('Erro ao excluir ata');
      }
    } catch (error) {
      console.error('Erro ao excluir ata:', error);
      toast.error('Erro ao excluir ata');
    }
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
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => router.push('/dashboard')} className="hover:bg-blue-800 active:bg-blue-700 p-2 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center">
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-lg md:text-2xl font-bold">Atas de Sessões</h1>
              <p className="text-xs sm:text-sm text-blue-200 hidden sm:block">Gerenciar atas maçônicas</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/atas/nova')}
            className="flex items-center gap-2 hover:bg-blue-800 border border-blue-700 px-4 py-2 rounded-lg"
          >
            <Plus size={20} /> Nova Ata
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-200 sticky top-0 z-20">
                <tr>
                  <th className="px-6 py-3 text-left font-bold text-gray-700">Nº Ata</th>
                  <th className="px-6 py-3 text-left font-bold text-gray-700">Livro</th>
                  <th className="px-6 py-3 text-left font-bold text-gray-700">Data</th>
                  <th className="px-6 py-3 text-center font-bold text-gray-700">Presentes</th>
                  <th className="px-6 py-3 text-right font-bold text-gray-700">Tronco</th>
                  <th className="px-6 py-3 text-center font-bold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {atasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <FileText size={48} className="mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-semibold">{currentUser?.grau ? 'Nenhuma ata disponível para seu grau' : 'Nenhuma ata cadastrada'}</p>
                      <p className="text-sm">{currentUser?.grau ? 'Você só pode visualizar atas do seu grau ou inferior' : 'Clique em "Nova Ata" para criar a primeira ata'}</p>
                    </td>
                  </tr>
                ) : (
                  atasFiltradas.map((ata) => (
                    <tr key={ata.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-800 font-bold">
                        <div className="flex items-center gap-2">
                          <FileText size={20} className="text-blue-600" />
                          {ata.numeroAta}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-800">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          ata.livro === 'APRENDIZ' ? 'bg-blue-100 text-blue-800' :
                          ata.livro === 'COMPANHEIRO' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {ata.livro}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-800">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-gray-400" />
                          {new Date(ata.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-800">
                        {ata.numeroPresentes}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-800 font-semibold">
                        R$ {Number(ata.valorTronco).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => router.push(`/atas/${ata.id}/visualizar`)}
                            className="p-3 text-purple-600 hover:bg-purple-50 rounded"
                            title="Visualizar"
                          >
                            <Eye size={20} />
                          </button>
                          <button
                            onClick={() => router.push(`/atas/${ata.id}/editar`)}
                            className="p-3 text-blue-600 hover:bg-blue-50 rounded"
                            title="Editar"
                          >
                            <Edit size={20} />
                          </button>
                          <button
                            onClick={() => excluirAta(ata.id)}
                            className="p-3 text-red-600 hover:bg-red-50 rounded"
                            title="Excluir"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Estatísticas */}
        {atasFiltradas.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600 mb-1">Total de Atas</div>
              <div className="text-3xl font-bold text-blue-600">{atasFiltradas.length}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600 mb-1">Aprendiz</div>
              <div className="text-3xl font-bold text-blue-600">
                {atasFiltradas.filter(a => a.livro === 'APRENDIZ').length}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600 mb-1">Companheiro</div>
              <div className="text-3xl font-bold text-green-600">
                {atasFiltradas.filter(a => a.livro === 'COMPANHEIRO').length}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600 mb-1">Mestre</div>
              <div className="text-3xl font-bold text-purple-600">
                {atasFiltradas.filter(a => a.livro === 'MESTRE').length}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}