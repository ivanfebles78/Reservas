import { Router } from 'express'
import {
  formatIssues,
  idSchema,
  listQuerySchema,
  reservationSchema,
  statusSchema,
} from '../domain/validation.js'
import { HttpError } from '../middleware/errors.js'

/** Valida con Zod y convierte cualquier fallo en un 400 con el detalle por campo. */
function parseOrThrow(schema, value, message) {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new HttpError(400, message, formatIssues(result.error))
  }
  return result.data
}

function parseId(value) {
  const result = idSchema.safeParse(value)
  if (!result.success) throw new HttpError(404, 'Reserva no encontrada')
  return result.data
}

/** Envuelve handlers async para que sus rechazos lleguen al errorHandler. */
const asyncRoute = (handler) => (req, res, next) => handler(req, res, next).catch(next)

export function createReservationsRouter(reservations) {
  const router = Router()

  router.get(
    '/',
    asyncRoute(async (req, res) => {
      const query = parseOrThrow(listQuerySchema, req.query, 'Filtros no validos')
      const [page, counts] = await Promise.all([
        reservations.list(query),
        reservations.countsByStatus(),
      ])
      res.json({
        ok: true,
        data: page.reservations,
        meta: { total: page.total, limit: page.limit, offset: page.offset, counts },
      })
    }),
  )

  router.get(
    '/:id',
    asyncRoute(async (req, res) => {
      const reservation = await reservations.findById(parseId(req.params.id))
      if (!reservation) throw new HttpError(404, 'Reserva no encontrada')
      res.json({ ok: true, data: reservation })
    }),
  )

  router.post(
    '/',
    asyncRoute(async (req, res) => {
      const data = parseOrThrow(reservationSchema, req.body, 'Revisa los datos de la reserva')
      const reservation = await reservations.create(data)
      res.status(201).json({ ok: true, data: reservation })
    }),
  )

  router.put(
    '/:id',
    asyncRoute(async (req, res) => {
      const id = parseId(req.params.id)
      const data = parseOrThrow(reservationSchema, req.body, 'Revisa los datos de la reserva')
      const reservation = await reservations.update(id, data)
      if (!reservation) throw new HttpError(404, 'Reserva no encontrada')
      res.json({ ok: true, data: reservation })
    }),
  )

  router.patch(
    '/:id/status',
    asyncRoute(async (req, res) => {
      const id = parseId(req.params.id)
      const { status } = parseOrThrow(statusSchema, req.body, 'Estado no valido')
      const reservation = await reservations.updateStatus(id, status)
      if (!reservation) throw new HttpError(404, 'Reserva no encontrada')
      res.json({ ok: true, data: reservation })
    }),
  )

  router.delete(
    '/:id',
    asyncRoute(async (req, res) => {
      const deleted = await reservations.remove(parseId(req.params.id))
      if (!deleted) throw new HttpError(404, 'Reserva no encontrada')
      res.status(204).end()
    }),
  )

  return router
}
