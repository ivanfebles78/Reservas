import {
  AUDIENCE_LABELS,
  STATUSES,
  STATUS_LABELS,
  STATUS_STYLES,
  type Reservation,
  type ReservationStatus,
} from '../api/types'

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

interface ReservationRowProps {
  reservation: Reservation
  expanded: boolean
  busy: boolean
  onToggle: (id: string) => void
  onStatusChange: (id: string, status: ReservationStatus) => void
  onDelete: (reservation: Reservation) => void
}

export function ReservationRow({
  reservation,
  expanded,
  busy,
  onToggle,
  onStatusChange,
  onDelete,
}: ReservationRowProps) {
  const pairs = reservation.items.reduce((total, item) => total + item.quantity, 0)
  const detailId = `detalle-${reservation.id}`

  return (
    <>
      <tr className={`border-t border-line/70 align-top ${busy ? 'opacity-60' : ''}`}>
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() => onToggle(reservation.id)}
            aria-expanded={expanded}
            aria-controls={detailId}
            className="font-display text-sm font-semibold text-clay underline-offset-4 hover:underline"
          >
            {reservation.reference}
          </button>
          <p className="mt-0.5 text-xs text-ink-soft">
            {dateFormatter.format(new Date(reservation.createdAt))}
          </p>
        </td>

        <td className="px-4 py-3">
          <p className="font-medium">{reservation.customerName}</p>
          <p className="text-xs text-ink-soft">
            <a href={`tel:${reservation.phone.replace(/\s/g, '')}`} className="hover:text-clay">
              {reservation.phone}
            </a>
            {' · '}
            <a href={`mailto:${reservation.email}`} className="hover:text-clay">
              {reservation.email}
            </a>
          </p>
        </td>

        <td className="px-4 py-3">
          <p className="text-sm">
            {reservation.items.length}{' '}
            {reservation.items.length === 1 ? 'modelo' : 'modelos'} · {pairs}{' '}
            {pairs === 1 ? 'par' : 'pares'}
          </p>
          <p className="truncate text-xs text-ink-soft" title={reservation.items.map((item) => `${item.brand} ${item.model}`).join(', ')}>
            {reservation.items.map((item) => `${item.brand} ${item.model}`).join(', ')}
          </p>
        </td>

        <td className="px-4 py-3">
          <label className="sr-only" htmlFor={`estado-${reservation.id}`}>
            Estado de la reserva {reservation.reference}
          </label>
          <select
            id={`estado-${reservation.id}`}
            className={`field-input cursor-pointer py-1.5 text-sm font-semibold ${STATUS_STYLES[reservation.status]}`}
            value={reservation.status}
            disabled={busy}
            onChange={(event) =>
              onStatusChange(reservation.id, event.target.value as ReservationStatus)
            }
          >
            {STATUSES.map((status) => (
              <option key={status} value={status} className="bg-paper-card font-medium text-ink">
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </td>

        <td className="px-4 py-3 text-right">
          <button
            type="button"
            className="btn btn-ghost px-3 py-1 text-xs"
            disabled={busy}
            onClick={() => onDelete(reservation)}
          >
            Eliminar
          </button>
        </td>
      </tr>

      {expanded && (
        <tr id={detailId} className="bg-paper-deep/50">
          <td colSpan={5} className="px-4 pb-6 pt-2">
            <div className="grid gap-3 md:grid-cols-2">
              {reservation.items.map((item, index) => (
                <div key={item.id ?? index} className="surface p-4">
                  <p className="font-display text-base font-semibold">
                    {item.brand} · {item.model}
                  </p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                    <div>
                      <dt className="label-caps">Color</dt>
                      <dd>{item.color}</dd>
                    </div>
                    <div>
                      <dt className="label-caps">Para</dt>
                      <dd>{AUDIENCE_LABELS[item.audience]}</dd>
                    </div>
                    <div>
                      <dt className="label-caps">Talla</dt>
                      <dd>{item.size}</dd>
                    </div>
                    <div>
                      <dt className="label-caps">Unidades</dt>
                      <dd>{item.quantity}</dd>
                    </div>
                  </dl>
                  {item.details && (
                    <p className="mt-3 border-t border-line pt-3 text-sm text-ink-soft">
                      {item.details}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {reservation.notes && (
              <p className="mt-3 text-sm text-ink-soft">
                <span className="label-caps mr-2">Notas</span>
                {reservation.notes}
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
