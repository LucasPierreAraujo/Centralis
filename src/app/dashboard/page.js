"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Users, LogOut, BookOpen, DollarSign, ClipboardCheck, CreditCard, TrendingUp, Calendar, Shield, Mail, UserPlus, AlertTriangle, Clock } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalMembros: 0,
    membrosAtivos: 0,
    totalReunioes: 0,
    frequenciaMedia: 0,
    mensalidadesEmDia: 0,
    mensalidadesInadimplentes: 0,
    totalIrmaos: 0
  });
  const [loading, setLoading] = useState(true);
  const [loadingUser, setLoadingUser] = useState(true);
  const [user, setUser] = useState(null);
  const [lojaStatus, setLojaStatus] = useState(null);
  const anoAtual = new Date().getFullYear();

  useEffect(() => {
    carregarUsuario();
    carregarEstatisticas();
    fetch('/api/loja/status', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setLojaStatus(d); })
      .catch(() => {});
  }, []);

  const carregarUsuario = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      router.push('/login');
    } finally {
      setLoadingUser(false);
    }
  };

  const carregarEstatisticas = async () => {
    try {
      // Buscar membros
      const resMembros = await fetch('/api/membros', {
        credentials: 'include'
      });
      const membrosData = await resMembros.json();

      // Garantir que membros é um array
      const membros = Array.isArray(membrosData) ? membrosData : [];

      // Filtrar apenas Aprendiz, Companheiro, Mestre e Mestre Instalado com status ATIVO
      const membrosAtivos = membros.filter(m => {
        const grauUpper = m.grau ? m.grau.toUpperCase() : '';
        return ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'].includes(grauUpper)
          && m.status === 'ATIVO';
      });

      // Buscar reuniões
      const resReunioes = await fetch('/api/reunioes', {
        credentials: 'include'
      });
      const reunioes = await resReunioes.json();

      // Buscar mensalidades
      const resMensalidades = await fetch(`/api/mensalidades?ano=${anoAtual}`, {
        credentials: 'include'
      });
      const mensalidadesData = await resMensalidades.json();
      const pagamentos = mensalidadesData.pagamentos || {};

      // Calcular estatísticas de mensalidades: em dia = sem nenhum 'x', inadimplente = tem ao menos um 'x'
      let totalEmDia = 0;
      let totalInadimplentes = 0;
      const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

      membrosAtivos.forEach(membro => {
        const pagamentosMembro = pagamentos[membro.id] || {};
        const temInadimplencia = meses.some(mes => pagamentosMembro[mes] === 'x');
        if (temInadimplencia) totalInadimplentes++;
        else totalEmDia++;
      });

      // Reuniões filtradas pelo ano atual
      const reunioesAno = Array.isArray(reunioes)
        ? reunioes.filter(r => new Date(r.data).getFullYear() === anoAtual)
        : [];

      // Hierarquia completa de quais graus podem comparecer a cada tipo de sessão
      const hierarquia = {
        'APRENDIZ':      ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'],
        'INICIACAO':     ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'],
        'INSTALACAO':    ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'],
        'A_CAMPO':       ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'],
        'EXTRAORDINARIA':['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'],
        'REGULARIZACAO': ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'],
        'COMPANHEIRO':   ['COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'],
        'ELEVACAO':      ['COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'],
        'MESTRE':        ['MESTRE', 'MESTRE INSTALADO'],
        'PASSAGEM_GRAU': ['MESTRE', 'MESTRE INSTALADO'],
        'FILIACAO':      ['MESTRE', 'MESTRE INSTALADO'],
      };

      // Calcular frequência média com base nas reuniões do ano atual
      let totalPresencas = 0;
      let totalPossivel = 0;

      reunioesAno.forEach(reuniao => {
        const presencasReuniao = reuniao.presencas || {};
        const presentesCount = Object.values(presencasReuniao).filter(p => p).length;

        const grausPermitidos = hierarquia[reuniao.grau] || ['APRENDIZ', 'COMPANHEIRO', 'MESTRE', 'MESTRE INSTALADO'];
        const membrosPermitidos = membrosAtivos.filter(m => grausPermitidos.includes(m.grau));

        totalPresencas += presentesCount;
        totalPossivel += membrosPermitidos.length;
      });

      const frequenciaMedia = totalPossivel > 0 ? ((totalPresencas / totalPossivel) * 100).toFixed(1) : 0;

      setStats({
        totalMembros: membros.length,
        membrosAtivos: membrosAtivos.length,
        totalReunioes: reunioesAno.length,
        frequenciaMedia,
        mensalidadesEmDia: totalEmDia,
        mensalidadesInadimplentes: totalInadimplentes,
        totalIrmaos: membrosAtivos.length
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    router.push('/login');
    router.refresh();
  };

  // Verificar se o usuário tem permissão para acessar um recurso
  const temPermissao = (recurso) => {
    if (!user || !user.role) {
      return false;
    }

    // ADMIN e VENERAVEL tem acesso a tudo
    if (user.role === 'ADMIN' || user.role === 'VENERAVEL') {
      return true;
    }

    // Usar permissões individuais do usuário (do banco)
    const userPermissions = user.permissions || [];

    // Se tem permissões individuais, usar elas
    if (userPermissions.length > 0) {
      return userPermissions.includes(recurso) || userPermissions.includes(`${recurso}:read`);
    }

    // Fallback para permissões por role (compatibilidade com usuários antigos)
    const ROLE_PERMISSIONS = {
      TESOUREIRO: ['recibo', 'financeiro', 'mensalidades', 'membros:read', 'alertas'],
      SECRETARIO: ['membros', 'atas', 'presencas', 'alertas']
    };

    const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
    return rolePermissions.includes(recurso) || rolePermissions.includes(`${recurso}:read`);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-900 text-white p-4 shadow-lg">
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold tracking-wide text-white">Centralis</span>
            {lojaStatus?.nome && (
              <span className="hidden md:block text-blue-300 text-sm font-medium">— {lojaStatus.nome}</span>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="hover:bg-blue-800 active:bg-blue-700 p-3 rounded-lg transition"
            title="Sair"
            aria-label="Sair do sistema"
          >
            <LogOut size={22} />
          </button>
        </div>
      </header>

      {/* Banner de assinatura */}
      {lojaStatus && lojaStatus.status === 'TRIAL' && lojaStatus.horasTrialRestantes !== null && (
        <div className="bg-yellow-50 border-b border-yellow-300 px-4 py-3 flex items-center gap-3 text-yellow-800 text-sm">
          <Clock size={16} className="shrink-0" />
          <span>
            Sua loja está em período de avaliação.{' '}
            <strong>Faltam {Math.ceil(lojaStatus.horasTrialRestantes)}h</strong> para o prazo de ativação pelo administrador.
          </span>
        </div>
      )}
      {lojaStatus && lojaStatus.status === 'ATIVA' && lojaStatus.diasRestantes !== null && lojaStatus.diasRestantes <= 7 && (
        <div className={`border-b px-4 py-3 flex items-center gap-3 text-sm ${lojaStatus.diasRestantes <= 3 ? 'bg-red-50 border-red-300 text-red-800' : 'bg-yellow-50 border-yellow-300 text-yellow-800'}`}>
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            {lojaStatus.diasRestantes === 0
              ? 'Sua assinatura expirou hoje. Entre em contato com o suporte.'
              : <>Faltam <strong>{lojaStatus.diasRestantes} dia{lojaStatus.diasRestantes !== 1 ? 's' : ''}</strong> para expirar sua assinatura ({lojaStatus.plano}). Entre em contato com o suporte para renovar.</>}
          </span>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Container com ordem invertida no mobile */}
        <div className="flex flex-col-reverse md:flex-col gap-8">

          {/* Cards de Estatísticas - Aparecem DEPOIS no mobile, ANTES no desktop */}
          {loading ? (
            <div className="text-center py-8">
              <div className="text-xl text-gray-600">Carregando estatísticas...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total de Membros Ativos */}
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Membros Ativos</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.membrosAtivos}</p>
                    <p className="text-xs text-gray-500 mt-1">Total cadastrados: {stats.totalMembros}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <Users size={28} className="text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Reuniões Realizadas */}
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Reuniões</p>
                    <p className="text-3xl font-bold text-purple-600">{stats.totalReunioes}</p>
                    <p className="text-xs text-gray-500 mt-1">Sessões realizadas</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-full">
                    <Calendar size={28} className="text-purple-600" />
                  </div>
                </div>
              </div>

              {/* Frequência Média */}
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Frequência Média</p>
                    <p className="text-3xl font-bold text-green-600">{stats.frequenciaMedia}%</p>
                    <p className="text-xs text-gray-500 mt-1">Presença nas reuniões</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <TrendingUp size={28} className="text-green-600" />
                  </div>
                </div>
              </div>

              {/* Mensalidades */}
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Mensalidades {anoAtual}</p>
                    <p className="text-3xl font-bold text-green-600">{stats.mensalidadesEmDia}</p>
                    <p className="text-xs text-gray-500 mt-1">Em dia | {stats.mensalidadesInadimplentes} inadimplentes</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-full">
                    <CreditCard size={28} className="text-orange-600" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cards de Navegação - Aparecem PRIMEIRO no mobile, DEPOIS no desktop */}
          {loadingUser ? (
            <div className="text-center py-8">
              <div className="text-xl text-gray-600">Carregando menu...</div>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card Gerar Recibo - TESOUREIRO, ADMIN */}
          {temPermissao('recibo') && (
            <div
              onClick={() => router.push('/recibo')}
              className="bg-white rounded-lg shadow-lg p-6 md:p-8 hover:shadow-xl transition cursor-pointer border-2 border-transparent hover:border-blue-600 active:border-blue-600"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-blue-100 p-4 rounded-full">
                  <FileText size={32} className="text-blue-600" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-800">Gerar Recibo</h3>
              </div>
              <p className="text-gray-600">
                Crie e exporte recibos em PDF para os membros da loja
              </p>
            </div>
          )}

          {/* Card Gerenciar Membros - SECRETARIO, ADMIN */}
          {temPermissao('membros') && (
            <div
              onClick={() => router.push('/membros')}
              className="bg-white rounded-lg shadow-lg p-6 md:p-8 hover:shadow-xl transition cursor-pointer border-2 border-transparent hover:border-green-600 active:border-green-600"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-green-100 p-4 rounded-full">
                  <Users size={32} className="text-green-600" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-800">Gerenciar Membros</h3>
              </div>
              <p className="text-gray-600">
                Adicione, edite ou remova membros do cadastro da loja
              </p>
            </div>
          )}

          {/* Card POP - SECRETARIO, ADMIN */}
          {temPermissao('membros') && (
            <div
              onClick={() => router.push('/pop')}
              className="bg-white rounded-lg shadow-lg p-6 md:p-8 hover:shadow-xl transition cursor-pointer border-2 border-transparent hover:border-purple-600 active:border-purple-600"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-purple-100 p-4 rounded-full">
                  <UserPlus size={32} className="text-purple-600" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-800">POP</h3>
              </div>
              <p className="text-gray-600">
                Candidatos, Promoção e Elevação
              </p>
            </div>
          )}

          {/* Card Financeiro - TESOUREIRO, ADMIN */}
          {temPermissao('financeiro') && (
            <div
              onClick={() => router.push('/financeiro')}
              className="bg-white rounded-lg shadow-lg p-6 md:p-8 hover:shadow-xl transition cursor-pointer border-2 border-transparent hover:border-yellow-600 active:border-yellow-600"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-yellow-100 p-4 rounded-full">
                  <DollarSign size={32} className="text-yellow-600" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-800">Gestão Financeira</h3>
              </div>
              <p className="text-gray-600">
                Controle de mensalidades, receitas e despesas da loja
              </p>
            </div>
          )}

          {/* Card Atas - SECRETARIO, ADMIN */}
          {temPermissao('atas') && (
            <div
              onClick={() => router.push('/atas')}
              className="bg-white rounded-lg shadow-lg p-6 md:p-8 hover:shadow-xl transition cursor-pointer border-2 border-transparent hover:border-purple-600 active:border-purple-600"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-purple-100 p-4 rounded-full">
                  <BookOpen size={32} className="text-purple-600" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-800">Atas de Sessões</h3>
              </div>
              <p className="text-gray-600">
                Gere e gerencie atas das sessões maçônicas da loja
              </p>
            </div>
          )}

          {/* Card Presenças - SECRETARIO, ADMIN */}
          {temPermissao('presencas') && (
            <div
              onClick={() => router.push('/presencas')}
              className="bg-white rounded-lg shadow-lg p-6 md:p-8 hover:shadow-xl transition cursor-pointer border-2 border-transparent hover:border-indigo-600 active:border-indigo-600"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-indigo-100 p-4 rounded-full">
                  <ClipboardCheck size={32} className="text-indigo-600" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-800">Controle de Presenças</h3>
              </div>
              <p className="text-gray-600">
                Registre e gerencie presenças dos membros nas sessões
              </p>
            </div>
          )}

          {/* Card Mensalidades - TESOUREIRO, ADMIN */}
          {temPermissao('mensalidades') && (
            <div
              onClick={() => router.push('/mensalidades')}
              className="bg-white rounded-lg shadow-lg p-6 md:p-8 hover:shadow-xl transition cursor-pointer border-2 border-transparent hover:border-orange-600 active:border-orange-600"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-orange-100 p-4 rounded-full">
                  <CreditCard size={32} className="text-orange-600" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-800">Controle de Mensalidades</h3>
              </div>
              <p className="text-gray-600">
                Gerencie o controle de pagamento de mensalidades dos membros
              </p>
            </div>
          )}

          {/* Card Gerenciar Usuários - ADMIN, VENERAVEL */}
          {(user?.role === 'ADMIN' || user?.role === 'VENERAVEL') && (
            <div
              onClick={() => router.push('/usuarios')}
              className="bg-white rounded-lg shadow-lg p-6 md:p-8 hover:shadow-xl transition cursor-pointer border-2 border-transparent hover:border-red-600 active:border-red-600"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-red-100 p-4 rounded-full">
                  <Shield size={32} className="text-red-600" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-800">Gerenciar Usuários</h3>
              </div>
              <p className="text-gray-600">
                Criar, editar e excluir contas de acesso ao sistema
              </p>
            </div>
          )}

          {/* Card Alertas - SECRETARIO, TESOUREIRO, ADMIN, VENERAVEL */}
          {temPermissao('alertas') && (
            <div
              onClick={() => router.push('/alertas')}
              className="bg-white rounded-lg shadow-lg p-6 md:p-8 hover:shadow-xl transition cursor-pointer border-2 border-transparent hover:border-teal-600 active:border-teal-600"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-teal-100 p-4 rounded-full">
                  <Mail size={32} className="text-teal-600" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-800">Alertas</h3>
              </div>
              <p className="text-gray-600">
                Envie lembretes  por email para os membros e outros
              </p>
            </div>
          )}
          </div>
          )}

          {/* Fecha o container flex-col-reverse */}
        </div>
      </main>
    </div>
  );
}