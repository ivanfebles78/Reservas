/**
 * Vocabulario compartido entre el API y el cliente.
 * Los valores son los que se guardan en PostgreSQL; las etiquetas son las que ve el usuario.
 */

export const RESERVATION_STATUSES = [
  'solicitada',
  'reservada',
  'entregada',
  'cancelada',
  'caducada',
]

export const STATUS_LABELS = {
  solicitada: 'Solicitada',
  reservada: 'Reservada',
  entregada: 'Entregada',
  cancelada: 'Cancelada',
  caducada: 'Caducada',
}

export const DEFAULT_STATUS = 'solicitada'

export const AUDIENCES = ['nino', 'nina', 'unisex']

export const AUDIENCE_LABELS = {
  nino: 'Nino',
  nina: 'Nina',
  unisex: 'Unisex',
}

export const MAX_ITEMS_PER_RESERVATION = 20
export const MAX_QUANTITY_PER_ITEM = 50
export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 200

/** Convierte el numero de secuencia de la tabla en una referencia legible (R-0007). */
export function buildReference(seq) {
  return `R-${String(seq).padStart(4, '0')}`
}
