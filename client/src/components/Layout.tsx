import { NavLink, Outlet } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'Nueva reserva', end: true },
  { to: '/reservas', label: 'Reservas', end: false },
]

export function Layout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line/80 bg-paper/85 backdrop-blur-sm sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4">
          <div className="flex items-baseline gap-3">
            <span
              aria-hidden="true"
              className="inline-block h-7 w-7 rounded-full bg-clay text-center font-display text-sm leading-7 text-paper"
            >
              R
            </span>
            <span className="font-display text-xl font-semibold tracking-tight">Reservas</span>
            <span className="hidden text-xs text-ink-soft sm:inline">· calzado</span>
          </div>

          <nav aria-label="Navegación principal" className="ml-auto flex items-center gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-ink text-paper'
                      : 'text-ink-soft hover:bg-paper-deep hover:text-ink',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-6xl px-5 pb-10 text-xs text-ink-soft">
        Las reservas se guardan en PostgreSQL. Estados: solicitada · reservada · entregada ·
        cancelada · caducada.
      </footer>
    </div>
  )
}
