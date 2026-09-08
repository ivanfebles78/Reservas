import request from 'supertest'
import { beforeEach, describe, expect, test } from 'vitest'
import { createApp } from '../src/app.js'
import {
  SESSION_COOKIE,
  createSessionToken,
  isValidSessionToken,
  matchesPassword,
  resolveAuthConfig,
} from '../src/domain/auth.js'
import { createFakeRepository, validReservationPayload } from './helpers/fake-repository.js'

const PASSWORD = 'clave-de-prueba'
const AUTH = { password: PASSWORD, secret: 'secreto-de-prueba' }

describe('matchesPassword', () => {
  test('acepta la clave correcta y rechaza cualquier otra', () => {
    expect(matchesPassword('secreta123', 'secreta123')).toBe(true)
    expect(matchesPassword('secreta124', 'secreta123')).toBe(false)
    expect(matchesPassword('', 'secreta123')).toBe(false)
  })

  test('rechaza valores que no son texto', () => {
    expect(matchesPassword(undefined, 'secreta123')).toBe(false)
    expect(matchesPassword({ toString: () => 'secreta123' }, 'secreta123')).toBe(false)
  })
})

describe('token de sesion', () => {
  test('el token recien emitido es valido', () => {
    expect(isValidSessionToken(createSessionToken('secreto'), 'secreto')).toBe(true)
  })

  test('caduca al pasar su fecha', () => {
    const now = Date.now()
    const token = createSessionToken('secreto', now, 1000)

    expect(isValidSessionToken(token, 'secreto', now + 500)).toBe(true)
    expect(isValidSessionToken(token, 'secreto', now + 1500)).toBe(false)
  })

  test('no vale con otro secreto ni manipulado', () => {
    const token = createSessionToken('secreto')
    const [expiresAt, signature] = token.split('.')

    expect(isValidSessionToken(token, 'otro-secreto')).toBe(false)
    expect(isValidSessionToken(`${Number(expiresAt) + 999999}.${signature}`, 'secreto')).toBe(false)
    expect(isValidSessionToken(`${expiresAt}.firma-inventada`, 'secreto')).toBe(false)
  })

  test('rechaza formatos que no son un token', () => {
    expect(isValidSessionToken(undefined, 'secreto')).toBe(false)
    expect(isValidSessionToken('', 'secreto')).toBe(false)
    expect(isValidSessionToken('sin-punto', 'secreto')).toBe(false)
    expect(isValidSessionToken('no-numerico.firma', 'secreto')).toBe(false)
  })
})

describe('resolveAuthConfig', () => {
  test('exige APP_PASSWORD para no dejar la aplicacion abierta', () => {
    expect(() => resolveAuthConfig({})).toThrow(/APP_PASSWORD/)
    expect(() => resolveAuthConfig({ APP_PASSWORD: '   ' })).toThrow(/APP_PASSWORD/)
  })

  test('exige una clave de longitud razonable', () => {
    expect(() => resolveAuthConfig({ APP_PASSWORD: 'corta' })).toThrow(/8 caracteres/)
  })

  test('usa SESSION_SECRET si existe y genera uno si no', () => {
    expect(resolveAuthConfig({ APP_PASSWORD: 'clave-larga', SESSION_SECRET: 'abc' }).secret).toBe(
      'abc',
    )
    expect(resolveAuthConfig({ APP_PASSWORD: 'clave-larga' }).secret).toHaveLength(64)
  })
})

describe('createApp', () => {
  test('no arranca sin configuracion de acceso', () => {
    expect(() => createApp({ reservations: createFakeRepository() })).toThrow(/acceso/)
  })
})

describe('rutas de sesion', () => {
  let app

  beforeEach(() => {
    app = createApp({
      reservations: createFakeRepository(),
      auth: AUTH,
      clientDist: '/ruta/que/no/existe',
    })
  })

  test('informa de que no hay sesion iniciada', async () => {
    const response = await request(app).get('/api/session')

    expect(response.status).toBe(200)
    expect(response.body.data.authenticated).toBe(false)
  })

  test('rechaza la clave incorrecta sin dejar cookie', async () => {
    const response = await request(app).post('/api/session').send({ password: 'no-es-la-clave' })

    expect(response.status).toBe(401)
    expect(response.body.fields.password).toBeDefined()
    expect(response.headers['set-cookie']).toBeUndefined()
  })

  test('inicia sesion con la clave correcta y deja una cookie httpOnly', async () => {
    const response = await request(app).post('/api/session').send({ password: PASSWORD })

    expect(response.status).toBe(200)
    expect(response.body.data.authenticated).toBe(true)

    const [cookie] = response.headers['set-cookie']
    expect(cookie).toContain(SESSION_COOKIE)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')
  })

  test('cierra la sesion', async () => {
    const agent = request.agent(app)
    await agent.post('/api/session').send({ password: PASSWORD })

    await agent.delete('/api/session')

    expect((await agent.get('/api/session')).body.data.authenticated).toBe(false)
  })
})

describe('proteccion de los datos de clientes', () => {
  let app

  beforeEach(() => {
    app = createApp({
      reservations: createFakeRepository(),
      auth: AUTH,
      clientDist: '/ruta/que/no/existe',
    })
  })

  test('el healthcheck sigue siendo publico', async () => {
    expect((await request(app).get('/api/health')).status).toBe(200)
  })

  test('sin sesion no se pueden leer ni escribir reservas', async () => {
    expect((await request(app).get('/api/reservations')).status).toBe(401)
    expect((await request(app).get('/api/meta')).status).toBe(401)
    expect(
      (await request(app).post('/api/reservations').send(validReservationPayload())).status,
    ).toBe(401)
    expect(
      (await request(app).delete('/api/reservations/6f1c2f4e-0000-4000-8000-000000000000')).status,
    ).toBe(401)
  })

  test('una cookie falsificada no abre la puerta', async () => {
    const response = await request(app)
      .get('/api/reservations')
      .set('Cookie', `${SESSION_COOKIE}=${createSessionToken('secreto-que-no-es')}`)

    expect(response.status).toBe(401)
  })

  test('con sesion iniciada se accede con normalidad', async () => {
    const agent = request.agent(app)
    await agent.post('/api/session').send({ password: PASSWORD })

    expect((await agent.get('/api/reservations')).status).toBe(200)
  })
})
