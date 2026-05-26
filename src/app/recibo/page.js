  "use client"
  import React, { useState, useEffect } from 'react';
  import { useRouter } from 'next/navigation';
  import { Download, FileDown, ArrowLeft, Search } from 'lucide-react';
  import html2canvas from 'html2canvas';
  import { jsPDF } from 'jspdf';
  import { useToast } from '../components/Toast';

  // Função para converter números em valor por extenso
  const numeroParaExtenso = (numero) => {
    if (!numero) return "";

    const unidade = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
    const dezena = ["", "dez", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
    const especiais = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
    const centena = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

    const separarMilhares = (num) => {
      const partes = [];
      let n = parseInt(num, 10);
      while (n > 0) {
        partes.unshift(n % 1000);
        n = Math.floor(n / 1000);
      }
      return partes;
    };

    const escreverCentena = (num) => {
      if (num === 100) return "cem";
      let texto = "";
      const c = Math.floor(num / 100);
      const d = Math.floor((num % 100) / 10);
      const u = num % 10;

      if (c) texto += centena[c];
      if (d === 1 && u > 0) {
        texto += (texto ? " e " : "") + especiais[u];
        return texto;
      } else if (d) {
        texto += (texto ? " e " : "") + dezena[d];
      }
      if (u) texto += (texto ? " e " : "") + unidade[u];
      return texto;
    };

    const milhares = separarMilhares(numero);
    const partesExtenso = [];
    const nomeMilhares = ["", "mil", "milhão", "bilhão", "trilhão"];
    const nomeMilharesPlural = ["", "mil", "milhões", "bilhões", "trilhões"];

    milhares.forEach((valor, idx) => {
      if (valor === 0) return;
      const idxNome = milhares.length - idx - 1;
      const texto = escreverCentena(valor);
      partesExtenso.push(
        texto + " " + (valor > 1 && idxNome > 0 ? nomeMilharesPlural[idxNome] : nomeMilhares[idxNome])
      );
    });

    return partesExtenso.join(" e ").trim();
  };

  const ReciboMaconico = () => {
    const router = useRouter();
    const toast = useToast();
    const [valor, setValor] = useState('');
    const [recebemosDe, setRecebemosDe] = useState('');
    const [valorExtenso, setValorExtenso] = useState('');
    const [mesReferente, setMesReferente] = useState('');
    const [taxaDe, setTaxaDe] = useState('');
    const [dataLocal, setDataLocal] = useState('CRATO-CE');
    const [dia, setDia] = useState('');
    const [mes, setMes] = useState('');
    const [ano, setAno] = useState('');
    const [pdfGerado, setPdfGerado] = useState(false);

    // Estados para busca de membros
    const [membros, setMembros] = useState([]);
    const [membrosFiltrados, setMembrosFiltrados] = useState([]);
    const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
    
    // Estado para tesoureiro e venerável mestre
    const [tesoureiro, setTesoureiro] = useState(null);
    const [veneravelMestre, setVeneravelMestre] = useState(null);

    const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const mesesCompletos = [
      'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
      'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
    ];
    const taxas = [
      'AMPM',
      'ELEIÇÃO',
      'ELEVAÇÃO',
      'INICIAÇÃO',
      'INSTALAÇÃO',
      'MENSALIDADE',
      'OUTROS',
      'PROMOÇÃO',
      'QUITE PLACET',
      'REASSUNÇÃO',
      'REGULARIZAÇÃO'
    ];

    // Carrega membros e busca o tesoureiro
    useEffect(() => {
      carregarMembros();
    }, []);

    const carregarMembros = async () => {
      try {
        const response = await fetch('/api/membros');
        const data = await response.json();
        
        // Filtra apenas membros ativos
        const membrosAtivos = data.filter(m => m.status === 'ATIVO');
        setMembros(membrosAtivos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })));
        
        // Busca o tesoureiro (membro com cargo TESOUREIRO)
        const tesoureiroEncontrado = data.find(
          m => m.cargo === 'TESOUREIRO' && m.status === 'ATIVO'
        );
        setTesoureiro(tesoureiroEncontrado);

        // Busca o Venerável Mestre
        const vmEncontrado = data.find(
          m => m.cargo === 'VENERÁVEL MESTRE' && m.status === 'ATIVO'
        );
        setVeneravelMestre(vmEncontrado);
        
      } catch (error) {
        console.error('Erro ao carregar membros:', error);
      }
    };

    // Filtra membros conforme digitação
    const handleRecebemosDeChange = (e) => {
      const valor = e.target.value;
      setRecebemosDe(valor);

      if (valor.length > 0) {
        const filtrados = membros.filter(m =>
          m.nome.toLowerCase().includes(valor.toLowerCase())
        );
        setMembrosFiltrados(filtrados);
        setMostrarSugestoes(true);
      } else {
        setMostrarSugestoes(false);
      }
    };

    // Seleciona membro da lista
    const selecionarMembro = (nome) => {
      setRecebemosDe(nome);
      setMostrarSugestoes(false);
    };

    // Função de formatação de valor monetário
    const formatarValor = (valor) => {
      let v = valor.replace(/\D/g, '');
      v = (v / 100).toFixed(2) + '';
      v = v.replace('.', ',');
      v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
      return v;
    };

    const handleValorChange = (e) => {
      const valorDigitado = e.target.value;
      const numeros = valorDigitado.replace(/\D/g, '');
      if (numeros) {
        setValor(formatarValor(numeros));
      } else {
        setValor('');
      }
    };

    // Atualiza valor por extenso automaticamente
    useEffect(() => {
      if (!valor) {
        setValorExtenso('');
        return;
      }

      const numero = parseFloat(valor.replace(/\./g, '').replace(',', '.'));

      if (!isNaN(numero)) {
        const inteiro = Math.floor(numero);
        const centavos = Math.round((numero - inteiro) * 100);

        let extenso = "";

        if (inteiro > 0) {
          extenso += numeroParaExtenso(inteiro) + (inteiro === 1 ? " REAL" : " REAIS");
        }

        if (centavos > 0) {
          if (inteiro > 0) {
            extenso += " E ";
          }
          extenso += numeroParaExtenso(centavos) + (centavos === 1 ? " CENTAVO" : " CENTAVOS");
        }

        setValorExtenso(extenso.toUpperCase());
      } else {
        setValorExtenso('');
      }
    }, [valor]);

    const gerarPDF = () => setPdfGerado(true);

    const exportarPDF = async () => {
      const recibo = document.getElementById('recibo-content');
      const originalStyle = recibo.style.cssText;
      const originalClassName = recibo.className;
      const DESKTOP_WIDTH = '1024px';

      recibo.style.maxWidth = DESKTOP_WIDTH;
      recibo.style.width = DESKTOP_WIDTH;
      recibo.style.overflowX = 'hidden';
      recibo.classList.remove('p-4', 'overflow-x-auto');
      recibo.classList.add('p-8');

      try {
        const canvas = await html2canvas(recibo, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 1024,
          windowHeight: recibo.scrollHeight
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / imgHeight;
        const pdfWidth = 297;
        const pdfHeight = 210;

        let finalWidth = pdfWidth;
        let finalHeight = pdfWidth / ratio;

        if (finalHeight > pdfHeight) {
          finalHeight = pdfHeight;
          finalWidth = pdfHeight * ratio;
        }

        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });

        const xOffset = (pdfWidth - finalWidth) / 2;
        const yOffset = (pdfHeight - finalHeight) / 2;

        pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
        pdf.save(`recibo_${recebemosDe.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);

      } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        toast.error('Erro ao gerar PDF: ' + error.message);
      } finally {
        recibo.style.cssText = originalStyle;
        recibo.className = originalClassName;
      }
    };

    return (
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-blue-900 text-white p-3 md:p-4 shadow-lg">
          <div className="w-full flex items-center gap-2 md:gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="hover:bg-blue-800 active:bg-blue-700 p-2 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <ArrowLeft size={22} />
            </button>
            <h1 className="text-lg md:text-2xl font-bold">Gerar Recibo</h1>
          </div>
        </header>

        <div className="max-w-4xl mx-auto p-4 md:p-8">
          {/* Formulário */}
          <div className="bg-white p-4 md:p-6 rounded-lg shadow-lg mb-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4 text-black">Preencher Dados do Recibo</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold mb-1 text-black">Valor (R$)</label>
                <input
                  type="text"
                  value={valor}
                  onChange={handleValorChange}
                  className="w-full border-2 border-black rounded px-3 py-2 text-black font-semibold"
                  placeholder="0,00"
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-bold mb-1 text-black">Recebemos de</label>
                <div className="relative">
                  <input
                    type="text"
                    value={recebemosDe}
                    onChange={handleRecebemosDeChange}
                    onFocus={() => recebemosDe.length > 0 && setMostrarSugestoes(true)}
                    className="w-full border-2 border-black rounded px-3 py-2 text-black font-semibold pr-10"
                    placeholder="Digite o nome ou busque"
                  />
                  <Search className="absolute right-3 top-3 text-gray-400" size={20} />
                </div>

                {/* Lista de sugestões */}
                {mostrarSugestoes && membrosFiltrados.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border-2 border-black rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg">
                    {membrosFiltrados.map((membro) => (
                      <div
                        key={membro.id}
                        onClick={() => selecionarMembro(membro.nome)}
                        className="px-4 py-2 hover:bg-blue-100 cursor-pointer text-black border-b last:border-b-0"
                      >
                        <div className="font-semibold">{membro.nome}</div>
                        <div className="text-xs text-gray-600">{membro.grau}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold mb-1 text-black">O valor de (por extenso)</label>
              <input
                type="text"
                value={valorExtenso}
                readOnly
                className="w-full border-2 border-black rounded px-3 py-2 text-black font-semibold bg-gray-100"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold mb-1 text-black">Referente ao mês de</label>
                <select
                  value={mesReferente}
                  onChange={(e) => setMesReferente(e.target.value)}
                  className="w-full border-2 border-black rounded px-3 py-2 text-black font-semibold"
                >
                  <option value="">Selecione</option>
                  {meses.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1 text-black">Ano (referente)</label>
                <input
                  type="text"
                  value={ano}
                  onChange={(e) => setAno(e.target.value)}
                  className="w-full border-2 border-black rounded px-3 py-2 text-black font-semibold"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1 text-black">Taxa de</label>
                <select
                  value={taxaDe}
                  onChange={(e) => setTaxaDe(e.target.value)}
                  className="w-full border-2 border-black rounded px-3 py-2 text-black font-semibold"
                >
                  <option value="">Selecione</option>
                  {taxas.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-bold mb-1 text-black">Local</label>
                <input
                  type="text"
                  value={dataLocal}
                  onChange={(e) => setDataLocal(e.target.value)}
                  className="w-full border-2 border-black rounded px-3 py-2 text-black font-semibold"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1 text-black">Dia</label>
                <select
                  value={dia}
                  onChange={(e) => setDia(e.target.value)}
                  className="w-full border-2 border-black rounded px-3 py-2 text-black font-semibold"
                >
                  <option value="">Selecione</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1 text-black">Mês</label>
                <select
                  value={mes}
                  onChange={(e) => setMes(e.target.value)}
                  className="w-full border-2 border-black rounded px-3 py-2 text-black font-semibold"
                >
                  <option value="">Selecione</option>
                  {mesesCompletos.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1 text-black">Ano</label>
                <input
                  type="text"
                  value={ano}
                  onChange={(e) => setAno(e.target.value)}
                  className="w-full border-2 border-black rounded px-3 py-2 text-black font-semibold"
                />
              </div>
            </div>

            {!pdfGerado && (
              <button
                onClick={gerarPDF}
                className="w-full md:w-auto bg-blue-600 text-white py-3 px-8 rounded-lg font-semibold hover:bg-blue-700 inline-flex items-center justify-center gap-2"
              >
                <Download size={20} />
                Gerar Recibo (Pré-visualizar)
              </button>
            )}
          </div>

          {/* Recibo */}
          <div id="recibo-content" className="bg-white p-4 md:p-8 overflow-x-auto max-w-4xl mx-auto" style={{ maxWidth: '100%' }}>
            <div className="border-4 border-black rounded-lg p-2 md:p-4 mb-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex-1 w-full">
                {/* <div className="text-xs mb-2 text-black">Loja nº:</div> */}
                <div className="text-center font-bold text-xl text-black">
                  A.R.L.S. SABEDORIA DE SALOMÃO Nº 4774
                </div>
              </div>
              <div className="w-10 h-16 md:w-22 md:h-22 flex items-center justify-center">
                <img src="/logo.jpeg" alt="ARLS Sabedoria de Salomão" className="w-full h-full object-contain" />
              </div>
            </div>

            <div className="mb-3">
              <span className="text-sm font-bold text-black">Recebemos de(a):</span>
              <div className="border-2 border-black rounded-lg px-3 py-2 mt-1 text-black break-words">{recebemosDe}</div>
            </div>

            <div className="mb-3">
              <span className="text-sm font-bold text-black">O valor de:</span>
              <div className="border-2 border-black rounded-lg px-3 py-2 mt-1 text-black break-words">{valorExtenso}</div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1 border-2 border-black rounded-lg p-3">
                <div className="mb-2 text-black">
                  <div className="text-xs mb-1 font-bold">Dia:</div>
                  <div className="flex flex-wrap gap-1">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                      <div key={d} className="flex flex-col items-center">
                        <input type="checkbox" checked={parseInt(dia) === d} readOnly className="mb-1" />
                        <span className="text-xs">{d}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-2 text-black">
                  <div className="text-xs mb-1 font-bold">Mês:</div>
                  <div className="flex gap-1 flex-wrap">
                    {meses.map(m => (
                      <div key={m} className="flex flex-col items-center">
                        <input type="checkbox" checked={mesReferente === m} readOnly className="mb-1" />
                        <span className="text-xs">{m}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs mt-2">
                    <span className="font-bold">ANO:</span> {ano}
                  </div>
                </div>

                <div className="text-black">
                  <div className="text-xs font-bold mb-1">Taxa de:</div>
                  <div className="space-y-1 text-xs">
                    {taxas.map(taxa => (
                      <div key={taxa} className="flex items-center gap-2">
                        <input type="checkbox" checked={taxaDe === taxa} readOnly />
                        <span>{taxa}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="w-full md:w-64">
                <div className="text-4xl font-bold mb-2 text-center text-black">RECIBO</div>
                <div className="border-4 border-black rounded-lg p-4 flex items-center justify-between">
                  <span className="text-3xl font-bold text-black">R$</span>
                  <span className="text-2xl font-bold text-black">{valor}</span>
                </div>
              </div>
            </div>

            {/* Footer com Venerável Mestre e Tesoureiro */}
            <div className="flex flex-col gap-4 text-sm pt-6 text-black">
              <div className="flex gap-2 items-center flex-wrap">
                <span>{dataLocal},</span>
                <span className="px-4">{dia}</span>
                <span>de</span>
                <span className="px-4">{mes}</span>
                <span>de</span>
                <span className="px-8">{ano}</span>
              </div>

              <div className="flex flex-col md:flex-row justify-around items-center gap-6 md:gap-4 mt-2">
                {/* Área do Venerável Mestre */}
                <div className="w-full md:w-52 flex flex-col items-center">
                  {veneravelMestre && veneravelMestre.assinaturaUrl ? (
                    <div className="mb-2">
                      <img
                        src={veneravelMestre.assinaturaUrl}
                        alt="Assinatura VM"
                        className="max-h-16 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-16 mb-2 border-b-2 border-black w-48"></div>
                  )}

                  {veneravelMestre ? (
                    <>
                      <div className="text-sm text-center mt-1">Venerável Mestre</div>
                      <div className="font-bold text-center text-sm">{veneravelMestre.nome}</div>
                      <div className="font-bold text-xs text-center">CIM: {veneravelMestre.cim || 'N/A'}</div>
                    </>
                  ) : (
                    <div className="text-center">
                      <div className="text-xs">Venerável Mestre</div>
                    </div>
                  )}
                </div>

                {/* Área do Tesoureiro */}
                <div className="w-full md:w-52 flex flex-col items-center">
                  {tesoureiro && tesoureiro.assinaturaUrl ? (
                    <div className="mb-2">
                      <img
                        src={tesoureiro.assinaturaUrl}
                        alt="Assinatura Tesoureiro"
                        className="max-h-16 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-16 mb-2 border-b-2 border-black w-48"></div>
                  )}

                  {tesoureiro ? (
                    <>
                      <div className="text-sm text-center mt-1">Tesoureiro</div>
                      <div className="font-bold text-center text-sm">{tesoureiro.nome}</div>
                      <div className="font-bold text-xs text-center">CIM: {tesoureiro.cim || 'N/A'}</div>
                    </>
                  ) : (
                    <div className="text-center">
                      <div className="text-xs">Tesoureiro</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {pdfGerado && (
            <div className="mt-6 text-center">
              <button
                onClick={exportarPDF}
                className="w-full md:w-auto bg-green-600 text-white py-3 px-8 rounded-lg font-semibold hover:bg-green-700 inline-flex items-center justify-center gap-2"
              >
                <FileDown size={20} />
                Exportar e Salvar Recibo em PDF
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  export default ReciboMaconico;