import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { NuevaReserva } from './pages/NuevaReserva'
import { Reservas } from './pages/Reservas'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<NuevaReserva />} />
        <Route path="reservas" element={<Reservas />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
