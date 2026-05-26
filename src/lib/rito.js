export const RITOS = [
  { value: 'REAA',    label: 'Rito Escocês Antigo e Aceito (REAA)' },
  { value: 'YORK',    label: 'Rito de York' },
  { value: 'MODERNO', label: 'Rito Moderno (Francês)' },
  { value: 'MEMPHIS', label: 'Rito de Memphis-Misraim' },
  { value: 'OUTRO',   label: 'Outro' },
];

export const CARGOS_PADRAO = [
  'Venerável Mestre',
  '1° Vigilante',
  '2° Vigilante',
  'Secretário',
  'Tesoureiro',
  'Orador',
  '1° Diácono',
  '2° Diácono',
  'Preparador',
  'Mestre de Harmonia',
  'Guarda do Templo',
  'Membro do Ministério Público',
];

const TERMINOLOGIA_POR_RITO = {
  REAA:    { INICIACAO: 'Iniciação', PASSAGEM_GRAU: 'Passagem de Grau', ELEVACAO: 'Elevação'  },
  YORK:    { INICIACAO: 'Iniciação', PASSAGEM_GRAU: 'Passagem',         ELEVACAO: 'Exaltação' },
  MODERNO: { INICIACAO: 'Iniciação', PASSAGEM_GRAU: 'Passagem de Grau', ELEVACAO: 'Elevação'  },
  MEMPHIS: { INICIACAO: 'Iniciação', PASSAGEM_GRAU: 'Passagem de Grau', ELEVACAO: 'Elevação'  },
  OUTRO:   { INICIACAO: 'Iniciação', PASSAGEM_GRAU: 'Passagem de Grau', ELEVACAO: 'Elevação'  },
};

export function getTerminologiaPadrao(rito) {
  return { ...(TERMINOLOGIA_POR_RITO[rito] || TERMINOLOGIA_POR_RITO.REAA) };
}
