const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '')
const TOKEN_KEY = 'matricula_token'
export const TOKEN_STORAGE_KEY = TOKEN_KEY

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
export const PASSWORD_CHANGE_EVENT = 'matricula:debe-cambiar-password'

// Render (plan gratuito) apaga el servidor tras un rato sin uso y tarda ~50 s en despertar:
// mientras tanto responde 502/503/504 o corta la conexión. Se reintenta solo antes de mostrar un error.
const ESPERAS_REINTENTO = [2000, 4000, 8000, 12000, 16000]
const DESPERTANDO = new Set([502, 503, 504])
const RUTAS_SIN_SESION = ['/auth/login', '/auth/recuperar', '/auth/restablecer']
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

async function pedir(url, init) {
  for (let intento = 0; ; intento++) {
    try {
      const response = await fetch(url, init)
      if (!DESPERTANDO.has(response.status) || intento >= ESPERAS_REINTENTO.length) return response
    } catch (err) {
      if (intento >= ESPERAS_REINTENTO.length) throw err
    }
    await esperar(ESPERAS_REINTENTO[intento])
  }
}

export async function api(path, options = {}) {
  const token = session.get()
  let response
  try {
    response = await pedir(`${API_URL}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    })
  } catch {
    throw new ApiError(
      'error_conexion',
      0,
      'No se pudo conectar con el servidor. Revisa tu conexión a internet; si el problema continúa, el servidor puede estar en mantenimiento.'
    )
  }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const publica = RUTAS_SIN_SESION.some((r) => path.startsWith(r))
    // Sesión vencida, cuenta desactivada o token borrado en otra pestaña: se cierra la sesión en esta pestaña
    if (response.status === 401 && !publica) {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: body.detail }))
    }
    if (response.status === 403 && body.error === 'debe_cambiar_password') {
      window.dispatchEvent(new CustomEvent(PASSWORD_CHANGE_EVENT))
    }
    throw new ApiError(body.error || 'error_de_api', response.status, body.detail || 'No fue posible completar la solicitud.')
  }
  return body
}

const json = (method, payload) => ({ method, body: JSON.stringify(payload ?? {}) })
const enc = encodeURIComponent

export const authApi = {
  login: (usuario, password) => api('/auth/login', json('POST', { usuario, password })),
  recuperar: (usuario) => api('/auth/recuperar', json('POST', { usuario })),
  validarToken: (token) => api(`/auth/restablecer/${enc(token)}`),
  restablecer: (token, nueva) => api('/auth/restablecer', json('POST', { token, password_nueva: nueva })),
  me: () => api('/auth/me'),
  cambiarPassword: (actual, nueva) => api('/auth/cambiar-password', json('POST', { password_actual: actual, password_nueva: nueva })),
  actualizarPerfil: (payload) => api('/auth/perfil', json('PATCH', payload)),
}

export const matriculaApi = {
  malla: (codigo) => api(`/alumnos/${enc(codigo)}/malla`),
  historial: (codigo) => api(`/alumnos/${enc(codigo)}/historial`),
  periodos: () => api('/periodos'),
  actual: (codigo, periodo) => api(`/matriculas/${enc(codigo)}?periodo=${periodo}`),
  oferta: (codigo, periodo) => api(`/alumnos/${enc(codigo)}/oferta?periodo=${periodo}`),
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

export const carritoApi = {
  ver: (codigo, periodo) => api(`/carrito/${enc(codigo)}?periodo=${periodo}`),
  agregar: (codigo, periodo, secciones) => api(`/carrito/${enc(codigo)}`, json('POST', { id_periodo: periodo, secciones })),
  quitar: (codigo, periodo, seccion) => api(`/carrito/${enc(codigo)}/${seccion}?periodo=${periodo}`, { method: 'DELETE' }),
  vaciar: (codigo, periodo) => api(`/carrito/${enc(codigo)}?periodo=${periodo}`, { method: 'DELETE' }),
  confirmar: (codigo, periodo) => api(`/carrito/${enc(codigo)}/confirmar`, json('POST', { id_periodo: periodo })),
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
  // notas: { n1, n2, n3, sustitutorio, aplazado } o { nota }
  calificar: (codigo, codCurso, notas) => api(`/alumnos/${enc(codigo)}/calificar`, json('POST', { cod_curso: codCurso, ...notas })),
  solicitudesPassword: () => api('/admin/solicitudes-password'),
  atenderSolicitud: (id, accion) => api(`/admin/solicitudes-password/${id}/atender`, json('POST', { accion })),
  crearPeriodo: (payload) => api('/admin/periodos', json('POST', payload)),
  borrarPeriodo: (idPeriodo) => api(`/admin/periodos/${idPeriodo}`, { method: 'DELETE' }),
  // Personal: jefe de departamento, director, asistente, docentes y administradores
  personal: () => api('/admin/usuarios'),
  crearPersonal: (payload) => api('/admin/usuarios', json('POST', payload)),
  actualizarPersonal: (id, payload) => api(`/admin/usuarios/${id}`, json('PATCH', payload)),
  resetPersonal: (id) => api(`/admin/usuarios/${id}/reset-password`, json('POST')),
}

// --- Proceso de horarios (jefe de departamento, director, asistente) ---
export const procesoApi = {
  periodos: () => api('/proceso/periodos'),
  detalle: (idPeriodo) => api(`/proceso/${idPeriodo}`),
  docentes: (idPeriodo) => api(`/proceso/docentes?periodo=${idPeriodo}`),
  accion: (idPeriodo, accion, extra = {}) => api(`/proceso/${idPeriodo}/accion`, json('POST', { accion, ...extra })),
  copiar: (idPeriodo, desde) => api(`/proceso/${idPeriodo}/copiar`, json('POST', { desde_periodo: desde })),
  crearSeccion: (idPeriodo, payload) => api(`/proceso/${idPeriodo}/secciones`, json('POST', payload)),
  editarSeccion: (idSeccion, payload) => api(`/proceso/secciones/${idSeccion}`, json('PUT', payload)),
  eliminarSeccion: (idSeccion) => api(`/proceso/secciones/${idSeccion}`, { method: 'DELETE' }),
  asignarDocente: (idSeccion, idDocente) => api(`/proceso/secciones/${idSeccion}/docente`, json('PUT', { id_docente: idDocente })),
  asignarAula: (idSeccion, aula, sesion) => api(`/proceso/secciones/${idSeccion}/aula`, json('PUT', sesion == null ? { aula } : { aula, sesion })),
  solicitudes: (idPeriodo) => api(`/proceso/${idPeriodo}/solicitudes`),
  crearSolicitud: (idPeriodo, payload) => api(`/proceso/${idPeriodo}/solicitudes`, json('POST', payload)),
  mensaje: (idSolicitud, texto) => api(`/proceso/solicitudes/${idSolicitud}/mensajes`, json('POST', { texto })),
  resolver: (idSolicitud, accion, respuesta, propuesta) =>
    api(`/proceso/solicitudes/${idSolicitud}/resolver`, json('POST', { accion, respuesta, propuesta })),
}

// --- Docente ---
export const docenteApi = {
  horario: (idPeriodo) => api(`/docente/horario${idPeriodo ? `?periodo=${idPeriodo}` : ''}`),
  confirmar: (idSeccion) => api(`/docente/secciones/${idSeccion}/confirmar`, json('POST')),
}

/** Descarga protegida (p. ej. el PDF de un acta) y la devuelve como Blob. */
export async function apiBlob(path) {
  const token = session.get()
  let response
  try {
    response = await pedir(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  } catch {
    throw new ApiError('error_conexion', 0, 'No se pudo conectar con el servidor.')
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(body.error || 'error_de_api', response.status, body.detail || 'No se pudo descargar el archivo.')
  }
  return response.blob()
}

// --- Actas de notas: el docente registra y envía; el Director aprueba; el admin supervisa ---
export const notasApi = {
  salones: (idPeriodo) => api(`/docente/salones?periodo=${idPeriodo}`),
  salon: (idSeccion) => api(`/docente/salones/${idSeccion}`),
  guardar: (idSeccion, notas) => api(`/docente/salones/${idSeccion}/notas`, json('PUT', { notas })),
  enviar: (idSeccion, archivo) => {
    const form = new FormData()
    if (archivo) form.append('archivo', archivo)
    return api(`/docente/salones/${idSeccion}/acta`, { method: 'POST', body: form })
  },
  actas: (idPeriodo) => api(`/actas?periodo=${idPeriodo}`),
  acta: (idActa) => api(`/actas/${idActa}`),
  revisar: (idActa, accion, observacion) => api(`/actas/${idActa}/revisar`, json('POST', { accion, observacion })),
  pdf: (idActa) => apiBlob(`/actas/${idActa}/pdf`)
}
