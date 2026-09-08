import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { runMigrations } from '../src/db/migrate.js'
import { createPool } from '../src/db/pool.js'
import { createReservationsRepository } from '../src/repositories/reservations.js'
import { validReservationPayload } from './helpers/fake-repository.js'

/**
 * Pruebas de integracion contra un PostgreSQL real.
 * Se ejecutan solo si TEST_DATABASE_URL esta definida (ver `npm run test:db`).
 */
const connectionString = process.env.TEST_DATABASE_URL

describe.skipIf(!connectionString)('repositorio de reservas (PostgreSQL)', () => {
  let pool
  let repository

  beforeAll(async () => {
    pool = createPool(connectionString)
    await runMigrations(pool)
    repository = createReservationsRepository(pool)
  })

  afterAll(async () => {
    await pool?.end()
  })

  beforeEach(async () => {
    await pool.query('TRUNCATE reservations RESTART IDENTITY CASCADE')
  })

  const listAll = () => repository.list({ limit: 50, offset: 0 })

  test('guarda la reserva con sus zapatos y le asigna referencia correlativa', async () => {
    const first = await repository.create(validReservationPayload())
    const second = await repository.create(validReservationPayload({ customerName: 'Luis Gomez' }))

    expect(first.reference).toBe('R-0001')
    expect(second.reference).toBe('R-0002')
    expect(first.status).toBe('solicitada')
    expect(first.items).toHaveLength(1)
    expect(first.items[0].brand).toBe('Feelgrounds')
  })

  test('conserva el orden de los zapatos dentro de la reserva', async () => {
    const created = await repository.create(
      validReservationPayload({
        items: ['Uno', 'Dos', 'Tres'].map((model, index) => ({
          brand: 'Marca',
          model,
          color: 'Negro',
          audience: 'unisex',
          size: String(25 + index),
          quantity: 1,
          details: '',
        })),
      }),
    )

    const stored = await repository.findById(created.id)

    expect(stored.items.map((item) => item.model)).toEqual(['Uno', 'Dos', 'Tres'])
  })

  test('devuelve null al buscar una reserva inexistente', async () => {
    expect(await repository.findById('6f1c2f4e-0000-4000-8000-000000000000')).toBeNull()
  })

  test('filtra por estado y cuenta las reservas agrupadas', async () => {
    const entregada = await repository.create(validReservationPayload())
    await repository.create(validReservationPayload({ customerName: 'Luis Gomez' }))
    await repository.updateStatus(entregada.id, 'entregada')

    const filtradas = await repository.list({ status: 'entregada', limit: 50, offset: 0 })
    const counts = await repository.countsByStatus()

    expect(filtradas.reservations).toHaveLength(1)
    expect(filtradas.total).toBe(1)
    expect(counts).toEqual({ entregada: 1, solicitada: 1 })
  })

  test('busca por texto en el cliente, la referencia y los zapatos', async () => {
    await repository.create(validReservationPayload({ customerName: 'Ana Perez' }))
    await repository.create(
      validReservationPayload({
        customerName: 'Luis Gomez',
        items: [
          {
            brand: 'Bobux',
            model: 'Xplorer',
            color: 'Rojo',
            audience: 'nino',
            size: '24',
            quantity: 2,
            details: 'Le aprieta el 23',
          },
        ],
      }),
    )

    const porCliente = await repository.list({ q: 'perez', limit: 50, offset: 0 })
    const porMarca = await repository.list({ q: 'bobux', limit: 50, offset: 0 })
    const porDetalle = await repository.list({ q: 'aprieta', limit: 50, offset: 0 })
    const porReferencia = await repository.list({ q: 'R-0001', limit: 50, offset: 0 })

    expect(porCliente.reservations).toHaveLength(1)
    expect(porMarca.reservations[0].customerName).toBe('Luis Gomez')
    expect(porDetalle.reservations).toHaveLength(1)
    expect(porReferencia.reservations[0].reference).toBe('R-0001')
  })

  test('pagina los resultados de la lista', async () => {
    await repository.create(validReservationPayload())
    await repository.create(validReservationPayload({ customerName: 'Luis Gomez' }))
    await repository.create(validReservationPayload({ customerName: 'Marta Diaz' }))

    const page = await repository.list({ limit: 2, offset: 2 })

    expect(page.reservations).toHaveLength(1)
    expect(page.total).toBe(3)
  })

  test('reemplaza los zapatos al actualizar la reserva', async () => {
    const created = await repository.create(validReservationPayload())

    const updated = await repository.update(created.id, {
      ...validReservationPayload(),
      customerName: 'Ana Perez Rodriguez',
      items: [
        {
          brand: 'Bobux',
          model: 'Xplorer',
          color: 'Rojo',
          audience: 'nino',
          size: '24',
          quantity: 2,
          details: '',
        },
      ],
    })

    const { rows } = await pool.query('SELECT count(*)::int AS total FROM reservation_items')

    expect(updated.customerName).toBe('Ana Perez Rodriguez')
    expect(updated.items).toHaveLength(1)
    expect(updated.reference).toBe(created.reference)
    expect(rows[0].total).toBe(1)
  })

  test('devuelve null al actualizar o cambiar el estado de una reserva inexistente', async () => {
    const ghost = '6f1c2f4e-0000-4000-8000-000000000000'

    expect(await repository.update(ghost, validReservationPayload())).toBeNull()
    expect(await repository.updateStatus(ghost, 'reservada')).toBeNull()
    expect(await repository.remove(ghost)).toBe(false)
  })

  test('elimina la reserva y sus zapatos en cascada', async () => {
    const created = await repository.create(validReservationPayload())

    expect(await repository.remove(created.id)).toBe(true)

    const { rows } = await pool.query('SELECT count(*)::int AS total FROM reservation_items')
    expect(rows[0].total).toBe(0)
    expect((await listAll()).total).toBe(0)
  })

  test('rechaza estados fuera del catalogo (restriccion CHECK)', async () => {
    const created = await repository.create(validReservationPayload())

    await expect(repository.updateStatus(created.id, 'pendiente')).rejects.toThrow()
  })

  test('deshace la insercion completa si un zapato es invalido', async () => {
    await expect(
      repository.create(
        validReservationPayload({
          items: [
            { brand: 'A', model: 'B', color: 'C', audience: 'unisex', size: '25', quantity: 1 },
            { brand: 'A', model: 'B', color: 'C', audience: 'unisex', size: '25', quantity: 0 },
          ],
        }),
      ),
    ).rejects.toThrow()

    expect((await listAll()).total).toBe(0)
  })
})
