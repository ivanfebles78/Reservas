import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  createSessionToken,
  isValidSessionToken,
  matchesPassword,
} from '../domain/auth.js'
import { HttpError } from '../middleware/errors.js'

/** Freno a la fuerza bruta sobre la clave de acceso. */
const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { ok: false, error: 'Demasiados intentos fallidos. Espera unos minutos.' },
})

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  }
}

export function createSessionRouter({ password, secret }) {
  const router = Router()

  router.get('/', (req, res) => {
    res.json({
      ok: true,
      data: { authenticated: isValidSessionToken(req.cookies?.[SESSION_COOKIE], secret) },
    })
  })

  router.post('/', loginLimiter, (req, res) => {
    if (!matchesPassword(req.body?.password, password)) {
      throw new HttpError(401, 'La clave no es correcta', { password: 'Clave incorrecta' })
    }

    res.cookie(SESSION_COOKIE, createSessionToken(secret), cookieOptions())
    res.json({ ok: true, data: { authenticated: true } })
  })

  router.delete('/', (req, res) => {
    res.clearCookie(SESSION_COOKIE, { ...cookieOptions(), maxAge: undefined })
    res.json({ ok: true, data: { authenticated: false } })
  })

  return router
}

/** Protege las rutas que exponen datos de clientes. */
export function createRequireAuth(secret) {
  return function requireAuth(req, res, next) {
    if (!isValidSessionToken(req.cookies?.[SESSION_COOKIE], secret)) {
      next(new HttpError(401, 'Necesitas iniciar sesion'))
      return
    }
    next()
  }
}
