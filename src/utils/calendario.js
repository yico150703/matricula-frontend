// Mismas reglas que el servidor (app/calendario.py): 16 semanas de clases (lunes a sábado),
// 1 semana de vacaciones y el período 2 empieza el lunes siguiente. El período 1 empieza un lunes de marzo a mayo.
export const SEMANAS_CLASES = 16
export const SEMANAS_VACACIONES = 1

const aFecha = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const aIso = (f) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`
const sumarDias = (iso, dias) => {
  const f = aFecha(iso)
  f.setDate(f.getDate() + dias)
  return aIso(f)
}

export const finDeClases = (inicioIso) => sumarDias(inicioIso, SEMANAS_CLASES * 7 - 2)
export const inicioSegundo = (inicioPrimeroIso) => sumarDias(inicioPrimeroIso, (SEMANAS_CLASES + SEMANAS_VACACIONES) * 7)
export const esLunes = (iso) => aFecha(iso).getDay() === 1
export const fechaLarga = (iso) =>
  iso ? aFecha(iso).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''

/** Rango permitido para el inicio del período AAAA-1 (lunes de marzo a mayo). */
export const rangoInicioPrimero = (anio) => ({ min: `${anio}-03-01`, max: `${anio}-05-31` })

/** Valida el inicio del período 1. Devuelve un mensaje de error o '' si es válido. */
export function errorInicioPrimero(iso, anio) {
  if (!iso) return 'Indica el inicio de clases.'
  const f = aFecha(iso)
  if (f.getDay() !== 1) return 'El inicio de clases debe ser un lunes.'
  if (f.getFullYear() !== anio || ![2, 3, 4].includes(f.getMonth())) return `Debe ser un lunes de marzo, abril o mayo de ${anio}.`
  return ''
}
