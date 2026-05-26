// Componente reutilizável para selecionar membro OU digitar manualmente
// Usado em cargos e presenças

import { useState } from 'react';

export default function SeletorMembro({ 
  label, 
  value, // { tipo: 'cadastrado'|'manual', membroId: string, nomeManual: string }
  onChange,
  membros = []
}) {
  const [tipo, setTipo] = useState(value?.tipo || 'cadastrado');
  
  const handleTipoChange = (novoTipo) => {
    setTipo(novoTipo);
    onChange({ tipo: novoTipo, membroId: null, nomeManual: '' });
  };
  
  const handleMembroChange = (membroId) => {
    onChange({ tipo: 'cadastrado', membroId, nomeManual: '' });
  };
  
  const handleNomeManualChange = (nomeManual) => {
    onChange({ tipo: 'manual', membroId: null, nomeManual });
  };
  
  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-gray-700">{label}</label>
      
      {/* Tabs: Cadastrado ou Manual */}
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => handleTipoChange('cadastrado')}
          className={`px-4 py-2 rounded text-sm font-semibold ${
            tipo === 'cadastrado'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Membro Cadastrado
        </button>
        <button
          type="button"
          onClick={() => handleTipoChange('manual')}
          className={`px-4 py-2 rounded text-sm font-semibold ${
            tipo === 'manual'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Digitar Nome
        </button>
      </div>
      
      {/* Campo: Seleção ou Digitação */}
      {tipo === 'cadastrado' ? (
        <select
          value={value?.membroId || ''}
          onChange={(e) => handleMembroChange(e.target.value)}
          className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
        >
          <option value="">Selecione...</option>
          {membros.map(membro => (
            <option key={membro.id} value={membro.id}>
              {membro.nome} {membro.cim ? `- CIM: ${membro.cim}` : ''}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value?.nomeManual || ''}
          onChange={(e) => handleNomeManualChange(e.target.value)}
          placeholder="Digite o nome completo..."
          className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
        />
      )}
    </div>
  );
}