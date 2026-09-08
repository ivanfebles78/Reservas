import { randomUUID } from 'node:crypto'
import { DEFAULT_STATUS, buildReference } from '../../src/domain/constants.js'

/** Repositorio en memoria con el mismo contrato que el de PostgreSQL. */
export function createFakeRepository(seed = []) {
  let seq = 0
  const store = new Map()

  const persist = (data, existing) => {
    const now = new Date().toISOString()
    const reservation = {
      id: existing?.id ?? randomUUID(),
      reference: existing?.reference ?? buildReference(++seq),
      customerName: data.customerName,
      phone: data.phone,
      email: data.email,
      notes: data.notes ?? '',
      status: data.status ?? existing?.status ?? DEFAULT_STATUS,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      items: data.items.map((item) => ({ id: randomUUID(), details: '', ...item })),
    }
    store.set(reservation.id, reservation)
    return reservation
  }

  for (const item of seed) persist(item)

  const matchesSearch = (reservation, q) => {
    const haystack = [
      reservation.reference,
      reservation.customerName,
      reservation.phone,
      reservation.email,
      reservation.notes,
      ...reservation.items.flatMap((item) => [item.brand, item.model, item.color, item.details]),
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q.toLowerCase())
  }

  return {
    async list({ status, q, limit, offset }) {
      const all = [...store.values()]
        .filter((reservation) => !status || reservation.status === status)
        .filter((reservation) => !q || matchesSearch(reservation, q))
        .sort((a, b) => b.reference.localeCompare(a.reference))
      return { reservations: all.slice(offset, offset + limit), total: all.length, limit, offset }
    },
    async countsByStatus() {
      const counts = {}
      for (const reservation of store.values()) {
        counts[reservation.status] = (counts[reservation.status] ?? 0) + 1
      }
      return counts
    },
    async findById(id) {
      return store.get(id) ?? null
    },
    async create(data) {
      return persist(data)
    },
    async update(id, data) {
      const existing = store.get(id)
      return existing ? persist(data, existing) : null
    },
    async updateStatus(id, status) {
      const existing = store.get(id)
      if (!existing) return null
      const updated = { ...existing, status, updatedAt: new Date().toISOString() }
      store.set(id, updated)
      return updated
    },
    async remove(id) {
      return store.delete(id)
    },
  }
}

export const validReservationPayload = (overrides = {}) => ({
  customerName: 'Ana Perez',
  phone: '600 123 456',
  email: 'ana@example.com',
  notes: 'Prefiere recogerla el sabado',
  items: [
    {
      brand: 'Feelgrounds',
      model: 'Original Knit',
      color: 'Negro',
      audience: 'nina',
      size: '28',
      quantity: 1,
      details: 'Empeine ancho',
    },
  ],
  ...overrides,
})
