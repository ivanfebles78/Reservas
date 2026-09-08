import { config } from 'dotenv'
import { defineConfig } from 'vitest/config'

// Permite definir TEST_DATABASE_URL en .env (raiz o workspace) para las pruebas de integracion.
config({ path: ['.env', '../.env'], quiet: true })

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL)

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // Las pruebas de integracion comparten una unica base de datos: sin paralelismo entre ficheros.
    fileParallelism: !hasDatabase,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.js'],
      // Sin base de datos de pruebas el repositorio no se ejercita, asi que queda fuera del umbral.
      exclude: ['src/index.js', 'src/db/migrate.js', ...(hasDatabase ? [] : ['src/repositories/**'])],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
})
