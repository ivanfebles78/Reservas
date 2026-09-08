import type {
  ListFilters,
  ListMeta,
  Reservation,
  ReservationInput,
  ReservationStatus,
} from './types'

const BASE_URL = '/api'

/** Error del API con el detalle por campo que devuelve el servidor. */
export class ApiError extends Error {
  readonly status: number
  readonly fields: Record<string, string>

  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
  } catch {
    throw new ApiError(0, 'No se ha podido contactar con el servidor. Revisa tu conexión.')
  }

  if (response.status === 204) return undefined as T

  const payload = await response.json().catch(() => null)

  if (!response.ok || !payload?.ok) {
    throw new ApiError(
      response.status,
      payload?.error ?? 'Ha ocurrido un error inesperado',
      payload?.fields ?? {},
    )
  }

  return payload as T
}

function buildQuery(filters: ListFilters): string {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.q?.trim()) params.set('q', filters.q.trim())
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.offset) params.set('offset', String(filters.offset))
  const query = params.toString()
  return query ? `?${query}` : ''
}

export const api = {
  listReservations(filters: ListFilters = {}) {
    return request<{ data: Reservation[]; meta: ListMeta }>(
      `/reservations${buildQuery(filters)}`,
    )
  },

  createReservation(input: ReservationInput) {
    return request<{ data: Reservation }>('/reservations', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  updateReservation(id: string, input: ReservationInput) {
    return request<{ data: Reservation }>(`/reservations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  },

  updateStatus(id: string, status: ReservationStatus) {
    return request<{ data: Reservation }>(`/reservations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },

  deleteReservation(id: string) {
    return request<void>(`/reservations/${id}`, { method: 'DELETE' })
  },
}
