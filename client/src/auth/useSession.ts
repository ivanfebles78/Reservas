import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { ApiError, api, setUnauthorizedHandler } from '../api/client'

type SessionStatus = 'loading' | 'anonymous' | 'authenticated'

export interface Session {
  status: SessionStatus
  pending: boolean
  error: string
  login: (password: string) => Promise<void>
  logout: () => Promise<void>
}

/** Estado de acceso de la aplicación: se consulta al arrancar y ante cualquier 401. */
export function useSession(): Session {
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    api
      .getSession()
      .then(({ data }) => {
        if (!cancelled) setStatus(data.authenticated ? 'authenticated' : 'anonymous')
      })
      .catch(() => {
        if (!cancelled) setStatus('anonymous')
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Si el servidor rechaza una petición por sesión caducada, se vuelve al acceso.
  useEffect(() => {
    setUnauthorizedHandler(() => setStatus('anonymous'))
    return () => setUnauthorizedHandler(null)
  }, [])

  const login = useCallback(async (password: string) => {
    setPending(true)
    setError('')
    try {
      await api.login(password)
      setStatus('authenticated')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se ha podido iniciar sesión.')
    } finally {
      setPending(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } finally {
      setStatus('anonymous')
    }
  }, [])

  return { status, pending, error, login, logout }
}

export const LogoutContext = createContext<() => void>(() => {})

export const useLogout = () => useContext(LogoutContext)
