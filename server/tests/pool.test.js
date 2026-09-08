import { afterEach, describe, expect, test } from 'vitest'
import { createPool, shouldUseSsl } from '../src/db/pool.js'

const originalEnv = { PGSSLMODE: process.env.PGSSLMODE, PGSSL: process.env.PGSSL }

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('shouldUseSsl', () => {
  test('no usa TLS por defecto (red privada de Railway)', () => {
    expect(shouldUseSsl('postgres://user:pass@localhost:5432/reservas')).toBe(false)
    expect(shouldUseSsl('postgres://user:pass@postgres.railway.internal:5432/railway')).toBe(false)
    expect(shouldUseSsl()).toBe(false)
  })

  test('usa TLS cuando la cadena lo pide con sslmode', () => {
    expect(shouldUseSsl('postgres://user:pass@neon.tech:5432/db?sslmode=require')).toBe(true)
    expect(shouldUseSsl('postgres://user:pass@host:5432/db?a=1&sslmode=verify-full')).toBe(true)
  })

  test('usa TLS cuando el entorno lo pide', () => {
    process.env.PGSSLMODE = 'require'
    expect(shouldUseSsl('postgres://user:pass@host:5432/db')).toBe(true)

    process.env.PGSSLMODE = ''
    process.env.PGSSL = 'true'
    expect(shouldUseSsl('postgres://user:pass@host:5432/db')).toBe(true)
  })

  test('PGSSLMODE=disable gana sobre la cadena de conexion', () => {
    process.env.PGSSLMODE = 'disable'
    expect(shouldUseSsl('postgres://user:pass@host:5432/db?sslmode=require')).toBe(false)
  })
})

describe('createPool', () => {
  test('falla con un mensaje claro si no hay DATABASE_URL', () => {
    expect(() => createPool(undefined)).toThrow(/DATABASE_URL/)
  })

  test('crea el pool con una cadena valida', async () => {
    const pool = createPool('postgres://user:pass@localhost:5432/reservas')

    expect(pool).toBeDefined()
    await pool.end()
  })
})
