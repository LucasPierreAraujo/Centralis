"use client"
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, UserPlus, Award, ChevronDown, ChevronRight } from 'lucide-react';

const ETAPAS_CANDIDATOS = [
  { numero: 1,  titulo: 'Formulário de Interesse',                    responsavel: 'Proponentes e Secretaria' },
  { numero: 2,  titulo: 'Entrega do Formulário de Indicação',         responsavel: 'Proponentes, Candidato e Secretaria' },
  { numero: 3,  titulo: 'Documentos para o Drive',                   responsavel: 'Secretário' },
  { numero: 4,  titulo: 'Envio de Documentação ao GOB (PDF)',         responsavel: 'Secretário' },
  { numero: 5,  titulo: 'Boletim',                                   responsavel: 'Secretário' },
  { numero: 6,  titulo: 'Sindicância',                               responsavel: 'Venerável Mestre' },
  { numero: 7,  titulo: 'Escrutínio',                                responsavel: 'Venerável Mestre' },
  { numero: 8,  titulo: 'Pagamento das Taxas',                       responsavel: 'Tesouraria' },
  { numero: 9,  titulo: 'Agendamento e Realização da Cerimônia',     responsavel: 'Venerável Mestre e Corpo Ritualístico' },
  { numero: 10, titulo: 'Registro do Novo Obreiro',                  responsavel: 'Secretaria e Guarda dos Selos' },
  { numero: 11, titulo: 'Repasse do CIM e Cadastro no E-GOB Card',   responsavel: 'Venerável Mestre' },
];

const ETAPAS_PROMOCAO = [
  { numero: 1, titulo: 'Requisitos Mínimos',                  responsavel: 'Garante e Comissão de Passagens de Graus' },
  { numero: 2, titulo: 'Sabatina',                            responsavel: 'Venerável Mestre' },
  { numero: 3, titulo: 'Solicitação do Boleto do GOB CE',     responsavel: 'Secretário e Tesoureiro' },
  { numero: 4, titulo: 'Pagamento do Boleto GOB CE',          responsavel: 'Tesoureiro' },
  { numero: 5, titulo: 'Realização da Passagem de Grau',      responsavel: 'Venerável Mestre e Irmãos Mestres' },
  { numero: 6, titulo: 'Comunicação de Colação de Grau',      responsavel: 'Secretário' },
  { numero: 7, titulo: 'Pagamento do Boleto GOB Central',     responsavel: 'Tesoureiro' },
];

export default function PopPage() {
  const router = useRouter();
  const [expandCandidatos, setExpandCandidatos] = useState(false);
  const [expandPromocao, setExpandPromocao] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-900 text-white p-3 md:p-4 shadow-lg">
        <div className="w-full flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="hover:bg-blue-800 p-2 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <Home size={22} />
          </button>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold">POP</h1>
            <p className="text-xs text-blue-200 hidden sm:block">Plano de Obra Progressiva</p>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto mt-6 space-y-4">

        {/* Card Candidatos */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-transparent overflow-hidden">
          {/* Cabeçalho clicável — navega para /candidatos */}
          <div
            onClick={() => router.push('/candidatos')}
            className="flex items-center gap-4 p-6 cursor-pointer hover:bg-purple-50 active:bg-purple-50 transition"
          >
            <div className="bg-purple-100 p-4 rounded-full flex-shrink-0">
              <UserPlus size={32} className="text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-800">Candidatos</h2>
              <p className="text-gray-500 text-sm mt-0.5">Processo de iniciação — 11 etapas</p>
            </div>
          </div>

          {/* Botão expandir sequência */}
          <button
            onClick={() => setExpandCandidatos(v => !v)}
            className="w-full flex items-center justify-between px-6 py-2.5 bg-purple-50 border-t border-purple-100 text-purple-700 text-sm font-semibold hover:bg-purple-100 transition"
          >
            <span>Ver sequência de etapas</span>
            {expandCandidatos ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {expandCandidatos && (
            <ol className="px-5 py-4 space-y-2 border-t border-gray-100">
              {ETAPAS_CANDIDATOS.map(e => (
                <li key={e.numero} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                    {e.numero}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{e.titulo}</p>
                    <p className="text-xs text-gray-500">{e.responsavel}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Card Promoção / Elevação */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-transparent overflow-hidden">
          <div
            onClick={() => router.push('/promocao')}
            className="flex items-center gap-4 p-6 cursor-pointer hover:bg-blue-50 active:bg-blue-50 transition"
          >
            <div className="bg-blue-100 p-4 rounded-full flex-shrink-0">
              <Award size={32} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-800">Promoção / Elevação</h2>
              <p className="text-gray-500 text-sm mt-0.5">Passagem de grau — Companheiro e Mestre — 7 etapas</p>
            </div>
          </div>

          <button
            onClick={() => setExpandPromocao(v => !v)}
            className="w-full flex items-center justify-between px-6 py-2.5 bg-blue-50 border-t border-blue-100 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition"
          >
            <span>Ver sequência de etapas</span>
            {expandPromocao ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {expandPromocao && (
            <ol className="px-5 py-4 space-y-2 border-t border-gray-100">
              {ETAPAS_PROMOCAO.map(e => (
                <li key={e.numero} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                    {e.numero}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{e.titulo}</p>
                    <p className="text-xs text-gray-500">{e.responsavel}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

      </div>
    </div>
  );
}
