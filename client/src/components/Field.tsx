import type { ReactNode } from 'react'
import { useId } from 'react'

interface FieldProps {
  label: string
  error?: string
  hint?: string
  className?: string
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode
}

/** Etiqueta + control + mensaje de error, con el cableado de accesibilidad resuelto. */
export function Field({ label, error, hint, className = '', children }: FieldProps) {
  const id = useId()
  const messageId = error || hint ? `${id}-msg` : undefined

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="label-caps">
        {label}
      </label>

      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': messageId })}

      {(error || hint) && (
        <p
          id={messageId}
          className={`text-xs ${error ? 'font-medium text-clay-deep' : 'text-ink-soft'}`}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  )
}
