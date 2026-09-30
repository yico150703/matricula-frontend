import { notasApi } from '../../api/client'
import { redondear } from '../../utils/academico'

export const ESTADO_ACTA = {
  sin_acta: ['Sin registrar', 'pill-muted'],
  sin_alumnos: ['Sin alumnos', 'pill-muted'],
  borrador: ['Borrador', 'pill-info'],
  enviada: ['Enviada al Director', 'pill-warn'],
  observada: ['Observada', 'pill-bad'],
  aprobada: ['Aprobada', 'pill-ok']
}

export function EstadoActa({ estado }) {
  const [label, cls] = ESTADO_ACTA[estado] || [estado, 'pill-muted']
  return <span className={`pill ${cls}`}>{label}</span>
}

export const CAMPOS_NOTA = [
  ['n1', 'N1'],
  ['n2', 'N2'],
  ['n3', 'N3'],
  ['sustitutorio', 'Sust.'],
  ['aplazado', 'Aplaz.']
]

const num = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v))

/** Mismas reglas que el servidor: promedio de N1-N3 (el sustitutorio reemplaza a la más baja si es mayor),
 *  redondeo desde .5 hacia arriba y, si hay aplazado, la nota final es el aplazado. */
export function calcularNota(notas) {
  const parciales = ['n1', 'n2', 'n3'].map((k) => num(notas?.[k])).filter((v) => v !== null)
  const sust = num(notas?.sustitutorio)
  const aplazado = num(notas?.aplazado)
  let promedio = null
  if (parciales.length) {
    const valores = [...parciales]
    if (sust !== null) {
      const i = valores.indexOf(Math.min(...valores))
      if (sust > valores[i]) valores[i] = sust
    }
    promedio = redondear(valores.reduce((a, b) => a + b, 0) / valores.length)
  }
  const final = aplazado !== null ? redondear(aplazado) : promedio
  return { promedio, final }
}

export const notaValida = (v) => v === '' || v === null || v === undefined || (Number(v) >= 0 && Number(v) <= 20)

/** Abre el PDF del acta (descarga protegida con el token de la sesión). */
export async function abrirPdfActa(idActa) {
  const blob = await notasApi.pdf(idActa)
  const url = URL.createObjectURL(blob)
  const w = window.open(url, '_blank', 'noopener')
  if (!w) {
    // Si el navegador bloquea la ventana, se descarga
    const a = document.createElement('a')
    a.href = url
    a.download = 'acta.pdf'
    a.click()
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
