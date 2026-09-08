import { DEFAULT_STATUS, buildReference } from '../domain/constants.js'

const RESERVATION_COLUMNS = `
  r.id, r.seq, r.customer_name, r.phone, r.email, r.notes,
  r.status, r.created_at, r.updated_at
`

const SEARCH_CONDITION = `(
  r.customer_name ILIKE $SEARCH
  OR r.phone ILIKE $SEARCH
  OR r.email ILIKE $SEARCH
  OR r.notes ILIKE $SEARCH
  OR ('R-' || lpad(r.seq::text, 4, '0')) ILIKE $SEARCH
  OR EXISTS (
    SELECT 1 FROM reservation_items i
    WHERE i.reservation_id = r.id
      AND (i.brand ILIKE $SEARCH OR i.model ILIKE $SEARCH OR i.color ILIKE $SEARCH OR i.details ILIKE $SEARCH)
  )
)`

function mapReservation(row) {
  return {
    id: row.id,
    reference: buildReference(row.seq),
    customerName: row.customer_name,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: [],
  }
}

function mapItem(row) {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    color: row.color,
    audience: row.audience,
    size: row.size,
    quantity: row.quantity,
    details: row.details,
  }
}

/** Carga los zapatos de varias reservas en una sola consulta (evita N+1). */
async function attachItems(client, reservations) {
  if (reservations.length === 0) return reservations

  const byId = new Map(reservations.map((reservation) => [reservation.id, reservation]))
  const { rows } = await client.query(
    `SELECT * FROM reservation_items WHERE reservation_id = ANY($1::uuid[]) ORDER BY position ASC`,
    [[...byId.keys()]],
  )

  for (const row of rows) {
    byId.get(row.reservation_id)?.items.push(mapItem(row))
  }
  return reservations
}

async function insertItems(client, reservationId, items) {
  for (const [position, item] of items.entries()) {
    await client.query(
      `INSERT INTO reservation_items
         (reservation_id, position, brand, model, color, audience, size, quantity, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        reservationId,
        position,
        item.brand,
        item.model,
        item.color,
        item.audience,
        item.size,
        item.quantity,
        item.details ?? '',
      ],
    )
  }
}

async function withTransaction(pool, work) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export function createReservationsRepository(pool) {
  async function list({ status, q, limit, offset }) {
    const params = []
    const where = []

    if (status) {
      params.push(status)
      where.push(`r.status = $${params.length}`)
    }
    if (q) {
      params.push(`%${q}%`)
      where.push(SEARCH_CONDITION.replaceAll('$SEARCH', `$${params.length}`))
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const { rows: countRows } = await pool.query(
      `SELECT count(*)::int AS total FROM reservations r ${whereClause}`,
      params,
    )

    const { rows } = await pool.query(
      `SELECT ${RESERVATION_COLUMNS} FROM reservations r
       ${whereClause}
       ORDER BY r.created_at DESC, r.seq DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    )

    const reservations = await attachItems(pool, rows.map(mapReservation))
    return { reservations, total: countRows[0].total, limit, offset }
  }

  async function countsByStatus() {
    const { rows } = await pool.query(
      `SELECT status, count(*)::int AS total FROM reservations GROUP BY status`,
    )
    return rows.reduce((acc, row) => ({ ...acc, [row.status]: row.total }), {})
  }

  async function findById(id) {
    const { rows } = await pool.query(
      `SELECT ${RESERVATION_COLUMNS} FROM reservations r WHERE r.id = $1`,
      [id],
    )
    if (rows.length === 0) return null
    const [reservation] = await attachItems(pool, [mapReservation(rows[0])])
    return reservation
  }

  async function create(data) {
    return withTransaction(pool, async (client) => {
      const { rows } = await client.query(
        `INSERT INTO reservations (customer_name, phone, email, notes, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, seq, customer_name, phone, email, notes, status, created_at, updated_at`,
        [
          data.customerName,
          data.phone,
          data.email,
          data.notes ?? '',
          data.status ?? DEFAULT_STATUS,
        ],
      )
      const reservation = mapReservation(rows[0])
      await insertItems(client, reservation.id, data.items)
      const [withItems] = await attachItems(client, [reservation])
      return withItems
    })
  }

  async function update(id, data) {
    return withTransaction(pool, async (client) => {
      const { rows } = await client.query(
        `UPDATE reservations
         SET customer_name = $2, phone = $3, email = $4, notes = $5,
             status = COALESCE($6, status), updated_at = now()
         WHERE id = $1
         RETURNING id, seq, customer_name, phone, email, notes, status, created_at, updated_at`,
        [id, data.customerName, data.phone, data.email, data.notes ?? '', data.status ?? null],
      )
      if (rows.length === 0) return null

      await client.query('DELETE FROM reservation_items WHERE reservation_id = $1', [id])
      const reservation = mapReservation(rows[0])
      await insertItems(client, id, data.items)
      const [withItems] = await attachItems(client, [reservation])
      return withItems
    })
  }

  async function updateStatus(id, status) {
    const { rows } = await pool.query(
      `UPDATE reservations SET status = $2, updated_at = now() WHERE id = $1
       RETURNING id, seq, customer_name, phone, email, notes, status, created_at, updated_at`,
      [id, status],
    )
    if (rows.length === 0) return null
    const [reservation] = await attachItems(pool, [mapReservation(rows[0])])
    return reservation
  }

  async function remove(id) {
    const { rowCount } = await pool.query('DELETE FROM reservations WHERE id = $1', [id])
    return rowCount > 0
  }

  return { list, countsByStatus, findById, create, update, updateStatus, remove }
}
