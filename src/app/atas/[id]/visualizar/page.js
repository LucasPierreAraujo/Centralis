"use client"
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Home } from 'lucide-react';
import jsPDF from 'jspdf';
import { useToast } from '../../../components/Toast';
import Breadcrumbs from '../../../components/Breadcrumbs';

// Ordem correta dos cargos para exibição
const ORDEM_CARGOS = [
  'Venerável Mestre',
  '1° Vigilante',
  '2° Vigilante',
  'Secretário',
  'Tesoureiro',
  '1° Diácono',
  '2° Diácono',
  'Mestre de Harmonia',
  'Guarda do Templo',
  'Orador',
  'Membro do Ministério Público',
  'Preparador'
];

// Função para ordenar cargos na ordem correta
const ordenarCargos = (cargos) => {
  return [...cargos].sort((a, b) => {
    const indexA = ORDEM_CARGOS.indexOf(a.cargo);
    const indexB = ORDEM_CARGOS.indexOf(b.cargo);

    // Se o cargo não estiver na lista, coloca no final
    const posA = indexA === -1 ? ORDEM_CARGOS.length : indexA;
    const posB = indexB === -1 ? ORDEM_CARGOS.length : indexB;

    return posA - posB;
  });
};

// Função para ordenar lista de cargos (strings) de um membro
const ordenarListaCargos = (listaCargos) => {
  return [...listaCargos].sort((a, b) => {
    const indexA = ORDEM_CARGOS.indexOf(a);
    const indexB = ORDEM_CARGOS.indexOf(b);

    // Se o cargo não estiver na lista, coloca no final
    const posA = indexA === -1 ? ORDEM_CARGOS.length : indexA;
    const posB = indexB === -1 ? ORDEM_CARGOS.length : indexB;

    return posA - posB;
  });
};

