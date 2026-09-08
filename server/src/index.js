import { config as loadEnv } from 'dotenv'
import { createApp } from './app.js'
import { createPool } from './db/pool.js'
import { runMigrations } from './db/migrate.js'
import { createReservationsRepository } from './repositories/reservations.js'

// Acepta el .env del workspace o el de la raiz del repo (npm run dev arranca desde server/).
loadEnv({ path: ['.env', '../.env'], quiet: true })

const PORT = Number(process.env.PORT ?? 3001)

async function main() {
  const pool = createPool()
  await runMigrations(pool)

  const app = createApp({ reservations: createReservationsRepository(pool) })
  const server = app.listen(PORT, () => {
    console.log(`[api] escuchando en http://localhost:${PORT}`)
  })

  const shutdown = async (signal) => {
    console.log(`[api] ${signal} recibido, cerrando...`)
    server.close(async () => {
      await pool.end()
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch((error) => {
  console.error('[api] no se pudo arrancar:', error.message)
  process.exit(1)
})
