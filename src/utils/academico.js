// Plan vigente (el Plan 2010 fue retirado)
export const PLANES = [
  {
    id: 1,
    nombre: 'Plan de Estudios 2019',
    corto: 'Plan 2019',
    resolucion: 'Resolución R. N° 6245-2019-CU-UNFV',
    descripcion: 'Plan de estudios vigente por competencias.',
    vigente: true,
  },
]

export const planPorId = (id) => PLANES.find((p) => p.id === Number(id)) || PLANES[0]

export const EMAIL_DOMAIN = 'unfv.edu.pe'
export const correoInstitucional = (codigo) => (codigo ? `${codigo}@${EMAIL_DOMAIN}` : '')

const ROMANOS = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X' }
export const romano = (n) => ROMANOS[n] || n

export const DIAS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
export const DIAS_LARGOS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const TURNOS = { M: 'Mañana', T: 'Tarde', N: 'Noche' }

// 2026-1 => ciclos impares, 2026-2 => ciclos pares
export const esPeriodoImpar = (codPeriodo) => String(codPeriodo || '').endsWith('-1')

export const sesionesDe = (s) =>
  s?.sesiones?.length ? s.sesiones : s ? [{ dia: s.dia, hora_inicio: s.hora_inicio, hora_fin: s.hora_fin, aula: s.aula, ubicacion: s.ubicacion }] : []

/** true si alguna sesión de `a` se superpone con alguna de `b` */
export const seCruzan = (a, b) =>
  sesionesDe(a).some((x) => sesionesDe(b).some((y) => x.dia === y.dia && x.hora_inicio < y.hora_fin && y.hora_inicio < x.hora_fin))

export const horarioCorto = (s) =>
  sesionesDe(s)
    .map((x) => `${DIAS[x.dia]} ${x.hora_inicio}-${x.hora_fin}`)
    .join(' · ')

/** Redondeo UNFV: desde x.5 sube (10.5 -> 11), si no se queda (10.2 -> 10). */
export const redondear = (n) => (n === null || n === undefined || n === '' ? null : Math.floor(Number(n) + 0.5))
/** Notas parciales (N1, N2, N3, sustitutorio, aplazado): se muestran tal cual se registraron (10.5). */
export const formatoParcial = (n) => {
  if (n === null || n === undefined || n === '') return '—'
  const v = Number(n)
  return Number.isInteger(v) ? String(v).padStart(2, '0') : String(Math.round(v * 100) / 100)
}

export const formatoNota = (n) => {
  const r = redondear(n)
  return r === null ? '—' : String(r).padStart(2, '0')
}

export const nombreCompleto = (u) =>
  u ? [u.nombres, u.apellidos].filter(Boolean).join(' ') || u.usuario || u.cod_alumno || '' : ''

export const MAX_CREDITOS = 26

// Paleta viva y con buen contraste para identificar cursos en el horario
export const COLORES_CURSO = [
  '#E4572E', '#1F8A70', '#3A6EA5', '#C2185B', '#C98209', '#6A4C93',
  '#00897B', '#D1495B', '#2E86AB', '#8D6E63', '#EF6C00', '#5C6BC0',
]
export const colorCurso = (id) => COLORES_CURSO[Math.abs(Number(id) || 0) % COLORES_CURSO.length]

export const minutos = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number)
  return h * 60 + m
}
