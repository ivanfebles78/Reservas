import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'reservas_session'

/** Duracion de la sesion: una semana, suficiente para no reintroducir la clave a diario. */
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

/** Comparacion en tiempo constante: no filtra cuantos caracteres de la clave son correctos. */
export function matchesPassword(candidate, expected) {
  if (typeof candidate !== 'string' || typeof expected !== 'string') return false

  // Se comparan los digest para que ambos buffers midan siempre lo mismo.
  const a = createHmac('sha256', 'password-compare').update(candidate).digest()
  const b = createHmac('sha256', 'password-compare').update(expected).digest()
  return timingSafeEqual(a, b)
}

function sign(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

/** Token autocontenido `caducidad.firma`: no hace falta almacen de sesiones. */
export function createSessionToken(secret, now = Date.now(), maxAgeMs = SESSION_MAX_AGE_MS) {
  const expiresAt = String(now + maxAgeMs)
  return `${expiresAt}.${sign(expiresAt, secret)}`
}

export function isValidSessionToken(token, secret, now = Date.now()) {
  if (typeof token !== 'string') return false

  const [expiresAt, signature] = token.split('.')
  if (!expiresAt || !signature) return false
  if (!/^\d+$/.test(expiresAt) || Number(expiresAt) <= now) return false

  const expected = Buffer.from(sign(expiresAt, secret))
  const received = Buffer.from(signature)
  return expected.length === received.length && timingSafeEqual(expected, received)
}

/**
 * Configuracion de acceso. La clave es obligatoria: la aplicacion guarda datos
 * personales de clientes y no debe quedar abierta por olvidar una variable.
 */
export function resolveAuthConfig(env = process.env) {
  const password = env.APP_PASSWORD?.trim()

  if (!password) {
    throw new Error(
      'Falta APP_PASSWORD. Define la clave de acceso a la aplicacion (variable de entorno).',
    )
  }
  if (password.length < 8) {
    throw new Error('APP_PASSWORD debe tener al menos 8 caracteres.')
  }

  return {
    password,
    // Sin SESSION_SECRET las sesiones caducan en cada reinicio; con ella sobreviven al despliegue.
    secret: env.SESSION_SECRET?.trim() || randomBytes(32).toString('hex'),
  }
}