export default function VisualizarAtaPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const [ata, setAta] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [configLoja, setConfigLoja] = useState({ nome: '', oriente: '', endereco: '' });

  useEffect(() => {
    if (params.id) {
      carregarAta();
      carregarConfigLoja();
    }
  }, [params.id]);

  const carregarConfigLoja = async () => {
    try {
      const [rNome, rOriente, rEndereco] = await Promise.all([
        fetch('/api/configuracao-geral?chave=nome_loja', { credentials: 'include' }),
        fetch('/api/configuracao-geral?chave=oriente', { credentials: 'include' }),
        fetch('/api/configuracao-geral?chave=endereco', { credentials: 'include' }),
      ]);
      const [dNome, dOriente, dEndereco] = await Promise.all([rNome.json(), rOriente.json(), rEndereco.json()]);
      setConfigLoja({
        nome: dNome.valor || '',
        oriente: dOriente.valor || '',
        endereco: dEndereco.valor || '',
      });
    } catch { /* usa valores em branco se falhar */ }
  };

  const carregarAta = async () => {
    try {
      const response = await fetch(`/api/atas/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setAta(data);
      } else {
        toast.error('Ata não encontrada');
        router.push('/atas');
      }
    } catch (error) {
      console.error('Erro ao carregar ata:', error);
      toast.error('Erro ao carregar ata');
      router.push('/atas');
    }
  };

  const gerarPDF = async () => {
    setGerando(true);
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const maxWidth = pageWidth - (2 * margin);
      const headerHeight = 35; // Altura do cabeçalho
      let yPosition = margin;
      let logoGobImg, logoImg;

      // Carregar logos uma vez
      try {
        logoGobImg = await fetch('/logo-gob.jpeg').then(r => r.blob()).then(b => new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(b);
        }));

        logoImg = await fetch('/logo.jpeg').then(r => r.blob()).then(b => new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(b);
        }));
      } catch (error) {
        console.error('Erro ao carregar logos:', error);
      }

      // Função para adicionar cabeçalho em cada página
      const addHeader = () => {
        const startY = margin;

        // Logos
        if (logoGobImg && logoImg) {
          pdf.addImage(logoGobImg, 'JPEG', margin, startY, 25, 25);
          pdf.addImage(logoImg, 'JPEG', pageWidth - margin - 25, startY, 25, 25);
        }

        // Texto do cabeçalho
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        let headerTextY = startY + 3;

        pdf.text(configLoja.nome || 'Loja Maçônica', pageWidth / 2, headerTextY, { align: 'center' });
        headerTextY += 5;

        if (configLoja.endereco) {
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          pdf.text(configLoja.endereco, pageWidth / 2, headerTextY, { align: 'center' });
          headerTextY += 4;
        }

        pdf.setFont('helvetica', 'bold');
        if (configLoja.oriente) {
          pdf.text(configLoja.oriente, pageWidth / 2, headerTextY, { align: 'center' });
        }

        return margin + headerHeight;
      };

      // Adicionar cabeçalho na primeira página
      yPosition = addHeader();

      // Títulos
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('GRANDE ORIENTE DO BRASIL', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 6;

      pdf.setFontSize(10);
      pdf.text(configLoja.oriente ? `ORIENTE DE ${configLoja.oriente.toUpperCase()}` : 'GRANDE ORIENTE DO BRASIL', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;

      pdf.text(`LIVRO DO ${ata.livro} MAÇOM`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 7;

      pdf.text(`ATA ${ata.numeroAta}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;

      // Linha horizontal
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;

      // Mapeamento de tipos de sessão para exibição no PDF
      const tiposSessaoPDF = {
        'MAGNA': 'Magna',
        'ORDINARIA': 'Magna', // Retrocompatibilidade
        'INICIACAO': 'Iniciação',
        'ELEVACAO': 'Elevação',
        'PASSAGEM_GRAU': 'Promoção',
        'INSTALACAO': 'Instalação',
        'A_CAMPO': 'A Campo',
        'EXTRAORDINARIA': 'Extraordinária',
        'REGULARIZACAO': 'Regularização',
        'FILIACAO': 'Filiação'
      };

      const tipoSessaoLabelPDF = (ata.tipoSessao && ata.tipoSessao !== 'MAGNA' && ata.tipoSessao !== 'ORDINARIA')
        ? (tiposSessaoPDF[ata.tipoSessao] || ata.tipoSessao)
        : ata.livro;

      pdf.text(`ATA SESSÃO MAGNA DE ${tipoSessaoLabelPDF.toUpperCase()}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 12;

      // Construir o texto completo da ata
      const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

      const dataAta = new Date(ata.data);
      const dia = dataAta.getDate();
      const mes = meses[dataAta.getMonth()];
      const ano = dataAta.getFullYear();

      const numerosExtenso = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
        'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove', 'vinte',
        'vinte e um', 'vinte e dois', 'vinte e três', 'vinte e quatro', 'vinte e cinco'];

      const visitantes = ata.presencas.filter(p => p.tipo === 'VISITANTE').length;
      const quadro = ata.numeroPresentes - visitantes;

      const presencaTexto = visitantes > 0
        ? `${quadro} (${numerosExtenso[quadro] || quadro}) do quadro da Loja e ${visitantes} (${numerosExtenso[visitantes] || visitantes}) visitantes`
        : 'todos do quadro da Loja';

      // Ordenar cargos na ordem correta e agrupar por membro
      const cargosOrdenados = ordenarCargos(ata.cargos);

      // Criar mapa de ordem para membros (usando membroId como chave para agrupamento confiável)
      const ordemMembros = new Map();
      cargosOrdenados.forEach((cargo, index) => {
        const chave = cargo.membroId || cargo.nomeManual || 'desconhecido';
        if (!ordemMembros.has(chave)) {
          ordemMembros.set(chave, index);
        }
      });

      // Agrupar cargos por membro
      const cargosPorMembro = {};
      cargosOrdenados.forEach(cargo => {
        const chave = cargo.membroId || cargo.nomeManual || 'desconhecido';
        const nome = cargo.membro ? cargo.membro.nome : cargo.nomeManual;
        if (!cargosPorMembro[chave]) {
          cargosPorMembro[chave] = { cargos: [], nome };
        }
        cargosPorMembro[chave].cargos.push(cargo.cargo);
      });

      // Ordenar membros pela ordem do primeiro cargo
      const membrosOrdenados = Object.entries(cargosPorMembro).sort((a, b) => {
        return (ordemMembros.get(a[0]) ?? 999) - (ordemMembros.get(b[0]) ?? 999);
      });

      const cargosTexto = membrosOrdenados.map(([, info]) => {
        // Ordenar os cargos do membro na ordem correta
        const cargosOrdenadosMembro = ordenarListaCargos(info.cargos);
        const cargosUnidos = cargosOrdenadosMembro.join(' / ');
        return `<B>${cargosUnidos}:</B> Ir. ${info.nome.toUpperCase()}`;
      }).join(', ');

      const sortNome = (a, b) => (a.membro?.nome || a.nomeManual || '').localeCompare(b.membro?.nome || b.nomeManual || '', 'pt-BR', { sensitivity: 'base' });

      const membrosQuadroTexto = ata.presencas
        .filter(p => p.tipo === 'QUADRO')
        .sort(sortNome)
        .map(p => {
          const nome = p.membro ? p.membro.nome : p.nomeManual;
          return `Ir. ${nome.toUpperCase()}`;
        })
        .join(', ');

      const visitantesTexto = ata.presencas
        .filter(p => p.tipo === 'VISITANTE')
        .sort(sortNome)
        .map(p => {
          const nome = p.membro ? p.membro.nome : p.nomeManual;
          return `Ir. ${nome.toUpperCase()}`;
        })
        .join(', ');

      const venaveMestre = ata.cargos.find(c => c.cargo === 'Venerável Mestre');
      const secretario = ata.cargos.find(c => c.cargo === 'Secretário');
      const orador = ata.cargos.find(c => c.cargo === 'Orador') || ata.cargos.find(c => c.cargo === 'Membro do Ministério Público');

      const nomeVM = venaveMestre ? (venaveMestre.membro?.nome || venaveMestre.nomeManual) : '';
      const nomeSec = secretario ? (secretario.membro?.nome || secretario.nomeManual) : '';
      const nomeOrador = orador ? (orador.membro?.nome || orador.nomeManual) : '';

      // Só remove ADHOC se o membro cadastrado tiver 'SECRETÁRIO' no campo cargo do perfil
      const isSecretarioOficial = secretario?.membro?.cargo?.split(' / ').includes('SECRETÁRIO') ?? false;
      const tituloSecretario = isSecretarioOficial ? 'Secretário' : 'Secretário ADHOC';

      // Função para obter todos os cargos de um membro
      const obterCargosDoMembro = (membroNome) => {
        const cargos = ata.cargos
          .filter(c => {
            const nome = c.membro?.nome || c.nomeManual;
            return nome === membroNome;
          })
          .map(c => c.cargo);

        // Ordenar na ordem correta dos cargos
        return ordenarListaCargos(cargos).join(' / ');
      };

      const cargosVM = obterCargosDoMembro(nomeVM);
      const cargosSec = obterCargosDoMembro(nomeSec);
      const cargosOrador = obterCargosDoMembro(nomeOrador);

      let textoCorpo = `<B>Ata</B> <B>${ata.numeroAta}</B> da sessão magna no grau de ${ata.livro} Maçom do Rito Schröder, da <B>A.R.L.S.</B> <B>Sabedoria</B> <B>de</B> <B>Salomão</B> <B>nº</B> <B>4.774,</B>${ata.local ? ` realizada na ${ata.local},` : ''} aos ${dia} (${numerosExtenso[dia]}) dias do mês de ${mes} de ${ano} da Era Vulgar. Os trabalhos foram iniciados às ${ata.horarioInicio} hs, com a presença de ${ata.numeroPresentes} (${numerosExtenso[ata.numeroPresentes] || ata.numeroPresentes}) Irmãos, sendo ${presencaTexto}. Os cargos foram ocupados na seguinte ordem: ${cargosTexto}. `;

      if (membrosQuadroTexto) {
        textoCorpo += `Estiveram também presentes os Irmãos membros do quadro da loja: ${membrosQuadroTexto}. `;
      }

      if (visitantesTexto) {
        textoCorpo += `Estiveram também presentes os seguintes visitantes: ${visitantesTexto}. `;
      }

      textoCorpo += `Após a abertura dos trabalhos, o Venerável Mestre Ir. ${nomeVM.toUpperCase()} saudou cordialmente a todos os presentes.`;

      if (ata.leituraAta) {
        textoCorpo += ` <B>LEITURA</B> <B>DE</B> <B>ATA:</B> ${ata.leituraAta}`;
      }

      if (ata.expediente) {
        textoCorpo += ` <B>EXPEDIENTE:</B> ${ata.expediente}`;
      }

      if (ata.ordemDia) {
        textoCorpo += ` <B>ORDEM</B> <B>DO</B> <B>DIA:</B> ${ata.ordemDia}`;
      }

      if (ata.coberturaTemplo) {
        const raw = ata.coberturaTemplo;
        let entradas = [];
        if (raw.startsWith('[')) {
          try { entradas = JSON.parse(raw); } catch { entradas = []; }
        } else {
          const p = raw.split('|');
          entradas = [{ tipo: p[0] || '', membro: p[1] || '', saida: p[2] || '', retorno: p[3] || '' }];
        }
        entradas.forEach(cob => {
          const nomeIrmao = cob.membro ? `O Ir. ${cob.membro} ` : '';
          if (cob.tipo === 'TEMPORARIO') {
            const horarios = (cob.saida && cob.retorno)
              ? `, saindo às ${cob.saida} e retornando às ${cob.retorno}`
              : cob.saida ? `, saindo às ${cob.saida}` : '';
            textoCorpo += ` ${nomeIrmao}cobriu o Templo temporariamente${horarios}.`;
          } else if (cob.tipo === 'PERMANENTE') {
            const horarios = cob.saida ? `, saindo às ${cob.saida}` : '';
            textoCorpo += ` ${nomeIrmao}cobriu o Templo permanentemente${horarios}.`;
          } else {
            textoCorpo += ` ${raw}`;
          }
        });
      }

      if (ata.palavraBemLoja) {
        textoCorpo += ` <B>PALAVRA</B> <B>A</B> <B>BEM</B> <B>DESTA</B> <B>LOJA</B> <B>OU</B> <B>DA</B> <B>MAÇONARIA</B> <B>EM</B> <B>GERAL:</B> ${ata.palavraBemLoja}`;
      }

      // Função para converter número em extenso
      const numeroParaExtenso = (numero) => {
        const unidades = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
        const dez_vinte = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
        const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
        const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

        const num = parseInt(numero);

        if (num === 0) return 'zero';
        if (num < 10) return unidades[num];
        if (num >= 10 && num < 20) return dez_vinte[num - 10];
        if (num >= 20 && num < 100) {
          const dez = Math.floor(num / 10);
          const uni = num % 10;
          return uni === 0 ? dezenas[dez] : `${dezenas[dez]} e ${unidades[uni]}`;
        }
        if (num === 100) return 'cem';
        if (num > 100 && num < 1000) {
          const cen = Math.floor(num / 100);
          const resto = num % 100;
          if (resto === 0) return centenas[cen];
          if (resto < 10) return `${centenas[cen]} e ${unidades[resto]}`;
          if (resto < 20) return `${centenas[cen]} e ${dez_vinte[resto - 10]}`;
          const dez = Math.floor(resto / 10);
          const uni = resto % 10;
          return uni === 0 ? `${centenas[cen]} e ${dezenas[dez]}` : `${centenas[cen]} e ${dezenas[dez]} e ${unidades[uni]}`;
        }
        return numero.toString();
      };

      const valorFormatado = Number(ata.valorTronco).toFixed(2).replace('.', ',');
      const reais = parseInt(Number(ata.valorTronco).toFixed(2).split('.')[0]);
      const centavos = parseInt(Number(ata.valorTronco).toFixed(2).split('.')[1]);

      const reaisExtenso = numeroParaExtenso(reais);
      const centavosExtenso = numeroParaExtenso(centavos);

      const valorExtenso = centavos !== 0
        ? `${reaisExtenso} ${reais === 1 ? 'real' : 'reais'} e ${centavosExtenso} ${centavos === 1 ? 'centavo' : 'centavos'}`
        : `${reaisExtenso} ${reais === 1 ? 'real' : 'reais'}`;

      textoCorpo += ` <B>TRONCO</B> <B>DE</B> <B>BENEFICÊNCIA:</B> Após o giro da esmoleira, o resultado da coleta foi de R$ ${valorFormatado} (${valorExtenso}). Os trabalhos foram encerrados às ${ata.horarioEncerramento} hs e nada mais havendo a tratar eu, Ir. ${nomeSec.toUpperCase()}, ${tituloSecretario}, lavrei a presente ata que, acaba de ser lida e se aprovada será assinada por quem de direito.`;

      // Renderizar texto COM negrito - processar palavra por palavra
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');

      // Dividir em palavras mantendo os marcadores
      const words = textoCorpo.split(/\s+/);
      let currentLine = [];
      let currentLineWidth = 0;
      let isBold = false;

      const renderLine = (words, justify = true) => {
        if (yPosition > pageHeight - margin - 2) {
          pdf.addPage();
          yPosition = addHeader();
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'normal');
        }

        if (words.length === 0) return;

        // Calcular largura total
        const totalTextWidth = words.reduce((sum, word) => {
          pdf.setFont('helvetica', word.isBold ? 'bold' : 'normal');
          return sum + pdf.getTextWidth(word.text);
        }, 0);

        let xPos = margin;
        const spaceWidth = justify && words.length > 1 ? (maxWidth - totalTextWidth) / (words.length - 1) : pdf.getTextWidth(' ');

        words.forEach((word, i) => {
          pdf.setFont('helvetica', word.isBold ? 'bold' : 'normal');
          pdf.text(word.text, xPos, yPosition);
          xPos += pdf.getTextWidth(word.text);
          if (i < words.length - 1) {
            xPos += spaceWidth;
          }
        });

        pdf.setFont('helvetica', 'normal');
        yPosition += 5.5;
      };

      words.forEach((word, index) => {
        if (!word) return;

        let cleanWord = word;
        let wordIsBold = isBold;

        // Processar marcadores
        if (word.includes('<B>')) {
          cleanWord = cleanWord.replace(/<B>/g, '');
          isBold = true;
          wordIsBold = true;
        }

        if (word.includes('</B>')) {
          cleanWord = cleanWord.replace(/<\/B>/g, '');
          isBold = false;
        }

        if (!cleanWord) return;

        // Calcular largura da palavra
        pdf.setFont('helvetica', wordIsBold ? 'bold' : 'normal');
        const wordWidth = pdf.getTextWidth(cleanWord);
        const spaceWidth = pdf.getTextWidth(' ');

        // Verificar se a palavra cabe na linha atual
        const projectedWidth = currentLineWidth + (currentLine.length > 0 ? spaceWidth : 0) + wordWidth;

        if (projectedWidth > maxWidth && currentLine.length > 0) {
          // Renderizar linha atual (justificada)
          renderLine(currentLine, true);
          currentLine = [];
          currentLineWidth = 0;
        }

        // Adicionar palavra à linha atual
        currentLine.push({ text: cleanWord, isBold: wordIsBold });
        currentLineWidth += wordWidth + (currentLine.length > 1 ? spaceWidth : 0);

        // Se for a última palavra, renderizar sem justificar
        if (index === words.length - 1) {
          renderLine(currentLine, false);
        }
      });

      // Assinaturas
      const sigImgHeight = 15; // altura da imagem de assinatura em mm
      yPosition += ata.usarAssinaturas ? 10 : 25;
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = addHeader();
      }

      // Função para carregar imagem de assinatura como base64
      const carregarImgAssinatura = async (url) => {
        try {
          return await fetch(url).then(r => r.blob()).then(b => new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(b);
          }));
        } catch { return null; }
      };

      // Pré-carregar imagens se necessário
      let imgVM = null, imgSec = null, imgOrador = null;
      if (ata.usarAssinaturas) {
        const urlVM = venaveMestre?.membro?.assinaturaUrl;
        const urlSec = secretario?.membro?.assinaturaUrl;
        const urlOrador = orador?.membro?.assinaturaUrl;
        [imgVM, imgSec, imgOrador] = await Promise.all([
          urlVM ? carregarImgAssinatura(urlVM) : Promise.resolve(null),
          urlSec ? carregarImgAssinatura(urlSec) : Promise.resolve(null),
          urlOrador ? carregarImgAssinatura(urlOrador) : Promise.resolve(null),
        ]);
      }

      // Calcular posições para 3 assinaturas distribuídas
      const signatureWidth = 50;
      const gapBetweenSignatures = 10;
      const totalSignaturesWidth = (signatureWidth * 3) + (gapBetweenSignatures * 2);
      const startX = (pageWidth - totalSignaturesWidth) / 2;

      const pos1 = startX;
      const pos2 = pos1 + signatureWidth + gapBetweenSignatures;
      const pos3 = pos2 + signatureWidth + gapBetweenSignatures;

      // Desenhar imagens acima das linhas (se usarAssinaturas)
      if (ata.usarAssinaturas) {
        if (imgVM) pdf.addImage(imgVM, pos1, yPosition, signatureWidth, sigImgHeight, undefined, 'FAST');
        if (imgSec) pdf.addImage(imgSec, pos2, yPosition, signatureWidth, sigImgHeight, undefined, 'FAST');
        if (imgOrador) pdf.addImage(imgOrador, pos3, yPosition, signatureWidth, sigImgHeight, undefined, 'FAST');
        yPosition += sigImgHeight;
      }

      const signatureY = yPosition;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');

      // Função para renderizar nome com quebra de linha se necessário
      const renderizarNomeAssinatura = (nome, posX, posY, maxWidth) => {
        pdf.setFont('helvetica', 'bold');
        const linhas = pdf.splitTextToSize(nome.toUpperCase(), maxWidth);
        let offsetY = 0;
        linhas.forEach((linha, i) => {
          pdf.text(linha, posX + maxWidth/2, posY + 4 + (i * 3.5), { align: 'center' });
          offsetY = (i + 1) * 3.5;
        });
        return offsetY;
      };

      // Linha para assinatura VM
      pdf.line(pos1, signatureY, pos1 + signatureWidth, signatureY);
      const offsetVM = renderizarNomeAssinatura(nomeVM, pos1, signatureY, signatureWidth);
      pdf.setFont('helvetica', 'normal');
      pdf.text(cargosVM, pos1 + signatureWidth/2, signatureY + 4 + offsetVM + 2, { align: 'center' });

      // Linha para assinatura Secretário
      pdf.line(pos2, signatureY, pos2 + signatureWidth, signatureY);
      const offsetSec = renderizarNomeAssinatura(nomeSec, pos2, signatureY, signatureWidth);
      pdf.setFont('helvetica', 'normal');
      pdf.text(tituloSecretario, pos2 + signatureWidth/2, signatureY + 4 + offsetSec + 2, { align: 'center' });

      // Linha para assinatura Orador
      pdf.line(pos3, signatureY, pos3 + signatureWidth, signatureY);
      const offsetOrador = renderizarNomeAssinatura(nomeOrador, pos3, signatureY, signatureWidth);
      pdf.setFont('helvetica', 'normal');
      pdf.text(cargosOrador, pos3 + signatureWidth/2, signatureY + 4 + offsetOrador + 2, { align: 'center' });

      pdf.save(`Ata_${ata.numeroAta.replace('/', '_')}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setGerando(false);
    }
  };

  if (!ata) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl font-bold text-gray-600">Carregando...</div>
      </div>
    );
  }

  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  // Mapeamento de tipos de sessão para exibição
  const tiposSessao = {
    'MAGNA': 'Magna',
    'ORDINARIA': 'Magna', // Retrocompatibilidade
    'INICIACAO': 'Iniciação',
    'ELEVACAO': 'Elevação',
    'PASSAGEM_GRAU': 'Promoção',
    'INSTALACAO': 'Instalação',
    'A_CAMPO': 'A Campo',
    'EXTRAORDINARIA': 'Extraordinária',
    'REGULARIZACAO': 'Regularização',
    'FILIACAO': 'Filiação'
  };

  const getTipoSessaoLabel = () => {
    if (ata.tipoSessao && ata.tipoSessao !== 'MAGNA' && ata.tipoSessao !== 'ORDINARIA') {
      return tiposSessao[ata.tipoSessao] || ata.tipoSessao;
    }
    // Se for magna ou não tiver tipo, usa o livro
    return ata.livro;
  };

  const dataAta = new Date(ata.data);
  const dia = dataAta.getDate();
  const mes = meses[dataAta.getMonth()];
  const ano = dataAta.getFullYear();

  // Formatação de texto dos cargos (com Ir. prefixo)
  const formatarNomeCargo = (cargo) => {
    const nome = cargo.membro ? cargo.membro.nome : cargo.nomeManual;
    return `Ir. ${nome.toUpperCase()}`;
  };

  const formatarNomePresenca = (presenca) => {
    const nome = presenca.membro ? presenca.membro.nome : presenca.nomeManual;
    return `Ir. ${nome.toUpperCase()}`;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header com botões */}
      <header className="bg-blue-900 text-white p-3 md:p-4 shadow-lg sticky top-0 z-50">
        <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
            <button
              onClick={() => router.push('/dashboard')}
              className="hover:bg-blue-800 active:bg-blue-700 p-2 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Home size={22} />
            </button>
            <button
              onClick={() => router.push('/atas')}
              className="hover:bg-blue-800 active:bg-blue-700 p-2 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <ArrowLeft size={22} />
            </button>
            <div className="flex-1">
              <h1 className="text-lg md:text-2xl font-bold">Visualizar Ata</h1>
              <p className="text-xs md:text-sm text-blue-200 hidden sm:block">Ata {ata.numeroAta}</p>
            </div>
          </div>
          <button
            onClick={gerarPDF}
            disabled={gerando}
            className="flex items-center justify-center gap-2 hover:bg-blue-800 border border-blue-700 px-3 md:px-4 py-2 rounded-lg disabled:opacity-50 w-full md:w-auto text-sm md:text-base"
          >
            <Download size={18} className="md:w-5 md:h-5" />
            {gerando ? 'Gerando PDF...' : 'Baixar PDF'}
          </button>
        </div>
      </header>

      {/* Conteúdo da Ata */}
      <main className="w-full p-2 md:p-8">
        <div className="max-w-7xl mx-auto mb-4">
          <Breadcrumbs
            items={[
              { label: 'Atas', href: '/atas' },
              { label: `Ata ${ata.numeroAta}` }
            ]}
          />
        </div>
        <div className="bg-white shadow-2xl rounded-lg">
          <div id="ata-completa" className="bg-white p-4 md:p-8 max-w-full md:max-w-[210mm]" style={{ margin: '0 auto' }}>

            {/* Cabeçalho com logos - será repetido em todas as páginas */}
            <div id="ata-cabecalho" className="mb-4 md:mb-6">
              <div className="flex justify-between items-start mb-4">
                <img src="/logo-gob.jpeg" alt="GOB" className="h-12 w-12 md:h-20 md:w-20" />
                <div className="text-center flex-1 mx-2 md:mx-4">
                  <h1 className="text-xs md:text-lg font-bold text-gray-900 mb-1 md:mb-2">
                    {configLoja.nome || 'Loja Maçônica'}
                  </h1>
                  {configLoja.endereco && (
                    <p className="text-[10px] md:text-sm text-gray-700">{configLoja.endereco}</p>
                  )}
                  {configLoja.oriente && (
                    <p className="text-[10px] md:text-sm text-gray-700 font-semibold">{configLoja.oriente}</p>
                  )}
                </div>
                <img src="/logo.jpeg" alt="Loja" className="h-12 w-12 md:h-20 md:w-20" />
              </div>
            </div>

            {/* Corpo da ata */}
            <div id="ata-corpo">

            {/* Título */}
            <div className="text-center mb-4 md:mb-6">
              <h2 className="text-sm md:text-lg font-bold text-gray-900">GRANDE ORIENTE DO BRASIL</h2>
              {configLoja.oriente && (
                <h3 className="text-xs md:text-base font-bold text-gray-900">ORIENTE DE {configLoja.oriente.toUpperCase()}</h3>
              )}
              <h3 className="text-xs md:text-base font-bold text-gray-900">
                LIVRO DO {ata.livro} MAÇOM
              </h3>
              <h3 className="text-xs md:text-base font-bold text-gray-900 mt-1 md:mt-2">ATA {ata.numeroAta}</h3>
            </div>

            <hr className="border-t-2 border-gray-900 mb-3 md:mb-4" />

            {/* Subtítulo */}
            <h4 className="text-center text-xs md:text-base font-bold text-gray-900 mb-3 md:mb-4">
              ATA SESSÃO MAGNA DE {getTipoSessaoLabel().toUpperCase()}
            </h4>

            {/* Corpo da ata - texto contínuo sem quebras */}
            <div className="text-justify text-xs md:text-sm leading-relaxed text-gray-900" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
              <p style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                <strong>Ata {ata.numeroAta}</strong> da sessão magna no grau de {ata.livro} Maçom do Rito Schröder, da <strong>A.R.L.S. Sabedoria de Salomão nº 4.774</strong>,{ata.local ? ` realizada na ${ata.local},` : ''} aos {dia} ({
                  ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
                   'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove', 'vinte',
                   'vinte e um', 'vinte e dois', 'vinte e três', 'vinte e quatro', 'vinte e cinco', 'vinte e seis',
                   'vinte e sete', 'vinte e oito', 'vinte e nove', 'trinta', 'trinta e um'][dia]
                }) dias do mês de {mes} de {ano} da Era Vulgar. Os trabalhos foram iniciados às {ata.horarioInicio} hs, com a presença de {ata.numeroPresentes} ({
                  ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
                   'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove', 'vinte',
                   'vinte e um', 'vinte e dois', 'vinte e três', 'vinte e quatro', 'vinte e cinco'][ata.numeroPresentes] || ata.numeroPresentes
                }) Irmãos, sendo {
                  (() => {
                    const visitantes = ata.presencas.filter(p => p.tipo === 'VISITANTE').length;
                    const quadro = ata.numeroPresentes - visitantes;
                    const numerosExtenso = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
                      'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove', 'vinte',
                      'vinte e um', 'vinte e dois', 'vinte e três', 'vinte e quatro', 'vinte e cinco'];

                    if (visitantes > 0) {
                      return `${quadro} (${numerosExtenso[quadro] || quadro}) do quadro da Loja e ${visitantes} (${numerosExtenso[visitantes] || visitantes}) visitantes`;
                    } else {
                      return 'todos do quadro da Loja';
                    }
                  })()
                }. Os cargos foram ocupados na seguinte ordem:{' '}
                {(() => {
                  // Ordenar cargos na ordem correta
                  const cargosOrdenadosAta = ordenarCargos(ata.cargos);

                  // Criar mapa de ordem para membros (baseado no primeiro cargo de cada um)
                  // Usa membroId como chave para membros cadastrados, nomeManual para digitados
                  const ordemMembros = new Map();
                  cargosOrdenadosAta.forEach((cargo, idx) => {
                    const chave = cargo.membroId || cargo.nomeManual || 'desconhecido';
                    if (!ordemMembros.has(chave)) {
                      ordemMembros.set(chave, idx);
                    }
                  });

                  // Agrupar cargos por membro (usando membroId para garantir agrupamento correto)
                  const cargosPorMembro = {};
                  cargosOrdenadosAta.forEach(cargo => {
                    const chave = cargo.membroId || cargo.nomeManual || 'desconhecido';
                    if (!cargosPorMembro[chave]) {
                      cargosPorMembro[chave] = {
                        cargos: [],
                        cargoObj: cargo
                      };
                    }
                    cargosPorMembro[chave].cargos.push(cargo.cargo);
                  });

                  // Ordenar membros pela ordem do primeiro cargo
                  const membrosOrdenados = Object.entries(cargosPorMembro).sort((a, b) => {
                    return (ordemMembros.get(a[0]) ?? 999) - (ordemMembros.get(b[0]) ?? 999);
                  });

                  return membrosOrdenados.map(([nome, info], index, arr) => {
                    // Ordenar os cargos do membro na ordem correta
                    const cargosOrdenadosMembro = ordenarListaCargos(info.cargos);

                    return (
                      <span key={index}>
                        <strong>{cargosOrdenadosMembro.join(' / ')}:</strong> {formatarNomeCargo(info.cargoObj)}
                        {index < arr.length - 1 ? ', ' : '. '}
                      </span>
                    );
                  });
                })()}
                {ata.presencas.filter(p => p.tipo === 'QUADRO').length > 0 && (
                  <>
                    Estiveram também presentes os Irmãos membros do quadro da loja:{' '}
                    {[...ata.presencas.filter(p => p.tipo === 'QUADRO')].sort((a, b) => (a.membro?.nome || a.nomeManual || '').localeCompare(b.membro?.nome || b.nomeManual || '', 'pt-BR', { sensitivity: 'base' })).map((presenca, index, arr) => (
                      <span key={index}>
                        {formatarNomePresenca(presenca)}
                        {index < arr.length - 1 ? ', ' : '. '}
                      </span>
                    ))}
                  </>
                )}
                {ata.presencas.filter(p => p.tipo === 'VISITANTE').length > 0 && (
                  <>
                    Estiveram também presentes os seguintes visitantes:{' '}
                    {[...ata.presencas.filter(p => p.tipo === 'VISITANTE')].sort((a, b) => (a.membro?.nome || a.nomeManual || '').localeCompare(b.membro?.nome || b.nomeManual || '', 'pt-BR', { sensitivity: 'base' })).map((presenca, index, arr) => (
                      <span key={index}>
                        {formatarNomePresenca(presenca)}
                        {index < arr.length - 1 ? ', ' : '. '}
                      </span>
                    ))}
                  </>
                )}
                Após a abertura dos trabalhos, o Venerável Mestre {
                  ata.cargos.find(c => c.cargo === 'Venerável Mestre')
                    ? formatarNomeCargo(ata.cargos.find(c => c.cargo === 'Venerável Mestre'))
                    : ''
                } saudou cordialmente a todos os presentes.
                {ata.leituraAta && (
                  <> <strong>LEITURA DE ATA:</strong> {ata.leituraAta}</>
                )}
                {ata.expediente && (
                  <> <strong>EXPEDIENTE:</strong> {ata.expediente}</>
                )}
                {ata.ordemDia && (
                  <> <strong>ORDEM DO DIA:</strong> {ata.ordemDia}</>
                )}
                {ata.coberturaTemplo && (() => {
                  const raw = ata.coberturaTemplo;
                  let entradas = [];
                  if (raw.startsWith('[')) {
                    try { entradas = JSON.parse(raw); } catch { entradas = []; }
                  } else {
                    const p = raw.split('|');
                    entradas = [{ tipo: p[0] || '', membro: p[1] || '', saida: p[2] || '', retorno: p[3] || '' }];
                  }
                  const textos = entradas.map((cob) => {
                    const nomeIrmao = cob.membro ? `O Ir. ${cob.membro} ` : '';
                    if (cob.tipo === 'TEMPORARIO') {
                      const horarios = (cob.saida && cob.retorno)
                        ? `, saindo às ${cob.saida} e retornando às ${cob.retorno}`
                        : cob.saida ? `, saindo às ${cob.saida}` : '';
                      return `${nomeIrmao}cobriu o Templo temporariamente${horarios}.`;
                    } else if (cob.tipo === 'PERMANENTE') {
                      const horarios = cob.saida ? `, saindo às ${cob.saida}` : '';
                      return `${nomeIrmao}cobriu o Templo permanentemente${horarios}.`;
                    }
                    return raw;
                  });
                  return <> {textos.join(' ')}</>;
                })()}
                {ata.palavraBemLoja && (
                  <> <strong>PALAVRA A BEM DESTA LOJA OU DA MAÇONARIA EM GERAL:</strong> {ata.palavraBemLoja}</>
                )}
                {' '}<strong>TRONCO DE BENEFICÊNCIA:</strong> Após o giro da esmoleira, o resultado da coleta foi de R$ {Number(ata.valorTronco).toFixed(2).replace('.', ',')} ({
                  (() => {
                    const numeroParaExtenso = (numero) => {
                      const unidades = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
                      const dez_vinte = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
                      const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
                      const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

                      const num = parseInt(numero);

                      if (num === 0) return 'zero';
                      if (num < 10) return unidades[num];
                      if (num >= 10 && num < 20) return dez_vinte[num - 10];
                      if (num >= 20 && num < 100) {
                        const dez = Math.floor(num / 10);
                        const uni = num % 10;
                        return uni === 0 ? dezenas[dez] : `${dezenas[dez]} e ${unidades[uni]}`;
                      }
                      if (num === 100) return 'cem';
                      if (num > 100 && num < 1000) {
                        const cen = Math.floor(num / 100);
                        const resto = num % 100;
                        if (resto === 0) return centenas[cen];
                        if (resto < 10) return `${centenas[cen]} e ${unidades[resto]}`;
                        if (resto < 20) return `${centenas[cen]} e ${dez_vinte[resto - 10]}`;
                        const dez = Math.floor(resto / 10);
                        const uni = resto % 10;
                        return uni === 0 ? `${centenas[cen]} e ${dezenas[dez]}` : `${centenas[cen]} e ${dezenas[dez]} e ${unidades[uni]}`;
                      }
                      return numero.toString();
                    };

                    const reais = parseInt(Number(ata.valorTronco).toFixed(2).split('.')[0]);
                    const centavos = parseInt(Number(ata.valorTronco).toFixed(2).split('.')[1]);
                    const reaisExtenso = numeroParaExtenso(reais);
                    const centavosExtenso = numeroParaExtenso(centavos);

                    return centavos !== 0
                      ? `${reaisExtenso} ${reais === 1 ? 'real' : 'reais'} e ${centavosExtenso} ${centavos === 1 ? 'centavo' : 'centavos'}`
                      : `${reaisExtenso} ${reais === 1 ? 'real' : 'reais'}`;
                  })()
                }). Os trabalhos foram encerrados às {ata.horarioEncerramento} hs e nada mais havendo a tratar eu,{' '}
                {ata.cargos.find(c => c.cargo === 'Secretário')
                  ? formatarNomeCargo(ata.cargos.find(c => c.cargo === 'Secretário'))
                  : ''
                }, {(() => {
                  const sec = ata.cargos.find(c => c.cargo === 'Secretário');
                  return sec?.membro?.cargo?.split(' / ').includes('SECRETÁRIO')
                    ? 'Secretário'
                    : 'Secretário ADHOC';
                })()}, lavrei a presente ata que, acaba de ser lida e se aprovada será assinada por quem de direito.
              </p>
            </div>
            </div>

            {/* Assinaturas - só aparece na última página */}
            <div id="ata-assinaturas" className="mt-8 md:mt-16">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-2 px-2 md:px-4">
              <div className="text-center overflow-hidden px-1">
                {ata.usarAssinaturas && ata.cargos.find(c => c.cargo === 'Venerável Mestre')?.membro?.assinaturaUrl && (
                  <img
                    src={ata.cargos.find(c => c.cargo === 'Venerável Mestre').membro.assinaturaUrl}
                    alt="Assinatura VM"
                    className="h-12 mx-auto mb-0 object-contain"
                  />
                )}
                <div className="border-b-2 border-gray-900 w-32 md:w-40 mb-2 mx-auto"></div>
                <p className="text-[10px] md:text-sm font-bold text-gray-900 break-words w-full max-w-[160px] mx-auto leading-tight">
                  {ata.cargos.find(c => c.cargo === 'Venerável Mestre')
                    ? (ata.cargos.find(c => c.cargo === 'Venerável Mestre').membro?.nome ||
                       ata.cargos.find(c => c.cargo === 'Venerável Mestre').nomeManual)?.toUpperCase()
                    : ''}
                </p>
                <p className="text-[9px] md:text-xs text-gray-900 mt-1">
                  {(() => {
                    const vm = ata.cargos.find(c => c.cargo === 'Venerável Mestre');
                    if (!vm) return 'Venerável Mestre';
                    const nomeVM = vm.membro?.nome || vm.nomeManual;
                    const cargos = ata.cargos
                      .filter(c => {
                        const nomeCargo = c.membro?.nome || c.nomeManual;
                        return nomeCargo === nomeVM;
                      })
                      .map(c => c.cargo);
                    return ordenarListaCargos(cargos).join(' / ');
                  })()}
                </p>
              </div>

              {(() => {
                const sec = ata.cargos.find(c => c.cargo === 'Secretário');
                if (!sec) return (
                  <div className="text-center overflow-hidden px-1">
                    <div className="border-b-2 border-gray-900 w-32 md:w-40 mb-2 mx-auto"></div>
                    <p className="text-[10px] md:text-sm font-bold text-gray-900 break-words w-full max-w-[160px] mx-auto leading-tight"></p>
                    <p className="text-[9px] md:text-xs text-gray-900 mt-1">Secretário</p>
                  </div>
                );

                const nomeSec = sec.membro?.nome || sec.nomeManual;

                // Verificar se é a mesma pessoa que o VM ou Orador
                const vm = ata.cargos.find(c => c.cargo === 'Venerável Mestre');
                const orad = ata.cargos.find(c => c.cargo === 'Orador') || ata.cargos.find(c => c.cargo === 'Membro do Ministério Público');

                const isSameAsVM = vm && (
                  sec.membroId && vm.membroId
                    ? sec.membroId === vm.membroId
                    : nomeSec === (vm.membro?.nome || vm.nomeManual)
                );
                const isSameAsOrad = orad && (
                  sec.membroId && orad.membroId
                    ? sec.membroId === orad.membroId
                    : nomeSec === (orad.membro?.nome || orad.nomeManual)
                );

                // Se já aparece no bloco de VM ou Orador, ocultar este bloco
                if (isSameAsVM || isSameAsOrad) return null;

                // Buscar todos os cargos desta pessoa na ata
                const cargosDoSec = ata.cargos
                  .filter(c => {
                    if (sec.membroId && c.membroId) return c.membroId === sec.membroId;
                    return (c.membro?.nome || c.nomeManual) === nomeSec;
                  })
                  .map(c => c.cargo);
                const cargosOrdenadosSec = ordenarListaCargos(cargosDoSec);

                // Título: combinado se múltiplos cargos, ou Secretário/ADHOC se único
                let titulo;
                if (cargosOrdenadosSec.length > 1) {
                  titulo = cargosOrdenadosSec.join(' / ');
                } else {
                  titulo = sec.membro?.cargo?.split(' / ').includes('SECRETÁRIO')
                    ? 'Secretário'
                    : 'Secretário ADHOC';
                }

                return (
                  <div className="text-center overflow-hidden px-1">
                    {ata.usarAssinaturas && sec.membro?.assinaturaUrl && (
                      <img
                        src={sec.membro.assinaturaUrl}
                        alt="Assinatura Secretário"
                        className="h-12 mx-auto mb-0 object-contain"
                      />
                    )}
                    <div className="border-b-2 border-gray-900 w-32 md:w-40 mb-2 mx-auto"></div>
                    <p className="text-[10px] md:text-sm font-bold text-gray-900 break-words w-full max-w-[160px] mx-auto leading-tight">
                      {nomeSec?.toUpperCase()}
                    </p>
                    <p className="text-[9px] md:text-xs text-gray-900 mt-1">
                      {titulo}
                    </p>
                  </div>
                );
              })()}

              {(() => {
                const oradHtml = ata.cargos.find(c => c.cargo === 'Orador') || ata.cargos.find(c => c.cargo === 'Membro do Ministério Público');
                const nomeOradHtml = oradHtml ? (oradHtml.membro?.nome || oradHtml.nomeManual) : '';
                const cargosOradHtml = oradHtml ? ordenarListaCargos(
                  ata.cargos.filter(c => {
                    if (oradHtml.membroId && c.membroId) return c.membroId === oradHtml.membroId;
                    return (c.membro?.nome || c.nomeManual) === nomeOradHtml;
                  }).map(c => c.cargo)
                ).join(' / ') : 'Orador';
                return (
                  <div className="text-center overflow-hidden px-1">
                    {ata.usarAssinaturas && oradHtml?.membro?.assinaturaUrl && (
                      <img
                        src={oradHtml.membro.assinaturaUrl}
                        alt="Assinatura Orador"
                        className="h-12 mx-auto mb-0 object-contain"
                      />
                    )}
                    <div className="border-b-2 border-gray-900 w-32 md:w-40 mb-2 mx-auto"></div>
                    <p className="text-[10px] md:text-sm font-bold text-gray-900 break-words w-full max-w-[160px] mx-auto leading-tight">
                      {nomeOradHtml?.toUpperCase()}
                    </p>
                    <p className="text-[9px] md:text-xs text-gray-900 mt-1">
                      {cargosOradHtml}
                    </p>
                  </div>
                );
              })()}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
