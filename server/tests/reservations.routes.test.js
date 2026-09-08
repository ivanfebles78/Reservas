import request from 'supertest'
import { beforeEach, describe, expect, test } from 'vitest'
import { createApp } from '../src/app.js'
import { createFakeRepository, validReservationPayload } from './helpers/fake-repository.js'

let app
let repository

beforeEach(() => {
  repository = createFakeRepository()
  app = createApp({ reservations: repository, clientDist: '/ruta/que/no/existe' })
})

const createReservation = (overrides) =>
  request(app).post('/api/reservations').send(validReservationPayload(overrides))

describe('GET /api/health', () => {
  test('responde que el servicio esta vivo', async () => {
    const response = await request(app).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body.ok).toBe(true)
  })
})

describe('GET /api/meta', () => {
  test('devuelve los estados y publicos disponibles', async () => {
    const response = await request(app).get('/api/meta')

    expect(response.status).toBe(200)
    expect(response.body.data.statuses.map((status) => status.value)).toEqual([
      'solicitada',
      'reservada',
      'entregada',
      'cancelada',
      'caducada',
    ])
    expect(response.body.data.audiences).toHaveLength(3)
  })
})

describe('POST /api/reservations', () => {
  test('crea la reserva con estado solicitada y referencia legible', async () => {
    const response = await createReservation()

    expect(response.status).toBe(201)
    expect(response.body.data.status).toBe('solicitada')
    expect(response.body.data.reference).toMatch(/^R-\d{4,}$/)
    expect(response.body.data.items).toHaveLength(1)
  })

  test('guarda varios zapatos en una misma reserva', async () => {
    const response = await createReservation({
      items: [
        ...validReservationPayload().items,
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

    expect(response.status).toBe(201)
    expect(response.body.data.items).toHaveLength(2)
    expect(response.body.data.items[1].quantity).toBe(2)
  })

  test('devuelve 400 con el detalle por campo cuando faltan datos', async () => {
    const response = await createReservation({ customerName: '', email: 'no-es-un-correo' })

    expect(response.status).toBe(400)
    expect(response.body.fields.customerName).toBeDefined()
    expect(response.body.fields.email).toBeDefined()
  })

  test('devuelve 400 si la reserva no lleva ningun zapato', async () => {
    const response = await createReservation({ items: [] })

    expect(response.status).toBe(400)
    expect(response.body.fields.items).toBeDefined()
  })
})

describe('GET /api/reservations', () => {
  beforeEach(async () => {
    await createReservation({ customerName: 'Ana Perez' })
    await createReservation({ customerName: 'Luis Gomez', email: 'luis@example.com' })
  })

  test('lista las reservas con totales por estado', async () => {
    const response = await request(app).get('/api/reservations')

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(2)
    expect(response.body.meta.total).toBe(2)
    expect(response.body.meta.counts.solicitada).toBe(2)
  })

  test('filtra por estado', async () => {
    const [first] = (await request(app).get('/api/reservations')).body.data
    await request(app).patch('/api/reservations/' + first.id + '/status').send({ status: 'entregada' })

    const response = await request(app).get('/api/reservations?status=entregada')

    expect(response.body.data).toHaveLength(1)
    expect(response.body.data[0].id).toBe(first.id)
  })

  test('busca por texto libre en cliente y zapatos', async () => {
    const porCliente = await request(app).get('/api/reservations?q=luis')
    const porMarca = await request(app).get('/api/reservations?q=feelgrounds')

    expect(porCliente.body.data).toHaveLength(1)
    expect(porMarca.body.data).toHaveLength(2)
  })

  test('rechaza un filtro de estado desconocido', async () => {
    const response = await request(app).get('/api/reservations?status=pendiente')

    expect(response.status).toBe(400)
  })

  test('pagina los resultados', async () => {
    const response = await request(app).get('/api/reservations?limit=1&offset=1')

    expect(response.body.data).toHaveLength(1)
    expect(response.body.meta.total).toBe(2)
  })
})

describe('GET /api/reservations/:id', () => {
  test('devuelve la reserva solicitada', async () => {
    const created = await createReservation()

    const response = await request(app).get('/api/reservations/' + created.body.data.id)

    expect(response.status).toBe(200)
    expect(response.body.data.customerName).toBe('Ana Perez')
  })

  test('devuelve 404 con un identificador inexistente o mal formado', async () => {
    expect((await request(app).get('/api/reservations/no-es-un-uuid')).status).toBe(404)
    expect(
      (await request(app).get('/api/reservations/6f1c2f4e-0000-4000-8000-000000000000')).status,
    ).toBe(404)
  })
})

describe('PATCH /api/reservations/:id/status', () => {
  test('cambia el estado de la reserva', async () => {
    const created = await createReservation()

    const response = await request(app)
      .patch('/api/reservations/' + created.body.data.id + '/status')
      .send({ status: 'reservada' })

    expect(response.status).toBe(200)
    expect(response.body.data.status).toBe('reservada')
  })

  test('rechaza un estado que no existe', async () => {
    const created = await createReservation()

    const response = await request(app)
      .patch('/api/reservations/' + created.body.data.id + '/status')
      .send({ status: 'en-camino' })

    expect(response.status).toBe(400)
  })
})

describe('PUT /api/reservations/:id', () => {
  test('reemplaza los datos y los zapatos de la reserva', async () => {
    const created = await createReservation()

    const response = await request(app)
      .put('/api/reservations/' + created.body.data.id)
      .send(
        validReservationPayload({
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
        }),
      )

    expect(response.status).toBe(200)
    expect(response.body.data.customerName).toBe('Ana Perez Rodriguez')
    expect(response.body.data.items).toHaveLength(1)
    expect(response.body.data.items[0].brand).toBe('Bobux')
  })

  test('devuelve 404 si la reserva no existe', async () => {
    const response = await request(app)
      .put('/api/reservations/6f1c2f4e-0000-4000-8000-000000000000')
      .send(validReservationPayload())

    expect(response.status).toBe(404)
  })
})

describe('DELETE /api/reservations/:id', () => {
  test('elimina la reserva', async () => {
    const created = await createReservation()
    const url = '/api/reservations/' + created.body.data.id

    expect((await request(app).delete(url)).status).toBe(204)
    expect((await request(app).get(url)).status).toBe(404)
  })
})

describe('rutas desconocidas del API', () => {
  test('devuelven 404 en JSON', async () => {
    const response = await request(app).get('/api/lo-que-sea')

    expect(response.status).toBe(404)
    expect(response.body.ok).toBe(false)
  })
})

describe('errores inesperados del repositorio', () => {
  test('se traducen a un 500 sin filtrar detalles internos', async () => {
    const roto = createApp({
      reservations: {
        ...repository,
        list: async () => {
          throw new Error('la conexion con la base de datos se ha caido')
        },
      },
      clientDist: '/ruta/que/no/existe',
    })

    const response = await request(roto).get('/api/reservations')

    expect(response.status).toBe(500)
    expect(response.body.error).toBe('Error interno del servidor')
  })
})
