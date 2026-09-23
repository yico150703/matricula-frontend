const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '')
const TOKEN_KEY = 'matricula_token'

export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

// --- Token de sesión (tolerante a navegadores que bloquean localStorage) ---
let memoryToken = null
export const session = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY) || memoryToken
    } catch {
      return memoryToken
    }
  },
  set(token) {
    memoryToken = token
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
      /* modo privado: queda en memoria */
    }
  },
  clear() {
    memoryToken = null
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* noop */
    }
  },
}

export const SESSION_EXPIRED_EVENT = 'matricula:session-expired'

export async function api(path, options = {}) {
  const token = session.get()
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
  } catch {
    throw new ApiError(
      'error_conexion',
      0,
      'No se pudo conectar con el servidor. Si es el primer ingreso del día, espera unos segundos (el servidor se está activando) y vuelve a intentar.',
    )
  }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    // Token vencido o inválido: se avisa a la app para cerrar la sesión
    if (response.status === 401 && token && !path.startsWith('/auth/login')) {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
    }
    throw new ApiError(body.error || 'error_de_api', response.status, body.detail || 'No fue posible completar la solicitud.')
  }
  return body
}

const json = (method, payload) => ({ method, body: JSON.stringify(payload ?? {}) })
const enc = encodeURIComponent

export const authApi = {
  login: (usuario, password) => api('/auth/login', json('POST', { usuario, password })),
  me: () => api('/auth/me'),
  cambiarPassword: (actual, nueva) => api('/auth/cambiar-password', json('POST', { password_actual: actual, password_nueva: nueva })),
  actualizarPerfil: (payload) => api('/auth/perfil', json('PATCH', payload)),
}

export const matriculaApi = {
  malla: (codigo) => api(`/alumnos/${enc(codigo)}/malla`),
  historial: (codigo) => api(`/alumnos/${enc(codigo)}/historial`),
  periodos: () => api('/periodos'),
  actual: (codigo, periodo) => api(`/matriculas/${enc(codigo)}?periodo=${periodo}`),
  secciones: (periodo, { plan, curso } = {}) => {
    const params = new URLSearchParams()
    if (plan) params.set('plan', plan)
    if (curso) params.set('curso', curso)
    const qs = params.toString()
    return api(`/periodos/${periodo}/secciones${qs ? `?${qs}` : ''}`)
  },
  crear: (payload) => api('/matriculas', json('POST', payload)),
  retirar: (matricula, seccion) => api(`/matriculas/${matricula}/detalle/${seccion}`, { method: 'DELETE' }),
}

export const planesApi = {
  list: () => api('/planes'),
  cursos: (idPlan, ciclo) => api(`/planes/${idPlan}/cursos${ciclo ? `?ciclo=${ciclo}` : ''}`),
}

// --- Solo administrador ---
export const adminApi = {
  resumen: () => api('/admin/resumen'),
  alumnos: (q = '') => api(`/alumnos${q ? `?q=${enc(q)}` : ''}`),
  crearAlumno: (payload) => api('/alumnos', json('POST', payload)),
  actualizarAlumno: (codigo, payload) => api(`/alumnos/${enc(codigo)}`, json('PATCH', payload)),
  resetPassword: (codigo) => api(`/alumnos/${enc(codigo)}/reset-password`, json('POST')),
  calificar: (codigo, codCurso, nota, idPeriodo) =>
    api(`/alumnos/${enc(codigo)}/calificar`, json('POST', { cod_curso: codCurso, nota, ...(idPeriodo ? { id_periodo: idPeriodo } : {}) })),
  registrarNota: (matricula, seccion, notaFinal) =>
    api(`/matriculas/${matricula}/detalle/${seccion}/nota`, json('PATCH', { nota_final: notaFinal })),
  actualizarPeriodo: (idPeriodo, estado) => api(`/periodos/${idPeriodo}`, json('PATCH', { estado })),
}
