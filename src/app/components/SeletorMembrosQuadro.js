// Componente para selecionar membros do quadro com checkboxes

export default function SeletorMembrosQuadro({
  membros = [],
  selecionados = [], // Array de IDs dos membros selecionados
  onChange
}) {
  const toggleMembro = (membroId) => {
    if (selecionados.includes(membroId)) {
      // Remove da seleção
      onChange(selecionados.filter(id => id !== membroId));
    } else {
      // Adiciona à seleção
      onChange([...selecionados, membroId]);
    }
  };

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto border-2 border-gray-300 rounded p-4">
      {membros.length === 0 ? (
        <p className="text-gray-500 text-center py-4">Nenhum membro cadastrado</p>
      ) : (
        membros.map(membro => (
          <label
            key={membro.id}
            className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selecionados.includes(membro.id)}
              onChange={() => toggleMembro(membro.id)}
              className="w-5 h-5 text-blue-600"
            />
            <span className="text-gray-900">
              {membro.nome}
              {membro.cim && <span className="text-gray-500 text-sm ml-2">CIM: {membro.cim}</span>}
            </span>
          </label>
        ))
      )}
    </div>
  );
}
