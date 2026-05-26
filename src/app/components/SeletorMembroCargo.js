// Componente simplificado para seleção de cargo
// Permite selecionar de uma lista OU digitar manualmente (datalist)

export default function SeletorMembroCargo({
  label,
  value, // { tipo: 'cadastrado'|'manual', membroId: string, nomeManual: string }
  onChange,
  membros = []
}) {
  const handleChange = (e) => {
    const inputValue = e.target.value;

    // Verifica se é um membro cadastrado (busca pelo nome)
    const membroCadastrado = membros.find(m =>
      m.nome.toLowerCase() === inputValue.toLowerCase()
    );

    if (membroCadastrado) {
      onChange({ tipo: 'cadastrado', membroId: membroCadastrado.id, nomeManual: '' });
    } else {
      // É um nome digitado manualmente
      onChange({ tipo: 'manual', membroId: null, nomeManual: inputValue });
    }
  };

  // Valor atual para exibir (sempre o nome)
  const displayValue = value?.tipo === 'cadastrado'
    ? (membros.find(m => m.id === value.membroId)?.nome || '')
    : (value?.nomeManual || '');

  return (
    <div className="space-y-1">
      <label className="block text-sm font-bold text-gray-700">{label}</label>
      <input
        list={`membros-${label}`}
        value={displayValue}
        onChange={handleChange}
        placeholder="Selecione ou digite o nome..."
        className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
      />
      <datalist id={`membros-${label}`}>
        {membros.map(membro => (
          <option key={membro.id} value={membro.nome}>
            {membro.cim ? `CIM: ${membro.cim}` : ''}
          </option>
        ))}
      </datalist>
    </div>
  );
}
