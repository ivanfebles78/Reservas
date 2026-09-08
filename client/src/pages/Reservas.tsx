import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, api } from '../api/client'
import {
  STATUSES,
  STATUS_LABELS,
  type ListMeta,
  type Reservation,
  type ReservationStatus,
} from '../api/types'
import { ReservationRow } from '../components/ReservationRow'

const PAGE_SIZE = 50
const EMPTY_META: ListMeta = { total: 0, limit: PAGE_SIZE, offset: 0, counts: {} }

export function Reservas() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState<ReservationStatus | ''>('')
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [meta, setMeta] = useState<ListMeta>(EMPTY_META)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data, meta: nextMeta } = await api.listReservations({
        status,
        q: debouncedSearch,
        limit: PAGE_SIZE,
      })
      setReservations(data)
      setMeta(nextMeta)
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'No se han podido cargar las reservas.',
      )
      setReservations([])
      setMeta(EMPTY_META)
    } finally {
      setLoading(false)
    }
  }, [status, debouncedSearch])

  useEffect(() => {
    void load()
  }, [load])

  const totalAll = useMemo(
    () => Object.values(meta.counts).reduce((total, value) => total + (value ?? 0), 0),
    [meta.counts],
  )

  const handleStatusChange = async (id: string, nextStatus: ReservationStatus) => {
    setBusyId(id)
    setError('')
    try {
      const { data } = await api.updateStatus(id, nextStatus)
      setReservations((current) =>
        current.map((reservation) => (reservation.id === id ? data : reservation)),
      )
      // Recarga para refrescar los contadores por estado y respetar el filtro activo.
      await load()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se ha podido cambiar el estado.')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (reservation: Reservation) => {
    const confirmed = window.confirm(
      `¿Eliminar definitivamente la reserva ${reservation.reference} de ${reservation.customerName}?`,
    )
    if (!confirmed) return

    setBusyId(reservation.id)
    setError('')
    try {
      await api.deleteReservation(reservation.id)
      void load()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se ha podido eliminar la reserva.')
    } finally {
      setBusyId(null)
    }
  }

  const filters: Array<{ value: ReservationStatus | ''; label: string; count: number }> = [
    { value: '', label: 'Todas', count: totalAll },
    ...STATUSES.map((value) => ({
      value,
      label: STATUS_LABELS[value],
      count: meta.counts[value] ?? 0,
    })),
  ]

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps">Seguimiento</p>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight sm:text-5xl">
            Reservas
          </h1>
        </div>
        <Link to="/" className="btn btn-primary">
          + Nueva reserva
        </Link>
      </header>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const active = status === filter.value
            return (
              <button
                key={filter.value || 'todas'}
                type="button"
                onClick={() => setStatus(filter.value)}
                aria-pressed={active}
                className={[
                  'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line bg-paper-card text-ink-soft hover:border-clay/40 hover:text-ink',
                ].join(' ')}
              >
                {filter.label}
                <span
                  className={`rounded-full px-1.5 text-xs ${active ? 'bg-paper/25' : 'bg-paper-deep'}`}
                >
                  {filter.count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="buscador" className="sr-only">
            Buscar reservas
          </label>
          <input
            id="buscador"
            type="search"
            className="field-input max-w-md"
            placeholder="Buscar por cliente, teléfono, correo, referencia, marca o modelo…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <p className="text-sm text-ink-soft" aria-live="polite">
            {loading ? 'Cargando…' : `${meta.total} ${meta.total === 1 ? 'reserva' : 'reservas'}`}
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="surface border-clay/40 bg-clay-wash px-5 py-4 text-sm font-medium text-clay-deep"
        >
          {error}
        </div>
      )}

      <div className="surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl border-collapse text-left text-sm">
            <thead>
              <tr className="bg-paper-deep/70">
                <th scope="col" className="label-caps px-4 py-3">
                  Referencia
                </th>
                <th scope="col" className="label-caps px-4 py-3">
                  Cliente
                </th>
                <th scope="col" className="label-caps px-4 py-3">
                  Petición
                </th>
                <th scope="col" className="label-caps px-4 py-3">
                  Estado
                </th>
                <th scope="col" className="label-caps px-4 py-3 text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => (
                <ReservationRow
                  key={reservation.id}
                  reservation={reservation}
                  expanded={expanded === reservation.id}
                  busy={busyId === reservation.id}
                  onToggle={(id) => setExpanded((current) => (current === id ? null : id))}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              ))}

              {!loading && reservations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <p className="font-display text-lg font-semibold">Todavía no hay reservas</p>
                    <p className="mt-1 text-ink-soft">
                      {search || status
                        ? 'Prueba a cambiar el filtro o la búsqueda.'
                        : 'Da de alta la primera petición de un cliente.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {meta.total > reservations.length && (
        <p className="text-sm text-ink-soft">
          Mostrando las {reservations.length} más recientes de {meta.total}. Afina la búsqueda para
          ver el resto.
        </p>
      )}
    </div>
  )
}
