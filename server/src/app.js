import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import compression from 'compression'
import cookieParser from 'cookie-parser'
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
import { createRequireAuth, createSessionRouter } from './routes/session.js'

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
export function createApp({ reservations, auth, clientDist = CLIENT_DIST } = {}) {
  if (!auth?.password || !auth?.secret) {
    throw new Error('createApp necesita la configuracion de acceso (auth.password y auth.secret)')
  }

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
  app.use(cookieParser())

  // En produccion el API y la web comparten dominio, asi que no se emiten cabeceras CORS
  // salvo que se declare explicitamente un origen distinto en CLIENT_ORIGIN.
  const allowedOrigins = process.env.CLIENT_ORIGIN?.split(',').map((value) => value.trim())
  if (allowedOrigins?.length) {
    app.use(cors({ origin: allowedOrigins }))
  } else if (process.env.NODE_ENV !== 'production') {
    app.use(cors())
  }

  // Publico: lo consulta el healthcheck de Railway antes de que exista sesion.
  app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'reservas', uptime: process.uptime() })
  })

  app.use('/api/session', createSessionRouter(auth))

  // A partir de aqui todo exige sesion: son datos personales de clientes.
  const requireAuth = createRequireAuth(auth.secret)

  app.get('/api/meta', requireAuth, (req, res) => {
    res.json({
      ok: true,
      data: {
        statuses: RESERVATION_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })),
        audiences: AUDIENCES.map((value) => ({ value, label: AUDIENCE_LABELS[value] })),
      },
    })
  })

  app.use('/api/reservations', requireAuth, (req, res, next) =>
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
