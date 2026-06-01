"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, Home } from 'lucide-react';
import SeletorMembroCargo from '../../components/SeletorMembroCargo';
import SeletorMembrosQuadro from '../../components/SeletorMembrosQuadro';
import { useToast } from '../../components/Toast';

export default function NovaAtaPage() {
  const router = useRouter();
  const toast = useToast();
  const [membros, setMembros] = useState([]);
  const [salvando, setSalvando] = useState(false);
  
  // Dados da ata
  const [numeroAta, setNumeroAta] = useState('');
  const [livro, setLivro] = useState('APRENDIZ');
  const [tipoSessao, setTipoSessao] = useState('MAGNA');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [horarioInicio, setHorarioInicio] = useState('19:45');
  const [horarioEncerramento, setHorarioEncerramento] = useState('22:20');
  const [numeroPresentes, setNumeroPresentes] = useState(0);
  const [valorTronco, setValorTronco] = useState('');
  const [local, setLocal] = useState('');
  const [usarAssinaturas, setUsarAssinaturas] = useState(false);

  // Conteúdo
  const [leituraAta, setLeituraAta] = useState('');
  const [expediente, setExpediente] = useState('');
  const [ordemDia, setOrdemDia] = useState('');
  const [coberturasTemplo, setCoberturasTemplo] = useState([]);

  const adicionarCobertura = () =>
    setCoberturasTemplo(prev => [...prev, { tipo: '', membro: '', saida: '', retorno: '' }]);
  const removerCobertura = (idx) =>
    setCoberturasTemplo(prev => prev.filter((_, i) => i !== idx));
  const atualizarCobertura = (idx, campo, valor) =>
    setCoberturasTemplo(prev => prev.map((c, i) => i === idx ? { ...c, [campo]: valor } : c));
  const [palavraBemLoja, setPalavraBemLoja] = useState('');
  
  const CARGOS_PADRAO_ATAS = [
    'Venerável Mestre','1° Vigilante','2° Vigilante','Secretário','Tesoureiro',
    'Orador','1° Diácono','2° Diácono','Preparador','Mestre de Harmonia',
    'Guarda do Templo','Membro do Ministério Público',
  ];

  // Cargos (lista de objetos)
  const [cargos, setCargos] = useState(
    CARGOS_PADRAO_ATAS.map(c => ({ cargo: c, valor: { tipo: 'cadastrado', membroId: '', nomeManual: '' } }))
  );

  // Terminologia das sessões (carregada do config da loja)
  const [terminologia, setTerminologia] = useState({
    INICIACAO: 'Iniciação', PASSAGEM_GRAU: 'Passagem de Grau', ELEVACAO: 'Elevação',
  });

  // Presenças
  const [presencasQuadroIds, setPresencasQuadroIds] = useState([]);
  const [presencasVisitantes, setPresencasVisitantes] = useState([]);

  useEffect(() => {
    carregarMembros();
    carregarConfig();
  }, []);

  const carregarConfig = async () => {
    try {
      const [resCargos, resTermo] = await Promise.all([
        fetch('/api/configuracao-geral?chave=cargos', { credentials: 'include' }),
        fetch('/api/configuracao-geral?chave=terminologia', { credentials: 'include' }),
      ]);
      const { valor: valorCargos } = await resCargos.json();
      const { valor: valorTermo } = await resTermo.json();

      if (valorCargos) {
        const lista = JSON.parse(valorCargos);
        setCargos(lista.map(c => ({ cargo: c, valor: { tipo: 'cadastrado', membroId: '', nomeManual: '' } })));
      }
      if (valorTermo) {
        setTerminologia(JSON.parse(valorTermo));
      }
    } catch {
      // usa defaults
    }
  };

  const carregarMembros = async () => {
    try {
      const response = await fetch('/api/membros');
      const data = await response.json();
      setMembros(data.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })));
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
    }
  };

  // Filtrar membros baseado no livro selecionado
  const membrosFiltrados = membros.filter(membro => {
    const grauMembro = membro.grau.toUpperCase();
    const livroSelecionado = livro.toUpperCase();

    if (livroSelecionado === 'APRENDIZ') {
      return grauMembro === 'APRENDIZ' || grauMembro === 'COMPANHEIRO' || grauMembro === 'MESTRE' || grauMembro === 'MESTRE INSTALADO' || grauMembro === 'FILIADO';
    } else if (livroSelecionado === 'COMPANHEIRO') {
      return grauMembro === 'COMPANHEIRO' || grauMembro === 'MESTRE' || grauMembro === 'MESTRE INSTALADO' || grauMembro === 'FILIADO';
    } else if (livroSelecionado === 'MESTRE') {
      return grauMembro === 'MESTRE' || grauMembro === 'MESTRE INSTALADO' || grauMembro === 'FILIADO';
    }
    return true;
  });

  const adicionarCargo = () => {
    setCargos([...cargos, { 
      cargo: '', 
      valor: { tipo: 'cadastrado', membroId: '', nomeManual: '' } 
    }]);
  };

  const removerCargo = (index) => {
    setCargos(cargos.filter((_, i) => i !== index));
  };

  const atualizarCargo = (index, campo, valor) => {
    const novos = [...cargos];
    novos[index][campo] = valor;
    setCargos(novos);
  };

  const adicionarVisitante = () => {
    setPresencasVisitantes([...presencasVisitantes, '']);
  };

  const removerVisitante = (index) => {
    setPresencasVisitantes(presencasVisitantes.filter((_, i) => i !== index));
  };

  const atualizarVisitante = (index, valor) => {
    const novos = [...presencasVisitantes];
    novos[index] = valor;
    setPresencasVisitantes(novos);
  };

  const formatarValor = (valor) => {
    let v = String(valor).replace(/\D/g, '');
    v = (parseInt(v) / 100).toFixed(2);
    v = v.replace('.', ',');
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    return v === 'NaN' ? '' : v;
  };

  const salvarAta = async () => {
    if (!numeroAta || !data) {
      toast.error('Preencha o número da ata e a data');
      return;
    }

    setSalvando(true);

    try {
      // Preparar cargos
      const cargosFormatados = cargos.map(c => ({
        cargo: c.cargo,
        membroId: c.valor.tipo === 'cadastrado' ? c.valor.membroId : null,
        nomeManual: c.valor.tipo === 'manual' ? c.valor.nomeManual : null
      })).filter(c => c.cargo && (c.membroId || c.nomeManual));

      // Preparar presenças
      const presencasFormatadas = [
        ...presencasQuadroIds.map(membroId => ({
          membroId,
          nomeManual: null,
          tipo: 'QUADRO'
        })),
        ...presencasVisitantes
          .filter(nome => nome.trim() !== '')
          .map(nome => ({
            membroId: null,
            nomeManual: nome.trim(),
            tipo: 'VISITANTE'
          }))
      ];

      const response = await fetch('/api/atas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numeroAta,
          livro,
          tipoSessao,
          data,
          horarioInicio,
          horarioEncerramento,
          numeroPresentes: parseInt(numeroPresentes) || 0,
          valorTronco: parseFloat(valorTronco.replace(/\./g, '').replace(',', '.')) || 0,
          local,
          usarAssinaturas,
          leituraAta,
          expediente,
          ordemDia,
          coberturaTemplo: coberturasTemplo.filter(c => c.tipo).length > 0
            ? JSON.stringify(coberturasTemplo.filter(c => c.tipo))
            : '',
          palavraBemLoja,
          cargos: cargosFormatados,
          presencas: presencasFormatadas
        })
      });

      if (response.ok) {
        toast.success('Ata criada com sucesso!');
        router.push('/atas');
      } else {
        const error = await response.json();
        toast.error(`Erro ao criar ata: ${error.error}`);
      }
    } catch (error) {
      console.error('Erro ao salvar ata:', error);
      toast.error('Erro ao salvar ata');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-900 text-white p-3 md:p-4 shadow-lg">
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => router.push('/dashboard')} className="hover:bg-blue-800 active:bg-blue-700 p-2 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center">
              <Home size={22} />
            </button>
            <button onClick={() => router.push('/atas')} className="hover:bg-blue-800 active:bg-blue-700 p-2 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center">
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-lg md:text-2xl font-bold">Nova Ata</h1>
              <p className="text-xs sm:text-sm text-blue-200 hidden sm:block">Criar nova ata de sessão</p>
            </div>
          </div>
          <button
            onClick={salvarAta}
            disabled={salvando}
            className="flex items-center gap-2 hover:bg-blue-800 border border-blue-700 px-4 py-2 rounded-lg disabled:opacity-50"
          >
            <Save size={20} /> {salvando ? 'Salvando...' : 'Salvar Ata'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Dados Básicos */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Dados Básicos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1 text-gray-700">Número da Ata *</label>
              <input
                type="text"
                value={numeroAta}
                onChange={(e) => setNumeroAta(e.target.value)}
                placeholder="Ex: 33/2025"
                className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-1 text-gray-700">Livro *</label>
              <select
                value={livro}
                onChange={(e) => setLivro(e.target.value)}
                className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
              >
                <option value="APRENDIZ">Aprendiz Maçom</option>
                <option value="COMPANHEIRO">Companheiro Maçom</option>
                <option value="MESTRE">Mestre Maçom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1 text-gray-700">Tipo de Sessão *</label>
              <select
                value={tipoSessao}
                onChange={(e) => setTipoSessao(e.target.value)}
                className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
              >
                <optgroup label="Sessões Magnas">
                  <option value="MAGNA">Magna</option>
                </optgroup>
                <optgroup label="Sessões Especiais">
                  <option value="INICIACAO">{terminologia.INICIACAO}</option>
                  <option value="ELEVACAO">{terminologia.ELEVACAO}</option>
                  <option value="PASSAGEM_GRAU">{terminologia.PASSAGEM_GRAU}</option>
                  <option value="INSTALACAO">Instalação</option>
                </optgroup>
                <optgroup label="Outras Sessões">
                  <option value="A_CAMPO">A Campo</option>
                  <option value="EXTRAORDINARIA">Extraordinária</option>
                  <option value="REGULARIZACAO">Regularização</option>
                  <option value="FILIACAO">Filiação</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1 text-gray-700">Data *</label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-1 text-gray-700">Horário Início</label>
              <input
                type="time"
                value={horarioInicio}
                onChange={(e) => setHorarioInicio(e.target.value)}
                className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-1 text-gray-700">Horário Encerramento</label>
              <input
                type="time"
                value={horarioEncerramento}
                onChange={(e) => setHorarioEncerramento(e.target.value)}
                className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-1 text-gray-700">Nº Presentes</label>
              <input
                type="number"
                value={numeroPresentes}
                onChange={(e) => setNumeroPresentes(e.target.value)}
                className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
                min="0"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-1 text-gray-700">Tronco de Beneficência (R$)</label>
              <input
                type="text"
                value={valorTronco}
                onChange={(e) => setValorTronco(formatarValor(e.target.value))}
                placeholder="0,00"
                className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-1 text-gray-700">Local da Sessão</label>
              <input
                type="text"
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                placeholder="Ex: Rua das Acácias, nº 123, Centro - Cidade, UF"
                className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
              />
            </div>

            <div className="flex items-center gap-3 mt-5">
              <input
                type="checkbox"
                id="usarAssinaturas"
                checked={usarAssinaturas}
                onChange={(e) => setUsarAssinaturas(e.target.checked)}
                className="w-5 h-5 accent-blue-700 cursor-pointer"
              />
              <label htmlFor="usarAssinaturas" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                Usar assinaturas cadastradas na ata
              </label>
            </div>
          </div>
        </div>

        {/* Cargos */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Cargos da Sessão</h2>
            <button
              onClick={adicionarCargo}
              className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            >
              <Plus size={16} /> Adicionar Cargo
            </button>
          </div>
          
          <div className="space-y-4">
            {cargos.map((cargo, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border-2 border-gray-200 rounded">
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">Cargo</label>
                  <div className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900 bg-gray-50">
                    {cargo.cargo}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <SeletorMembroCargo
                        label="Irmão"
                        value={cargo.valor}
                        onChange={(valor) => atualizarCargo(index, 'valor', valor)}
                        membros={membrosFiltrados}
                      />
                    </div>
                    {index >= 12 && ( // Só permite remover cargos extras
                      <button
                        onClick={() => removerCargo(index)}
                        className="self-end p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Remover cargo"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Presenças do Quadro */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Membros do Quadro Presentes</h2>

          <SeletorMembrosQuadro
            membros={membrosFiltrados}
            selecionados={presencasQuadroIds}
            onChange={setPresencasQuadroIds}
          />
        </div>

        {/* Visitantes */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Visitantes</h2>
            <button
              onClick={adicionarVisitante}
              className="flex items-center gap-2 bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
            >
              <Plus size={16} /> Adicionar
            </button>
          </div>

          <div className="space-y-3">
            {presencasVisitantes.map((nome, index) => (
              <div key={index} className="flex gap-2 items-center">
                <div className="flex-1">
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => atualizarVisitante(index, e.target.value)}
                    placeholder="Digite o nome do visitante..."
                    className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
                  />
                </div>
                <button
                  onClick={() => removerVisitante(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                  title="Remover"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
            {presencasVisitantes.length === 0 && (
              <p className="text-gray-500 text-center py-4">Nenhum visitante</p>
            )}
          </div>
        </div>

        {/* Conteúdo da Ata */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Conteúdo da Ata</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1 text-gray-700">Leitura de Ata</label>
              <textarea
                value={leituraAta}
                onChange={(e) => setLeituraAta(e.target.value)}
                placeholder="Ex: Foi feita a leitura da ata de nº 32/2025"
                rows={2}
                spellCheck={true}
                className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1 text-gray-700">Expediente</label>
              <textarea
                value={expediente}
                onChange={(e) => setExpediente(e.target.value)}
                placeholder="Leitura da frequência dos irmãos..."
                rows={3}
                spellCheck={true}
                className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1 text-gray-700">Ordem do Dia</label>
              <textarea
                value={ordemDia}
                onChange={(e) => setOrdemDia(e.target.value)}
                placeholder="Leitura dos trabalhos..."
                rows={5}
                spellCheck={true}
                className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-gray-700">Cobertura do Templo</label>
                <button type="button" onClick={adicionarCobertura}
                  className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded">
                  <Plus size={13} /> Adicionar
                </button>
              </div>
              <datalist id="membros-cobertura-templo">
                {membros.map(m => <option key={m.id} value={m.nome} />)}
              </datalist>
              {coberturasTemplo.length === 0 && (
                <p className="text-xs text-gray-400 italic">Nenhuma cobertura registrada.</p>
              )}
              <div className="space-y-3">
                {coberturasTemplo.map((c, idx) => (
                  <div key={idx} className="border-2 border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="flex gap-2 mb-2">
                      <select value={c.tipo} onChange={(e) => atualizarCobertura(idx, 'tipo', e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm text-gray-900">
                        <option value="">Selecione...</option>
                        <option value="TEMPORARIO">Temporário</option>
                        <option value="PERMANENTE">Permanente</option>
                      </select>
                      <button type="button" onClick={() => removerCobertura(idx)}
                        className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {c.tipo && (
                      <>
                        <input list="membros-cobertura-templo"
                          value={c.membro}
                          onChange={(e) => atualizarCobertura(idx, 'membro', e.target.value)}
                          placeholder="Selecione ou digite o nome do irmão..."
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 mb-2"
                        />
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Saiu às</label>
                            <input type="time" value={c.saida}
                              onChange={(e) => atualizarCobertura(idx, 'saida', e.target.value)}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-900" />
                          </div>
                          {c.tipo === 'TEMPORARIO' && (
                            <div className="flex-1">
                              <label className="block text-xs text-gray-500 mb-1">Retornou às</label>
                              <input type="time" value={c.retorno}
                                onChange={(e) => atualizarCobertura(idx, 'retorno', e.target.value)}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-900" />
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1 text-gray-700">Palavra a Bem da Loja ou da Maçonaria</label>
              <textarea
                value={palavraBemLoja}
                onChange={(e) => setPalavraBemLoja(e.target.value)}
                placeholder="Manifestações dos irmãos..."
                rows={6}
                spellCheck={true}
                className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <button
            onClick={salvarAta}
            disabled={salvando}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg text-lg font-bold disabled:opacity-50"
          >
            <Save size={24} /> {salvando ? 'Salvando...' : 'Salvar Ata'}
          </button>
        </div>
      </main>
    </div>
  );
}