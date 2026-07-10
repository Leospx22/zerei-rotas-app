export const OCCURRENCE_REASONS = [
  'Endereço não encontrado',
  'Comércio Fechado',
  'Área de Risco',
  'Cliente Ausente',
  'Mudança de Endereço',
  'Terceiro Recusou',
  'Cliente Recusou',
  'Palavra-Chave',
  'Item Perdido',
  'Item Danificado',
  'Clima Adverso',
  'Problemas Mecânicos',
  'Roubo/Assalto',
  'Desisti da Rota',
] as const;

export type OccurrenceReason = typeof OCCURRENCE_REASONS[number];
