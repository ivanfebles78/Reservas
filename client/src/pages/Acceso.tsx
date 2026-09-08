import { useState, type FormEvent } from 'react'
import { Field } from '../components/Field'

interface AccesoProps {
  onSubmit: (password: string) => void
  pending: boolean
  error: string
}

/** Pantalla de acceso: una única clave compartida para el personal de la tienda. */
export function Acceso({ onSubmit, pending, error }: AccesoProps) {
  const [password, setPassword] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit(password)
  }

  return (
    <div className="grid min-h-screen place-items-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-baseline gap-3">
          <span
            aria-hidden="true"
            className="inline-block h-8 w-8 rounded-full bg-clay text-center font-display text-base leading-8 text-paper"
          >
            R
          </span>
          <span className="font-display text-2xl font-semibold tracking-tight">Reservas</span>
        </div>

        <form onSubmit={handleSubmit} className="surface flex flex-col gap-5 p-7" noValidate>
          <div>
            <h1 className="font-display text-2xl font-semibold">Acceso</h1>
            <p className="mt-1 text-sm text-ink-soft">
              Introduce la clave de la tienda para ver y gestionar las reservas.
            </p>
          </div>

          <Field label="Clave" error={error}>
            {(props) => (
              <input
                {...props}
                className="field-input"
                type="password"
                value={password}
                autoFocus
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
              />
            )}
          </Field>

          <button type="submit" className="btn btn-primary" disabled={pending || !password}>
            {pending ? 'Comprobando…' : 'Entrar'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-ink-soft">
          Los datos de los clientes solo son visibles tras iniciar sesión.
        </p>
      </div>
    </div>
  )
}
