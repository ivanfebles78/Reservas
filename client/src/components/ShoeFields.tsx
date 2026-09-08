import { AUDIENCES, AUDIENCE_LABELS, type Audience, type ReservationItem } from '../api/types'
import { Field } from './Field'

interface ShoeFieldsProps {
  index: number
  item: ReservationItem
  errors: Record<string, string>
  canRemove: boolean
  onChange: (index: number, patch: Partial<ReservationItem>) => void
  onRemove: (index: number) => void
}

/** Bloque de datos de un zapato dentro de la reserva. */
export function ShoeFields({
  index,
  item,
  errors,
  canRemove,
  onChange,
  onRemove,
}: ShoeFieldsProps) {
  const errorFor = (field: keyof ReservationItem) => errors[`items.${index}.${field}`]

  return (
    <article className="surface relative overflow-hidden p-5 pl-6">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-clay/70" />

      <header className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-semibold">
          Zapato <span className="text-clay">{index + 1}</span>
        </h3>

        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="btn btn-ghost px-3 py-1 text-xs"
          >
            Quitar
          </button>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Marca" error={errorFor('brand')}>
          {(props) => (
            <input
              {...props}
              className="field-input"
              value={item.brand}
              placeholder="Feelgrounds"
              onChange={(event) => onChange(index, { brand: event.target.value })}
            />
          )}
        </Field>

        <Field label="Modelo" error={errorFor('model')}>
          {(props) => (
            <input
              {...props}
              className="field-input"
              value={item.model}
              placeholder="Original Knit"
              onChange={(event) => onChange(index, { model: event.target.value })}
            />
          )}
        </Field>

        <Field label="Color" error={errorFor('color')}>
          {(props) => (
            <input
              {...props}
              className="field-input"
              value={item.color}
              placeholder="Negro"
              onChange={(event) => onChange(index, { color: event.target.value })}
            />
          )}
        </Field>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="label-caps mb-1.5">Para</legend>
          <div className="flex rounded-full border border-line bg-[#fffdf9] p-1">
            {AUDIENCES.map((audience: Audience) => {
              const selected = item.audience === audience
              return (
                <label
                  key={audience}
                  className={[
                    'flex-1 cursor-pointer rounded-full px-3 py-1.5 text-center text-sm font-medium transition-colors',
                    selected
                      ? 'bg-ink text-paper'
                      : 'text-ink-soft hover:bg-paper-deep hover:text-ink',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name={`audience-${index}`}
                    value={audience}
                    checked={selected}
                    onChange={() => onChange(index, { audience })}
                  />
                  {AUDIENCE_LABELS[audience]}
                </label>
              )
            })}
          </div>
        </fieldset>

        <Field label="Talla" error={errorFor('size')}>
          {(props) => (
            <input
              {...props}
              className="field-input"
              value={item.size}
              placeholder="28"
              inputMode="numeric"
              onChange={(event) => onChange(index, { size: event.target.value })}
            />
          )}
        </Field>

        <Field label="Unidades" error={errorFor('quantity')}>
          {(props) => (
            <input
              {...props}
              className="field-input"
              type="number"
              min={1}
              max={50}
              value={item.quantity}
              onChange={(event) => onChange(index, { quantity: Number(event.target.value) })}
            />
          )}
        </Field>

        <Field
          label="Detalle"
          className="sm:col-span-2 lg:col-span-3"
          error={errorFor('details')}
          hint="Cualquier aclaración: empeine ancho, urgencia, regalo, segunda opción de color…"
        >
          {(props) => (
            <textarea
              {...props}
              className="field-input min-h-20 resize-y"
              value={item.details}
              onChange={(event) => onChange(index, { details: event.target.value })}
            />
          )}
        </Field>
      </div>
    </article>
  )
}
