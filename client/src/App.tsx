import { Navigate, Route, Routes } from 'react-router-dom'
import { LogoutContext, useSession } from './auth/useSession'
import { Layout } from './components/Layout'
import { Acceso } from './pages/Acceso'
import { NuevaReserva } from './pages/NuevaReserva'
import { Reservas } from './pages/Reservas'

export function App() {
  const session = useSession()

  if (session.status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center">
        <p className="label-caps" role="status">
          Cargando…
        </p>
      </div>
    )
  }

  if (session.status === 'anonymous') {
    return <Acceso onSubmit={session.login} pending={session.pending} error={session.error} />
  }

  return (
    <LogoutContext.Provider value={session.logout}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<NuevaReserva />} />
          <Route path="reservas" element={<Reservas />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </LogoutContext.Provider>
  )
}
