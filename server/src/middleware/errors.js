/** Error de negocio con codigo HTTP asociado. */
export class HttpError extends Error {
  constructor(status, message, fields) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.fields = fields
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({ ok: false, error: 'Recurso no encontrado' })
}

// Los cuatro parametros son obligatorios: Express identifica el handler de errores por su aridad.
export function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  const status = error instanceof HttpError ? error.status : 500

  if (status >= 500) {
    console.error('[api] error no controlado:', error)
  }

  res.status(status).json({
    ok: false,
    error: status >= 500 ? 'Error interno del servidor' : error.message,
    ...(error.fields ? { fields: error.fields } : {}),
  })
}
