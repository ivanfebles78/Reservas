import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import 'dotenv/config'
import { createPool } from './pool.js'

const schemaPath = join(dirname(fileURLToPath(import.meta.url)), 'schema.sql')

/** Aplica el esquema (idempotente) usando el pool recibido. */
export async function runMigrations(pool) {
  const sql = await readFile(schemaPath, 'utf8')
  await pool.query(sql)
}

// Permite lanzarlo a mano: `npm run migrate`
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const pool = createPool()
  try {
    await runMigrations(pool)
    console.log('[migrate] esquema aplicado correctamente')
  } catch (error) {
    console.error('[migrate] error aplicando el esquema:', error.message)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}
