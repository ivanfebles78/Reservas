import { z } from 'zod'
import {
  AUDIENCES,
  DEFAULT_PAGE_SIZE,
  MAX_ITEMS_PER_RESERVATION,
  MAX_PAGE_SIZE,
  MAX_QUANTITY_PER_ITEM,
  RESERVATION_STATUSES,
} from './constants.js'

const trimmed = (max) => z.string().trim().max(max)
const requiredText = (max, field) =>
  trimmed(max).min(1, { message: `${field} es obligatorio` })

export const itemSchema = z.object({
  brand: requiredText(80, 'La marca'),
  model: requiredText(120, 'El modelo'),
  color: requiredText(60, 'El color'),
  audience: z.enum(AUDIENCES),
  size: requiredText(20, 'La talla'),
  quantity: z.coerce
    .number()
    .int({ message: 'Las unidades deben ser un numero entero' })
    .min(1, { message: 'Minimo 1 unidad' })
    .max(MAX_QUANTITY_PER_ITEM, { message: `Maximo ${MAX_QUANTITY_PER_ITEM} unidades` }),
  details: trimmed(1000).default(''),
})

export const reservationSchema = z.object({
  customerName: requiredText(120, 'El nombre del cliente'),
  phone: requiredText(30, 'El telefono').regex(/^[0-9+()\s.-]{6,30}$/, {
    message: 'El telefono solo admite numeros y los signos + ( ) . -',
  }),
  email: trimmed(160).pipe(z.email({ message: 'El correo electronico no es valido' })),
  notes: trimmed(2000).default(''),
  status: z.enum(RESERVATION_STATUSES).optional(),
  items: z
    .array(itemSchema)
    .min(1, { message: 'Anade al menos un zapato a la reserva' })
    .max(MAX_ITEMS_PER_RESERVATION, {
      message: `Maximo ${MAX_ITEMS_PER_RESERVATION} zapatos por reserva`,
    }),
})

export const statusSchema = z.object({
  status: z.enum(RESERVATION_STATUSES),
})

export const listQuerySchema = z.object({
  status: z.enum(RESERVATION_STATUSES).optional(),
  q: trimmed(120).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  offset: z.coerce.number().int().min(0).default(0),
})

export const idSchema = z.uuid({ message: 'Identificador no valido' })

/** Aplana los errores de Zod a `{ campo: mensaje }` para pintarlos junto a cada input. */
export function formatIssues(error) {
  const fields = {}
  for (const issue of error.issues) {
    const path = issue.path.join('.')
    if (!(path in fields)) fields[path] = issue.message
  }
  return fields
}
