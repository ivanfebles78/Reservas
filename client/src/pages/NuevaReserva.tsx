import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, api } from '../api/client'
import type { ReservationItem } from '../api/types'
import { Field } from '../components/Field'
import { ShoeFields } from '../components/ShoeFields'

const emptyItem = (): ReservationItem => ({
  brand: '',
  model: '',
  color: '',
  audience: 'unisex',
  size: '',
  quantity: 1,
  details: '',
})

const emptyForm = () => ({
  customerName: '',
  phone: '',
  email: '',
  notes: '',
  items: [emptyItem()],
})

export function NuevaReserva() {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')
  const [saved, setSaved] = useState<{ reference: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const totalPairs = form.items.reduce((total, item) => total + (item.quantity || 0), 0)

  const updateItem = (index: number, patch: Partial<ReservationItem>) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, position) =>
        position === index ? { ...item, ...patch } : item,
      ),
    }))
  }

  const addItem = () => {
    setForm((current) => ({ ...current, items: [...current.items, emptyItem()] }))
  }

  const removeItem = (index: number) => {
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, position) => position !== index),
    }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setErrors({})
    setGeneralError('')
    setSaved(null)

    try {
      const { data } = await api.createReservation(form)
      setSaved({ reference: data.reference })
      setForm(emptyForm())
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fields)
        setGeneralError(error.message)
      } else {
        setGeneralError('Ha ocurrido un error inesperado al guardar la reserva.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-2xl">
        <p className="label-caps">Alta de peticiones</p>
        <h1 className="mt-2 font-display text-4xl font-semibold leading-tight sm:text-5xl">
          Nueva reserva
        </h1>
        <p className="mt-3 text-ink-soft">
          Anota los datos del cliente y los zapatos que quiere reservar. Puedes añadir tantos pares
          como necesites en la misma petición.
        </p>
      </header>

      {saved && (
        <div
          role="status"
          className="surface flex flex-wrap items-center gap-3 border-sage/40 bg-sage-wash px-5 py-4"
        >
          <span className="font-display text-lg font-semibold text-sage">
            Reserva {saved.reference} guardada
          </span>
          <Link to="/reservas" className="btn btn-ghost ml-auto">
            Ver todas las reservas
          </Link>
        </div>
      )}

      {generalError && (
        <div
          role="alert"
          className="surface border-clay/40 bg-clay-wash px-5 py-4 text-sm font-medium text-clay-deep"
        >
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-8" noValidate>
        <section className="surface p-6">
          <h2 className="mb-5 font-display text-xl font-semibold">Cliente</h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Nombre y apellidos" error={errors.customerName}>
              {(props) => (
                <input
                  {...props}
                  className="field-input"
                  value={form.customerName}
                  placeholder="Ana Pérez"
                  autoComplete="name"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, customerName: event.target.value }))
                  }
                />
              )}
            </Field>

            <Field label="Teléfono" error={errors.phone}>
              {(props) => (
                <input
                  {...props}
                  className="field-input"
                  type="tel"
                  value={form.phone}
                  placeholder="600 123 456"
                  autoComplete="tel"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              )}
            </Field>

            <Field label="Correo electrónico" error={errors.email}>
              {(props) => (
                <input
                  {...props}
                  className="field-input"
                  type="email"
                  value={form.email}
                  placeholder="ana@ejemplo.com"
                  autoComplete="email"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, email: event.target.value }))
                  }
                />
              )}
            </Field>

            <Field
              label="Notas de la reserva"
              className="sm:col-span-2 lg:col-span-3"
              error={errors.notes}
              hint="Opcional: acuerdos de recogida, forma de pago, avisos…"
            >
              {(props) => (
                <textarea
                  {...props}
                  className="field-input min-h-20 resize-y"
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, notes: event.target.value }))
                  }
                />
              )}
            </Field>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold">Zapatos</h2>
              <p className="text-sm text-ink-soft">
                {form.items.length} {form.items.length === 1 ? 'modelo' : 'modelos'} · {totalPairs}{' '}
                {totalPairs === 1 ? 'par' : 'pares'} en total
              </p>
            </div>

            <button type="button" onClick={addItem} className="btn btn-ghost">
              + Añadir otro zapato
            </button>
          </div>

          {errors.items && (
            <p role="alert" className="text-sm font-medium text-clay-deep">
              {errors.items}
            </p>
          )}

          {form.items.map((item, index) => (
            <ShoeFields
              key={index}
              index={index}
              item={item}
              errors={errors}
              canRemove={form.items.length > 1}
              onChange={updateItem}
              onRemove={removeItem}
            />
          ))}
        </section>

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
          <button type="submit" className="btn btn-primary px-7" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar reserva'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={saving}
            onClick={() => {
              setForm(emptyForm())
              setErrors({})
              setGeneralError('')
            }}
          >
            Vaciar formulario
          </button>
          <p className="text-xs text-ink-soft">
            La reserva se guarda con el estado <strong>Solicitada</strong>.
          </p>
        </div>
      </form>
    </div>
  )
}
