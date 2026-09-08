import pg from 'pg'

const { Pool } = pg

/**
 * TLS desactivado por defecto: Railway conecta el servicio con su Postgres por la red privada,
 * que no negocia SSL (activarlo aborta el arranque con "server does not support SSL connections").
 * Se activa de forma explicita cuando el proveedor lo exige (Neon, Supabase, Heroku...):
 *   - `?sslmode=require` (o `verify-full`) en la cadena de conexion, o
 *   - `PGSSLMODE=require` / `PGSSL=true` en el entorno.
 */
export function shouldUseSsl(connectionString = '') {
  const mode = process.env.PGSSLMODE ?? ''
  if (mode === 'disable') return false
  if (process.env.PGSSL === 'true') return true
  if (/^(require|verify-ca|verify-full|prefer)$/.test(mode)) return true
  return /[?&]sslmode=(require|verify-ca|verify-full|prefer)/i.test(connectionString)
}

export function createPool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error(
      'Falta DATABASE_URL. Copia .env.example a .env o enlaza el servicio Postgres en Railway.',
    )
  }

  return new Pool({
    connectionString,
    ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : false,
    max: Number(process.env.PGPOOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  })
}
