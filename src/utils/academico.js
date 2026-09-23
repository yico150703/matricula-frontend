// Identificadores tal como los define el backend (plan_estudio.corr_pe)
export const PLANES = [
  {
    id: 1,
    nombre: 'Malla Curricular Vigente 2019',
    corto: 'Plan 2019',
    resolucion: 'Resolución R. N° 6245-2019-CU-UNFV',
    descripcion: 'Plan de estudios vigente por competencias.',
    vigente: true,
  },
  {
    id: 2,
    nombre: 'Plan Curricular 2010',
    corto: 'Plan 2010',
    resolucion: 'Resolución R. N° 4512-2010-CU-UNFV',
    descripcion: 'Plan tradicional de Ingeniería de Sistemas.',
    vigente: false,
  },
]

export const planPorId = (id) => PLANES.find((p) => p.id === Number(id)) || PLANES[0]

export const EMAIL_DOMAIN = 'unfv.edu.pe'
export const correoInstitucional = (codigo) => (codigo ? `${codigo}@${EMAIL_DOMAIN}` : '')

const ROMANOS = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X' }
export const romano = (n) => ROMANOS[n] || n

export const DIAS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// 2026-1 => ciclos impares, 2026-2 => ciclos pares
export const esPeriodoImpar = (codPeriodo) => String(codPeriodo || '').endsWith('-1')

export const seCruzan = (a, b) => a.dia === b.dia && a.hora_inicio < b.hora_fin && b.hora_inicio < a.hora_fin

export const nombreCompleto = (u) =>
  u ? [u.nombres, u.apellidos].filter(Boolean).join(' ') || u.usuario || u.cod_alumno || '' : ''

export const MAX_CREDITOS = 26
