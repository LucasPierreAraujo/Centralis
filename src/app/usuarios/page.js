"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, Edit, Trash2, Save, X, Shield, Key, AlertCircle } from 'lucide-react';
import { useToast } from '../components/Toast';

// Definição das permissões disponíveis por categoria
const PERMISSOES_SECRETARIA = [
  { id: 'membros', label: 'Membros', descricao: 'Gestão de membros' },
  { id: 'atas', label: 'Atas', descricao: 'Atas de sessões' },
  { id: 'presencas', label: 'Presenças', descricao: 'Controle de presenças' }
];

const PERMISSOES_TESOURARIA = [
  { id: 'recibo', label: 'Recibos', descricao: 'Gerar recibos' },
  { id: 'financeiro', label: 'Financeiro', descricao: 'Gestão financeira' },
  { id: 'mensalidades', label: 'Mensalidades', descricao: 'Controle de mensalidades' }
];

const PERMISSOES_GERAIS = [
  { id: 'alertas', label: 'Alertas', descricao: 'Enviar emails e alertas' }
];

export default function UsuariosPage() {
  const router = useRouter();
  const toast = useToast();
  const [usuarios, setUsuarios] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    permissions: [],
    grau: ''
  });
  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);

  useEffect(() => {
    carregarUsuarioAtual();
    carregarUsuarios();
  }, []);

  const carregarUsuarioAtual = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Erro ao carregar usuário atual:', error);
    }
  };

  const carregarUsuarios = async () => {
    try {
      const res = await fetch('/api/usuarios', {
        credentials: 'include'
      });

      if (res.status === 403) {
        toast.error('Você não tem permissão para acessar esta página');
        setTimeout(() => router.push('/dashboard'), 2000);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setUsuarios(data);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: '',
        permissions: user.permissions || [],
        grau: user.grau || ''
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        permissions: [],
        grau: ''
      });
    }
    setError('');
    setShowModal(true);
  };

  const handleOpenPasswordModal = (user) => {
    setEditingUser(user);
    setPasswordData({ password: '', confirmPassword: '' });
    setError('');
    setShowPasswordModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({ username: '', password: '', permissions: [], grau: '' });
    setError('');
  };

  const handleClosePasswordModal = () => {
    setShowPasswordModal(false);
    setEditingUser(null);
    setPasswordData({ password: '', confirmPassword: '' });
    setError('');
  };

  const handlePermissionChange = (permissionId) => {
    setFormData(prev => {
      const newPermissions = prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId];
      return { ...prev, permissions: newPermissions };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.permissions.length === 0) {
      setError('Selecione pelo menos uma permissão');
      return;
    }

    // Se for criação de novo usuário, mostrar confirmação
    if (!editingUser) {
      setPendingFormData(formData);
      setShowModal(false); // Fechar o modal de criação
      setShowCreateConfirm(true);
      return;
    }

    // Se for edição, prosseguir direto
    await submitUser(formData, editingUser);
  };

  const submitUser = async (data, editing) => {
    try {
      const url = '/api/usuarios';
      const method = editing ? 'PUT' : 'POST';
      const body = editing
        ? { id: editing.id, ...data }
        : data;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      const result = await res.json();

      if (res.ok) {
        toast.success(result.message);
        handleCloseModal();
        carregarUsuarios();
      } else {
        setError(result.error || 'Erro ao salvar usuário');
      }
    } catch (err) {
      setError('Erro ao salvar usuário');
      console.error(err);
    }
  };

  const handleConfirmCreate = async () => {
    setShowCreateConfirm(false);
    if (pendingFormData) {
      await submitUser(pendingFormData, null);
      setPendingFormData(null);
    }
  };

  const handleCancelCreate = () => {
    setShowCreateConfirm(false);
    // Voltar para o modal de criação com os dados preenchidos
    if (pendingFormData) {
      setFormData(pendingFormData);
      setShowModal(true);
    }
    setPendingFormData(null);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (passwordData.password !== passwordData.confirmPassword) {
      setError('As senhas não conferem');
      return;
    }

    if (passwordData.password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres');
      return;
    }

    try {
      const res = await fetch('/api/usuarios/senha', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: editingUser.id,
          password: passwordData.password
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Senha alterada com sucesso');
        handleClosePasswordModal();
      } else {
        setError(data.error || 'Erro ao alterar senha');
      }
    } catch (error) {
      setError('Erro ao alterar senha');
      console.error(error);
    }
  };

  const handleDelete = async (id, username) => {
    try {
      const res = await fetch(`/api/usuarios?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message);
        carregarUsuarios();
      } else {
        toast.error(data.error || 'Erro ao excluir usuário');
      }
    } catch (error) {
      toast.error('Erro ao excluir usuário');
      console.error(error);
    } finally {
      setShowDeleteConfirm(null);
    }
  };

  const formatPermissions = (user) => {
    // Se for ADMIN ou VENERAVEL, mostra acesso total
    if (user.role === 'ADMIN' || user.role === 'VENERAVEL') {
      return 'Acesso Total';
    }

    // Se tem permissões personalizadas, mostra elas
    if (user.permissions && user.permissions.length > 0) {
      const labels = {
        membros: 'Membros',
        atas: 'Atas',
        presencas: 'Presenças',
        recibo: 'Recibos',
        financeiro: 'Financeiro',
        mensalidades: 'Mensalidades',
        alertas: 'Alertas'
      };
      return user.permissions.map(p => labels[p] || p).join(', ');
    }

    // Fallback para role antigo
    const roleLabels = {
      TESOUREIRO: 'Recibos, Financeiro, Mensalidades',
      SECRETARIO: 'Membros, Atas, Presenças'
    };
    return roleLabels[user.role] || user.role;
  };

  const getRoleColor = (user) => {
    if (user.role === 'ADMIN' || user.role === 'VENERAVEL') {
      return 'bg-purple-100 text-purple-800';
    }

    // Verifica se tem permissões de secretaria
    const temSecretaria = user.permissions?.some(p => ['membros', 'atas', 'presencas'].includes(p));
    // Verifica se tem permissões de tesouraria
    const temTesouraria = user.permissions?.some(p => ['recibo', 'financeiro', 'mensalidades'].includes(p));

    if (temSecretaria && temTesouraria) {
      return 'bg-green-100 text-green-800';
    } else if (temSecretaria) {
      return 'bg-blue-100 text-blue-800';
    } else if (temTesouraria) {
      return 'bg-yellow-100 text-yellow-800';
    }

    return 'bg-gray-100 text-gray-800';
  };

  // Verifica se o usuário pode ser editado completamente
  // ADMIN pode editar todos, VENERAVEL pode editar todos exceto ADMIN
  const canFullEdit = (user) => {
    // ADMIN pode editar qualquer usuário que não seja outro ADMIN
    if (currentUser?.role === 'ADMIN') {
      return user.role !== 'ADMIN';
    }
    // VENERAVEL pode editar qualquer usuário que não seja ADMIN
    if (currentUser?.role === 'VENERAVEL') {
      return user.role !== 'ADMIN';
    }
    return false;
  };

  // Verifica se é a própria conta (para mostrar botão de alterar senha)
  const isOwnAccount = (user) => {
    return user.username === currentUser?.username;
  };

  // Filtra usuários - Veneravel não vê o Admin
  const getVisibleUsers = () => {
    if (currentUser?.role === 'VENERAVEL') {
      // Veneravel não vê o admin
      return usuarios.filter(u => u.role !== 'ADMIN');
    }
    return usuarios;
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
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="hover:bg-blue-800 active:bg-blue-700 p-2 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <ArrowLeft size={22} />
            </button>
            <h1 className="text-lg md:text-2xl font-bold flex items-center gap-2">
              <Shield size={24} className="hidden sm:block" />
              <span className="hidden sm:inline">Gerenciar Usuários</span>
              <span className="sm:hidden">Usuários</span>
            </h1>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="hover:bg-blue-800 px-4 py-2 rounded-lg flex items-center gap-2 transition border border-white"
          >
            <UserPlus size={20} />
            Novo Usuário
          </button>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Permissões
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Criado em
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {getVisibleUsers().map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.username}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user)}`}>
                        {formatPermissions(user)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {/* Botão editar - para usuários editáveis */}
                        {canFullEdit(user) && (
                          <>
                            <button
                              onClick={() => handleOpenModal(user)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Editar"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(user)}
                              className="text-red-600 hover:text-red-900"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                        {/* Botão alterar senha - para própria conta */}
                        {isOwnAccount(user) && (
                          <button
                            onClick={() => handleOpenPasswordModal(user)}
                            className="text-purple-600 hover:text-purple-900 flex items-center gap-1"
                            title="Alterar Minha Senha"
                          >
                            <Key size={18} />
                          </button>
                        )}
                        {/* Mostra "Protegido" se não pode editar e não é própria conta */}
                        {!canFullEdit(user) && !isOwnAccount(user) && (
                          <span className="text-gray-400 text-xs">Protegido</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {getVisibleUsers().length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Nenhum usuário encontrado
            </div>
          )}
        </div>
      </main>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Confirmar Exclusão</h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir o usuário <strong>"{showDeleteConfirm.username}"</strong>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(showDeleteConfirm.id, showDeleteConfirm.username)}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition"
              >
                Excluir
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Criação de Usuário */}
      {showCreateConfirm && pendingFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-2 rounded-full">
                <AlertCircle size={24} className="text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Confirmar Criação de Usuário</h3>
            </div>
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Você está prestes a criar um novo usuário com os seguintes dados:
              </p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-gray-800">
                  <span className="font-semibold">Nome de usuário:</span> {pendingFormData.username}
                </p>
                <p className="text-gray-800">
                  <span className="font-semibold">Permissões:</span>{' '}
                  {pendingFormData.permissions.map(p => {
                    const labels = {
                      membros: 'Membros',
                      atas: 'Atas',
                      presencas: 'Presenças',
                      recibo: 'Recibos',
                      financeiro: 'Financeiro',
                      mensalidades: 'Mensalidades',
                      alertas: 'Alertas'
                    };
                    return labels[p] || p;
                  }).join(', ')}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmCreate}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Confirmar
              </button>
              <button
                onClick={handleCancelCreate}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criar/Editar Usuário */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl text-gray-900 font-bold mb-4">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome de Usuário
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full border-2 text-gray-900 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Senha {editingUser && '(deixe em branco para não alterar)'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full border-2 text-gray-900 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-600 focus:outline-none"
                    required={!editingUser}
                    minLength={8}
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grau (para visualização de Atas)
                  </label>
                  <select
                    value={formData.grau}
                    onChange={(e) => setFormData({ ...formData, grau: e.target.value })}
                    className="w-full border-2 text-gray-900 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-600 focus:outline-none"
                  >
                    <option value="">Selecione o grau</option>
                    <option value="APRENDIZ">Aprendiz</option>
                    <option value="COMPANHEIRO">Companheiro</option>
                    <option value="MESTRE">Mestre</option>
                    <option value="MESTRE INSTALADO">Mestre Instalado</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Define quais atas o usuário pode visualizar</p>
                </div>

                {/* Permissões da Secretaria */}
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h3 className="font-semibold text-blue-800 mb-3">Secretaria</h3>
                  <div className="space-y-2">
                    {PERMISSOES_SECRETARIA.map((perm) => (
                      <label key={perm.id} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(perm.id)}
                          onChange={() => handlePermissionChange(perm.id)}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div>
                          <span className="font-medium text-gray-800">{perm.label}</span>
                          <span className="text-gray-500 text-sm ml-2">- {perm.descricao}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Permissões da Tesouraria */}
                <div className="border rounded-lg p-4 bg-yellow-50">
                  <h3 className="font-semibold text-yellow-800 mb-3">Tesouraria</h3>
                  <div className="space-y-2">
                    {PERMISSOES_TESOURARIA.map((perm) => (
                      <label key={perm.id} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(perm.id)}
                          onChange={() => handlePermissionChange(perm.id)}
                          className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500"
                        />
                        <div>
                          <span className="font-medium text-gray-800">{perm.label}</span>
                          <span className="text-gray-500 text-sm ml-2">- {perm.descricao}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Permissões Gerais */}
                <div className="border rounded-lg p-4 bg-teal-50">
                  <h3 className="font-semibold text-teal-800 mb-3">Geral</h3>
                  <div className="space-y-2">
                    {PERMISSOES_GERAIS.map((perm) => (
                      <label key={perm.id} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(perm.id)}
                          onChange={() => handlePermissionChange(perm.id)}
                          className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
                        />
                        <div>
                          <span className="font-medium text-gray-800">{perm.label}</span>
                          <span className="text-gray-500 text-sm ml-2">- {perm.descricao}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center gap-2">
                    <AlertCircle size={20} />
                    {error}
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                  >
                    <Save size={20} />
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition flex items-center justify-center gap-2"
                  >
                    <X size={20} />
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alterar Senha (para Veneravel) */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Key size={24} />
                Alterar Senha
              </h2>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    value={passwordData.password}
                    onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-600 focus:outline-none"
                    required
                    minLength={8}
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-600 focus:outline-none"
                    required
                    minLength={8}
                    placeholder="Digite a senha novamente"
                  />
                </div>

                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center gap-2">
                    <AlertCircle size={20} />
                    {error}
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                  >
                    <Save size={20} />
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={handleClosePasswordModal}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition flex items-center justify-center gap-2"
                  >
                    <X size={20} />
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
