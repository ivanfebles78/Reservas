export const STATUSES = [
  'solicitada',
  'reservada',
  'entregada',
  'cancelada',
  'caducada',
] as const

export type ReservationStatus = (typeof STATUSES)[number]

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  solicitada: 'Solicitada',
  reservada: 'Reservada',
  entregada: 'Entregada',
  cancelada: 'Cancelada',
  caducada: 'Caducada',
}

/** Clases de color por estado; se resuelven contra los tokens de index.css. */
export const STATUS_STYLES: Record<ReservationStatus, string> = {
  solicitada: 'bg-amber-wash text-ink border-amber-wash',
  reservada: 'bg-sage-wash text-sage border-sage-wash',
  entregada: 'bg-sage text-paper border-sage',
  cancelada: 'bg-clay-wash text-clay-deep border-clay-wash',
  caducada: 'bg-slate-wash text-ink-soft border-slate-wash',
}

export const AUDIENCES = ['nino', 'nina', 'unisex'] as const

export type Audience = (typeof AUDIENCES)[number]

export const AUDIENCE_LABELS: Record<Audience, string> = {
  nino: 'Niño',
  nina: 'Niña',
  unisex: 'Unisex',
}

export interface ReservationItem {
  id?: string
  brand: string
  model: string
  color: string
  audience: Audience
  size: string
  quantity: number
  details: string
}

export interface Reservation {
  id: string
  reference: string
  customerName: string
  phone: string
  email: string
  notes: string
  status: ReservationStatus
  createdAt: string
  updatedAt: string
  items: ReservationItem[]
}

export interface ReservationInput {
  customerName: string
  phone: string
  email: string
  notes: string
  items: ReservationItem[]
}

export interface ListMeta {
  total: number
  limit: number
  offset: number
  counts: Partial<Record<ReservationStatus, number>>
}

export interface ListFilters {
  status?: ReservationStatus | ''
  q?: string
  limit?: number
  offset?: number
}
