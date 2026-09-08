import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import compression from 'compression'
import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import {
  AUDIENCES,
  AUDIENCE_LABELS,
  RESERVATION_STATUSES,
  STATUS_LABELS,
} from './domain/constants.js'
import { errorHandler, notFoundHandler } from './middleware/errors.js'
import { createReservationsRouter } from './routes/reservations.js'

const serverDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CLIENT_DIST = resolve(serverDir, '..', 'client', 'dist')

const writeLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, error: 'Demasiadas peticiones, intentalo en un minuto' },
})

/**
 * Construye la app de Express. El repositorio se inyecta para poder
 * probar las rutas sin levantar PostgreSQL.
 */
export function createApp({ reservations, clientDist = CLIENT_DIST } = {}) {
  const app = express()

  app.set('trust proxy', 1)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          // Las tipografias se sirven desde Google Fonts (ver client/index.html).
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
        },
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  )
  app.use(compression())
  app.use(express.json({ limit: '256kb' }))

  // En produccion el API y la web comparten dominio, asi que no se emiten cabeceras CORS
  // salvo que se declare explicitamente un origen distinto en CLIENT_ORIGIN.
  const allowedOrigins = process.env.CLIENT_ORIGIN?.split(',').map((value) => value.trim())
  if (allowedOrigins?.length) {
    app.use(cors({ origin: allowedOrigins }))
  } else if (process.env.NODE_ENV !== 'production') {
    app.use(cors())
  }

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'reservas', uptime: process.uptime() })
  })

  app.get('/api/meta', (req, res) => {
    res.json({
      ok: true,
      data: {
        statuses: RESERVATION_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })),
        audiences: AUDIENCES.map((value) => ({ value, label: AUDIENCE_LABELS[value] })),
      },
    })
  })

  app.use(['/api/reservations'], (req, res, next) =>
    req.method === 'GET' ? next() : writeLimiter(req, res, next),
  )
  app.use('/api/reservations', createReservationsRouter(reservations))

  app.use('/api', notFoundHandler)

  // En produccion el mismo proceso sirve el build de React (un solo servicio en Railway).
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist, { maxAge: '1h', index: false }))
    app.get(/.*/, (req, res) => res.sendFile(join(clientDist, 'index.html')))
  }

  app.use(errorHandler)

  return app
}
