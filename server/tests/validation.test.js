import { describe, expect, test } from 'vitest'
import {
  formatIssues,
  itemSchema,
  listQuerySchema,
  reservationSchema,
} from '../src/domain/validation.js'
import { buildReference } from '../src/domain/constants.js'
import { validReservationPayload } from './helpers/fake-repository.js'

describe('reservationSchema', () => {
  test('acepta una reserva completa y recorta los espacios sobrantes', () => {
    const result = reservationSchema.safeParse(
      validReservationPayload({ customerName: '  Ana Perez  ' }),
    )

    expect(result.success).toBe(true)
    expect(result.data.customerName).toBe('Ana Perez')
  })

  test('rechaza una reserva sin ningun zapato', () => {
    const result = reservationSchema.safeParse(validReservationPayload({ items: [] }))

    expect(result.success).toBe(false)
    expect(formatIssues(result.error).items).toMatch(/al menos un zapato/i)
  })

  test('rechaza un correo electronico invalido', () => {
    const result = reservationSchema.safeParse(validReservationPayload({ email: 'ana@' }))

    expect(result.success).toBe(false)
    expect(formatIssues(result.error).email).toMatch(/correo/i)
  })

  test('rechaza un telefono con letras', () => {
    const result = reservationSchema.safeParse(validReservationPayload({ phone: 'llamar luego' }))

    expect(result.success).toBe(false)
    expect(formatIssues(result.error).phone).toBeDefined()
  })

  test('acepta un estado valido y rechaza uno inventado', () => {
    expect(reservationSchema.safeParse(validReservationPayload({ status: 'entregada' })).success).toBe(true)
    expect(reservationSchema.safeParse(validReservationPayload({ status: 'pendiente' })).success).toBe(false)
  })
})

describe('itemSchema', () => {
  test('convierte las unidades numericas enviadas como texto', () => {
    const result = itemSchema.safeParse({
      brand: 'Vivobarefoot',
      model: 'Primus',
      color: 'Azul',
      audience: 'nino',
      size: '30',
      quantity: '3',
    })

    expect(result.success).toBe(true)
    expect(result.data.quantity).toBe(3)
    expect(result.data.details).toBe('')
  })

  test('rechaza cantidades menores que uno', () => {
    const base = { brand: 'A', model: 'B', color: 'C', audience: 'unisex', size: '25' }

    expect(itemSchema.safeParse({ ...base, quantity: 0 }).success).toBe(false)
    expect(itemSchema.safeParse({ ...base, quantity: 1.5 }).success).toBe(false)
  })

  test('rechaza un publico que no sea nino, nina o unisex', () => {
    const result = itemSchema.safeParse({
      brand: 'A',
      model: 'B',
      color: 'C',
      audience: 'bebe',
      size: '25',
      quantity: 1,
    })

    expect(result.success).toBe(false)
  })
})

describe('listQuerySchema', () => {
  test('aplica limite y desplazamiento por defecto', () => {
    const result = listQuerySchema.parse({})

    expect(result.limit).toBe(50)
    expect(result.offset).toBe(0)
  })

  test('rechaza un limite por encima del maximo permitido', () => {
    expect(listQuerySchema.safeParse({ limit: 5000 }).success).toBe(false)
  })
})

describe('buildReference', () => {
  test('formatea la secuencia como referencia legible', () => {
    expect(buildReference(7)).toBe('R-0007')
    expect(buildReference(12345)).toBe('R-12345')
  })
})
