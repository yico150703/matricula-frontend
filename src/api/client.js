const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

export async function api(path, options = {}) {
  const token = localStorage.getItem('matricula_token')
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch (networkErr) {
    throw new ApiError('error_conexion', 0, `No se pudo conectar con el servidor en ${API_URL}. Comprueba que el backend esté activo y que no haya bloqueo de CORS.`)
  }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(body.error || 'error_de_api', response.status, body.detail || 'No fue posible completar la solicitud.')
  return body
}

export const authApi = {
  login: (email, password) => api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => api('/auth/me'),
}

export const matriculaApi = {
  malla: (codigo) => api(`/alumnos/${encodeURIComponent(codigo)}/malla`),
  historial: (codigo) => api(`/alumnos/${encodeURIComponent(codigo)}/historial`),
  periodos: () => api('/periodos'),
  actual: (codigo, periodo) => api(`/matriculas/${encodeURIComponent(codigo)}?periodo=${periodo}`),
  secciones: (periodo, curso) => api(`/periodos/${periodo}/secciones?curso=${curso}`),
  crear: (payload) => api('/matriculas', { method: 'POST', body: JSON.stringify(payload) }),
  retirar: (matricula, seccion) => api(`/matriculas/${matricula}/detalle/${seccion}`, { method: 'DELETE' }),
}

export const planesApi = {
  list: () => api('/planes'),
  cursos: (idPlan, ciclo) => api(`/planes/${idPlan}/cursos${ciclo ? `?ciclo=${ciclo}` : ''}`),
}

export const alumnosApi = {
  cambiarPlan: (codigo, idPlan) => api(`/alumnos/${encodeURIComponent(codigo)}/plan`, { method: 'PATCH', body: JSON.stringify({ id_plan: idPlan }) }),
}
