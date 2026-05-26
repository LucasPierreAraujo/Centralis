import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { withAuth } from '../../../../lib/authMiddleware';
import nodemailer from 'nodemailer';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

function criarTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

function formatarData(dataStr) {
  if (!dataStr) return '';
  // YYYY-MM-DD → DD/MM/YYYY
  if (dataStr.includes('-')) {
    const [y, m, d] = dataStr.split('-');
    return `${d}/${m}/${y}`;
  }
  return dataStr;
}

async function postHandler(request) {
  try {
    const { candidatoId } = await request.json();

    if (!candidatoId) {
      return NextResponse.json({ error: 'candidatoId é obrigatório' }, { status: 400 });
    }

    // Buscar candidato
    const candidato = await prisma.candidato.findUnique({ where: { id: candidatoId } });
    if (!candidato) {
      return NextResponse.json({ error: 'Candidato não encontrado' }, { status: 404 });
    }

    // Verificar sindicantes
    const etapas = candidato.etapas || {};
    const sindicantes = etapas['6']?.sindicantes || [];
    const sindicanteNomes = etapas['6']?.sindicanteNomes || [];

    if (sindicantes.length === 0) {
      return NextResponse.json({ error: 'Nenhum sindicante definido para este candidato' }, { status: 400 });
    }

    // Buscar emails dos sindicantes (membros cadastrados)
    const membrosSindicantes = await prisma.membro.findMany({
      where: { id: { in: sindicantes } },
      select: { id: true, nome: true, email: true },
    });

    // Buscar URL do modelo Word
    const config = await prisma.configuracaoGeral.findUnique({
      where: { chave: 'modelo_sindicancia_url' },
    });

    if (!config?.valor) {
      return NextResponse.json({ error: 'Modelo de sindicância não configurado. Faça upload do arquivo .docx primeiro.' }, { status: 400 });
    }

    // Baixar o template do Cloudinary
    const templateRes = await fetch(config.valor);
    if (!templateRes.ok) {
      return NextResponse.json({ error: 'Erro ao baixar o modelo Word' }, { status: 500 });
    }
    const templateBuffer = Buffer.from(await templateRes.arrayBuffer());

    // Data prevista da sindicância (15 dias após boletim)
    let dataSindicancia = '';
    const dataBoletim = etapas['5']?.data;
    if (dataBoletim) {
      const d = new Date(dataBoletim);
      d.setDate(d.getDate() + 15);
      dataSindicancia = d.toLocaleDateString('pt-BR');
    }

    // Dados comuns do candidato para preencher o template
    const dadosCandidato = {
      nome: candidato.nome || '',
      nascido_em: formatarData(candidato.dataNascimento),
      nome_esposa: candidato.nomeConjuge || '',
      endereco_residencial: candidato.enderecoResidencial || '',
      telefone_celular: candidato.telefone || '',
      telefone_fixo: candidato.telefoneFixo || '',
      endereco_profissional: candidato.enderecoProfissional || '',
      grau_instrucao: candidato.grauInstrucao || '',
      data_sindicancia: dataSindicancia,
      data_hoje: new Date().toLocaleDateString('pt-BR'),
    };

    const transporter = criarTransporter();
    const enviados = [];
    const erros = [];

    // Enviar um email para cada sindicante com o documento preenchido com o nome dele
    for (let i = 0; i < sindicanteNomes.length; i++) {
      const nomeSindicante = sindicanteNomes[i];
      const membroSindicante = membrosSindicantes.find(m => m.id === sindicantes[i]);
      const emailSindicante = membroSindicante?.email;

      if (!emailSindicante) {
        erros.push({ sindicante: nomeSindicante, erro: 'Email não cadastrado' });
        continue;
      }

      try {
        // Preencher template com dados do candidato + nome do sindicante
        const zip = new PizZip(templateBuffer);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
          nullGetter: () => '',
        });

        doc.render({
          ...dadosCandidato,
          nome_sindicante: nomeSindicante,
        });

        const docBuffer = doc.getZip().generate({ type: 'nodebuffer' });

        const nomeArquivo = `Sindicancia_${candidato.nome.replace(/\s+/g, '_')}.docx`;

        await transporter.sendMail({
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to: emailSindicante,
          subject: `Sindicância — ${candidato.nome}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
              <h2 style="color: #1e3a8a;">A.R.L.S. Sabedoria de Salomão Nº 4.774</h2>
              <p>Ir∴ <strong>${nomeSindicante}</strong>,</p>
              <p>Segue em anexo o documento de sindicância referente ao candidato <strong>${candidato.nome}</strong>.</p>
              ${dataSindicancia ? `<p>Prazo para realização: <strong>${dataSindicancia}</strong></p>` : ''}
              <p>Fraternalmente,<br/>Secretaria da Loja</p>
            </div>
          `,
          attachments: [{
            filename: nomeArquivo,
            content: docBuffer,
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          }],
        });

        enviados.push({ sindicante: nomeSindicante, email: emailSindicante });
      } catch (err) {
        console.error(`Erro ao enviar para ${nomeSindicante}:`, err.message);
        erros.push({ sindicante: nomeSindicante, erro: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      enviados: enviados.length,
      detalhes: enviados,
      erros: erros.length > 0 ? erros : undefined,
    });

  } catch (error) {
    console.error('Erro enviar sindicancia:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const POST = withAuth(postHandler);
