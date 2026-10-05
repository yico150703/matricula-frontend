import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoUrl from '../assets/logo-unfv.png'
import { matriculaApi } from '../api/client'
import { formatoNota, formatoParcial, redondear } from './academico'

const pad2 = (n) => String(n).padStart(2, '0')

function fechaHora() {
  const d = new Date()
  return {
    fecha: `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`,
    hora: `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`,
  }
}

function barras(doc, x, y) {
  // Marca gráfica de las boletas oficiales (bloque de líneas verticales)
  doc.setLineWidth(0.35)
  for (let i = 0; i < 6; i++) {
    doc.line(x + i * 1.1, y - 3.2, x + i * 1.1, y - 1.7)
    doc.line(x + i * 1.1, y - 1.1, x + i * 1.1, y + 0.4)
  }
}

/** Encabezado con el formato de las boletas de la UNFV (anexo 4). */
function encabezado(doc, titulo, alumno, nivel) {
  const { fecha, hora } = fechaHora()
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11.5)
  doc.text('UNIVERSIDAD NACIONAL FEDERICO VILLARREAL', 12, 13)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('INGENIERIA INDUSTRIAL Y DE SISTEMAS', 12, 16.5)

  doc.setFontSize(8.5)
  doc.text('Fecha', 160, 12)
  doc.text(`:  ${fecha}`, 175, 12)
  doc.text('Hora', 160, 16)
  doc.text(`:  ${hora}`, 175, 16)

  doc.setFontSize(15)
  const w = doc.getTextWidth(titulo)
  doc.text(titulo, 105, 22, { align: 'center' })
  barras(doc, 105 - w / 2 - 10, 22)
  barras(doc, 105 + w / 2 + 4, 22)

  doc.setFontSize(9)
  const filas = [
    ['Facultad', 'INGENIERIA INDUSTRIAL Y DE SISTEMAS', true],
    ['Escuela', 'INGENIERIA DE SISTEMAS', false],
    ['Especialidad', '', false],
    ['Alumno', `${(alumno?.apellidos || '').toUpperCase()} ${(alumno?.nombres || '').toUpperCase()}`.trim(), true],
    ['Plan', '2019', true],
  ]
  let y = 30
  filas.forEach(([label, valor, bold]) => {
    doc.setFont('helvetica', 'normal')
    doc.text(label, 12, y)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(label === 'Plan' ? 11 : 9)
    doc.text(valor, 42, y)
    doc.setFontSize(9)
    y += 4.6
  })
  doc.setFont('helvetica', 'normal')
  doc.text('Codigo :', 158, 48.4)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(String(alumno?.cod_alumno || ''), 171, 48.4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Nivel :', 170, 53)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(pad2(nivel || 1), 180, 53)
  doc.setLineWidth(0.5)
  doc.line(12, 55.5, 198, 55.5)
  return 56
}

const tablaBase = {
  theme: 'plain',
  styles: { font: 'helvetica', fontSize: 7.4, cellPadding: { top: 1.1, bottom: 1.1, left: 0.8, right: 0.8 }, textColor: [0, 0, 0] },
  headStyles: { fontStyle: 'normal', fontSize: 7.6, halign: 'center' },
  margin: { left: 12, right: 12 },
  didDrawCell: (data) => {
    if (data.section === 'head' && data.column.index === 0) {
      const { doc, table } = data
      const y = data.cell.y + data.cell.height
      doc.setLineWidth(0.3)
      doc.line(12, y, 12 + table.getWidth(doc.internal.pageSize.getWidth()), y)
    }
  },
}

function lineaFinal(doc, y) {
  doc.setLineWidth(0.5)
  doc.line(12, y, 198, y)
}

function nombreArchivo(prefijo, alumno, periodo) {
  return `${prefijo}_${alumno?.cod_alumno || 'alumno'}_${String(periodo?.cod_per_acad || '').replace('-', '_')}.pdf`
}

// ---------------------------------------------------------------------------
// Constancia de matrícula (formato de la Oficina Técnica de Servicios Académicos FIIS)
// ---------------------------------------------------------------------------
const AZUL = [79, 157, 213]
const AZUL_TEXTO = [222, 236, 248]
const BORDE = [112, 132, 168]
const GRIS_TEXTO = [55, 60, 72]

let logoCache = null
async function logoUnfv() {
  if (logoCache) return logoCache
  try {
    const blob = await (await fetch(logoUrl)).blob()
    logoCache = await new Promise((ok, fail) => {
      const r = new FileReader()
      r.onload = () => ok(r.result)
      r.onerror = fail
      r.readAsDataURL(blob)
    })
  } catch {
    logoCache = null
  }
  return logoCache
}

/** Nivel = año de estudios (ciclos I-II → 01, III-IV → 02, V-VI → 03…). */
const nivelDe = (ciclo) => Math.max(1, Math.ceil(Number(ciclo || 1) / 2))

/** Matrículas del alumno en todos los períodos del mismo año (la constancia es anual: 2026-1 y 2026-2). */
async function matriculasDelAnio(alumno, periodo, matricula) {
  const cod = periodo?.cod_per_acad || matricula?.periodo?.cod_per_acad || ''
  const anio = cod.slice(0, 4)
  const lista = [{ cod, matricula }]
  try {
    const { periodos = [] } = await matriculaApi.periodos()
    const otros = periodos.filter((p) => p.cod_per_acad.startsWith(`${anio}-`) && p.cod_per_acad !== cod)
    const res = await Promise.all(
      otros.map((p) =>
        matriculaApi
          .actual(alumno.cod_alumno, p.id_periodo)
          .then((r) => ({ cod: p.cod_per_acad, matricula: r.matricula }))
          .catch(() => null)
      )
    )
    lista.push(...res.filter((r) => r?.matricula))
  } catch {
    // Sin conexión: la constancia sale solo con el período actual
  }
  return { anio, lista: lista.sort((a, b) => a.cod.localeCompare(b.cod)) }
}

/** Ficha (constancia) de matrícula: replica la que emite la Oficina Técnica de Servicios Académicos. */
export async function descargarFichaMatriculaPDF({ alumno, periodo, matricula }) {
  const [{ anio, lista }, logo] = await Promise.all([matriculasDelAnio(alumno, periodo, matricula), logoUnfv()])
  const filas = lista.flatMap(({ cod, matricula: m }) =>
    (m?.detalles || []).filter((d) => d.estado === 'matriculado' && d.seccion).map((d) => ({ cod, d }))
  )
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const M = 12
  const W = 210 - 2 * M

  // Encabezado: logo, facultad y oficina
  if (logo) doc.addImage(logo, 'PNG', M + 2, 12, 50, 20.3)
  doc.setTextColor(...GRIS_TEXTO)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11.5)
  doc.text('FACULTAD DE INGENIERIA INDUSTRIAL Y DE SISTEMAS', 136, 18, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text('OFICINA TECNICA DE SERVICIOS ACADEMICOS', 136, 23.5, { align: 'center' })
  doc.setFontSize(17)
  const titulo = 'CONSTANCIA DE MATRICULA  '
  const wt = doc.getTextWidth(titulo)
  doc.setFont('helvetica', 'bold')
  const wa = doc.getTextWidth(anio)
  doc.setFont('helvetica', 'normal')
  const x0 = 136 - (wt + wa) / 2
  doc.text(titulo, x0, 35)
  doc.setFont('helvetica', 'bold')
  doc.text(anio, x0 + wt, 35)

  // Datos del alumno
  const ultima = lista.map((x) => x.matricula?.fecha_matricula).filter(Boolean).sort().pop()
  const f = ultima ? new Date(ultima) : new Date()
  const fecha = `${pad2(f.getDate())}/${pad2(f.getMonth() + 1)}/${String(f.getFullYear()).slice(2)}`
  const hora = `${pad2(f.getHours())}:${pad2(f.getMinutes())}:${pad2(f.getSeconds())}`
  const niveles = filas.map(({ d }) => nivelDe(d.seccion.curso?.ciclo))
  const conteo = niveles.reduce((a, n) => ({ ...a, [n]: (a[n] || 0) + 1 }), {})
  const nivel = Object.keys(conteo).sort((a, b) => conteo[b] - conteo[a] || a - b)[0] || 1

  const etiqueta = (t, x, y) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...GRIS_TEXTO)
    doc.text(t, x, y)
  }
  etiqueta('Escuela', M + 1, 46)
  doc.text('INGENIERIA DE SISTEMAS', 37, 45)
  etiqueta('Especialidad', M + 1, 50.8)
  etiqueta('Alumno', M + 1, 55.6)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(`${(alumno?.apellidos || '').toUpperCase()} ${(alumno?.nombres || '').toUpperCase()}`.trim(), 37, 55)
  etiqueta('Fecha', M + 1, 60.4)
  doc.text(fecha, 37, 60)
  etiqueta('Hora :', 87, 59.6)
  doc.text(hora, 99, 59.6)

  etiqueta('Plan', 150, 48.5)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.text('2019', 162, 48.5)
  etiqueta('Nivel', 148, 54)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.text(pad2(nivel), 159, 54)
  etiqueta('Cod Alumno', 136, 60)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(45, 105, 165)
  doc.text(String(alumno?.cod_alumno || ''), 158, 60.3)

  // Tabla de asignaturas
  autoTable(doc, {
    startY: 63,
    margin: { left: M, right: M },
    theme: 'grid',
    head: [['', 'Per', 'Código', 'T', 'S', 'Asignaturas', 'Credito', 'Nivel']],
    body: filas.map(({ cod, d }, i) => {
      const c = d.seccion.curso || {}
      return [i + 1, cod, c.codigo_curso || '', d.seccion.turno || '', d.seccion.cod_seccion || '', (c.nombre_curso || '').toUpperCase(), pad2(c.creditos || 0), pad2(nivelDe(c.ciclo))]
    }),
    styles: { font: 'helvetica', fontSize: 8.4, textColor: GRIS_TEXTO, lineColor: BORDE, lineWidth: 0.3, cellPadding: { top: 1.9, bottom: 1.9, left: 1.5, right: 1.5 }, valign: 'middle' },
    headStyles: { fillColor: AZUL, textColor: AZUL_TEXTO, fontStyle: 'normal', fontSize: 9, lineColor: AZUL, halign: 'center' },
    bodyStyles: { fillColor: [252, 253, 255] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 7, fontSize: 7.5 },
      1: { halign: 'center', cellWidth: 17 },
      2: { halign: 'center', cellWidth: 17 },
      3: { halign: 'center', cellWidth: 7 },
      4: { halign: 'center', cellWidth: 7 },
      5: { cellWidth: W - 7 - 17 - 17 - 7 - 7 - 15 - 14 },
      6: { halign: 'center', cellWidth: 15 },
      7: { halign: 'center', cellWidth: 14 },
    },
    didParseCell: (data) => {
      if (data.section === 'head' && data.column.index === 5) data.cell.styles.halign = 'center'
    },
  })

  // Barra final: recibo y total de créditos
  let y = doc.lastAutoTable.finalY
  const creditos = filas.reduce((a, { d }) => a + Number(d.seccion.curso?.creditos || 0), 0)
  doc.setFillColor(...AZUL)
  doc.rect(M, y, W, 8.5, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...AZUL_TEXTO)
  doc.text('RECIBO', M + 10, y + 5.6)
  doc.setFillColor(255, 255, 255)
  doc.rect(100, y + 1.3, 26, 5.9, 'F')
  doc.setTextColor(...GRIS_TEXTO)
  doc.setFontSize(10.5)
  doc.text('0.00', 125, y + 5.8, { align: 'right' })
  doc.setFontSize(9)
  doc.setTextColor(...AZUL_TEXTO)
  doc.text('TOTAL DE CREDITOS', 136, y + 5.6)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(String(creditos), 176, y + 5.6)

  // Firmas
  y = Math.min(y + 34, 270)
  doc.setDrawColor(...GRIS_TEXTO)
  doc.setLineWidth(0.3)
  doc.line(42, y, 82, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...GRIS_TEXTO)
  doc.text('FIRMA DEL ALUMNO', 62, y + 4.5, { align: 'center' })
  doc.line(134, y, 182, y)
  doc.setFontSize(8)
  doc.text('COORD. OFICINA TECNICA ACADEMICA', 158, y + 4.5, { align: 'center' })

  doc.setFontSize(6.8)
  doc.setTextColor(130, 130, 130)
  const nros = lista.map((x) => x.matricula?.nro_matricula).filter(Boolean).join(', ')
  doc.text(`Documento generado por el Sistema de Matrícula FIIS - UNFV${nros ? ` - N.º de matrícula ${nros}` : ''}. T: turno (M mañana, T tarde, N noche) - S: sección.`, M, 288)

  doc.save(`Constancia_Matricula_${alumno?.cod_alumno || 'alumno'}_${anio}.pdf`)
}

/** Boleta de notas del período (formato UNFV, anexo 4): N1, N2, N3, Su, Pr, Ap y Nota. */
export function descargarBoletaNotasPDF({ alumno, periodo, filas, nivel, notaMinima = 11 }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const cod = periodo?.cod_per_acad || ''
  const historico = cod === 'HISTORICO'
  const [anio, num] = historico ? ['ANT', ''] : cod.split('-')
  let y = encabezado(doc, historico ? 'RECORD DE NOTAS ANTERIORES' : `BOLETAS DE NOTAS  ${anio}-${num}`, alumno, nivel)

  const n = (v) => (v === null || v === undefined ? '' : formatoNota(v))
  const body = filas.map((f, i) => [
    i + 1,
    `${anio} ${num}`,
    f.curso.codigo_curso,
    f.turno || '',
    f.seccion || '',
    f.curso.nombre_curso,
    pad2(f.curso.creditos),
    pad2(f.curso.ciclo),
    '2019',
    n(f.n1),
    n(f.n2),
    n(f.n3),
    n(f.sustitutorio),
    n(f.promedio),
    n(f.aplazado),
    f.estado === 'retirado' ? 'RET' : n(f.nota_final),
  ])

  autoTable(doc, {
    ...tablaBase,
    startY: y + 1,
    head: [['Ord.', 'Periodo', 'Cod Asig.', 'T', 'S', 'Asignatura', 'Cred', 'Nivel', 'Plan', 'N1', 'N2', 'N3', 'Su', 'Pr', 'Ap', 'Nota']],
    body,
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 13 },
      2: { halign: 'center', cellWidth: 14 },
      3: { halign: 'center', cellWidth: 5 },
      4: { halign: 'center', cellWidth: 5 },
      5: { cellWidth: 62, fontSize: 6.8 },
      6: { halign: 'center', cellWidth: 8 },
      7: { halign: 'center', cellWidth: 8 },
      8: { halign: 'center', cellWidth: 9 },
      9: { halign: 'center', cellWidth: 7 },
      10: { halign: 'center', cellWidth: 7 },
      11: { halign: 'center', cellWidth: 7 },
      12: { halign: 'center', cellWidth: 7 },
      13: { halign: 'center', cellWidth: 7 },
      14: { halign: 'center', cellWidth: 7 },
      15: { halign: 'center', cellWidth: 12 },
    },
  })

  y = doc.lastAutoTable.finalY + 2
  lineaFinal(doc, y)
  const conNota = filas.filter((f) => f.estado === 'matriculado' && f.nota_final !== null)
  const aprob = conNota.filter((f) => redondear(f.nota_final) >= notaMinima)
  const desap = conNota.filter((f) => redondear(f.nota_final) < notaMinima)
  const aband = filas.filter((f) => f.estado === 'retirado')
  const cr = (lista) => lista.reduce((a, f) => a + Number(f.curso.creditos || 0), 0)
  const aritmetico = conNota.length ? conNota.reduce((a, f) => a + redondear(f.nota_final), 0) / conNota.length : 0
  const ponderado = cr(conNota) ? conNota.reduce((a, f) => a + redondear(f.nota_final) * Number(f.curso.creditos), 0) / cr(conNota) : 0

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  const resumen = [
    ['Asig.     Aprobados :', aprob.length, 'Cred.     Aprobados :', cr(aprob)],
    ['Asig. Desaprobados :', desap.length, 'Cred. Desaprobados :', cr(desap)],
    ['Asig. Abandonados :', aband.length, 'Cred. Abandonados :', cr(aband)],
    ['Total     Asignaturas :', filas.length, 'Total          Creditos :', cr(filas)],
  ]
  resumen.forEach((r, i) => {
    const yy = y + 5 + i * 4.6
    doc.text(r[0], 12, yy)
    doc.text(String(r[1]), 52, yy)
    doc.text(r[2], 70, yy)
    doc.text(String(r[3]), 120, yy)
  })
  doc.setFontSize(10)
  doc.text('Promedio Aritmetico', 135, y + 10.6)
  doc.text('Promedio Ponderado', 135, y + 15.6)
  doc.setFont('helvetica', 'bold')
  doc.text(aritmetico.toFixed(2), 180, y + 10.6)
  doc.text(ponderado.toFixed(2), 180, y + 15.6)
  lineaFinal(doc, y + 21)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(90, 90, 90)
  doc.text(
    `Nota aprobatoria: ${notaMinima}. Las notas se redondean al entero: desde x.5 sube (10.5 = 11); por debajo se mantiene (10.4 = 10).`,
    12,
    y + 26,
  )

  doc.save(nombreArchivo('Boleta_Notas', alumno, periodo))
}


/** Acta de notas de un salón (para que el docente la imprima, firme y suba escaneada). */
export function descargarActaNotasPDF({ seccion, periodo, alumnos, docente, notaMinima = 11 }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const { fecha, hora } = fechaHora()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11.5)
  doc.text('UNIVERSIDAD NACIONAL FEDERICO VILLARREAL', 12, 13)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('FACULTAD DE INGENIERIA INDUSTRIAL Y DE SISTEMAS · E.P. DE INGENIERIA DE SISTEMAS', 12, 16.5)
  doc.setFontSize(8.5)
  doc.text(`Fecha :  ${fecha}`, 160, 12)
  doc.text(`Hora  :  ${hora}`, 160, 16)
  doc.setFontSize(15)
  doc.text(`ACTA DE NOTAS  ${periodo?.cod_per_acad || ''}`, 105, 25, { align: 'center' })

  doc.setFontSize(9)
  const c = seccion.curso
  const datos = [
    ['Asignatura', `${c.codigo_curso || c.cod_curso} · ${c.nombre_curso}`],
    ['Ciclo / Sección', `${pad2(c.ciclo)} · Sección ${seccion.cod_seccion} · Turno ${seccion.turno}`],
    ['Créditos', String(c.creditos ?? '')],
    ['Docente', docente || seccion.docente || ''],
  ]
  let y = 33
  datos.forEach(([k, v]) => {
    doc.setFont('helvetica', 'normal')
    doc.text(k, 12, y)
    doc.setFont('helvetica', 'bold')
    doc.text(v, 45, y)
    y += 5
  })
  doc.setLineWidth(0.5)
  doc.line(12, y, 198, y)

  const n = (v) => (v === null || v === undefined ? '' : formatoNota(v))
  const p = (v) => (v === null || v === undefined || v === '' ? '' : formatoParcial(v))
  autoTable(doc, {
    ...tablaBase,
    startY: y + 1,
    head: [['N°', 'Código', 'Apellidos y nombres', 'N1', 'N2', 'N3', 'Su', 'Pr', 'Ap', 'Nota', 'Letras']],
    body: alumnos.map((a, i) => [
      i + 1,
      a.cod_alumno,
      `${a.apellidos.toUpperCase()}, ${a.nombres.toUpperCase()}`,
      p(a.notas.n1),
      p(a.notas.n2),
      p(a.notas.n3),
      p(a.notas.sustitutorio),
      n(a.promedio),
      p(a.notas.aplazado),
      n(a.nota_final),
      a.nota_final === null || a.nota_final === undefined ? '' : NUMEROS[redondear(a.nota_final)] || ''
    ]),
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 18 },
      2: { cellWidth: 70 },
      3: { halign: 'center', cellWidth: 9 },
      4: { halign: 'center', cellWidth: 9 },
      5: { halign: 'center', cellWidth: 9 },
      6: { halign: 'center', cellWidth: 9 },
      7: { halign: 'center', cellWidth: 9 },
      8: { halign: 'center', cellWidth: 9 },
      9: { halign: 'center', cellWidth: 11, fontStyle: 'bold' },
      10: { cellWidth: 25 }
    }
  })
  y = doc.lastAutoTable.finalY + 3
  lineaFinal(doc, y)
  const con = alumnos.filter((a) => a.nota_final !== null && a.nota_final !== undefined)
  const aprob = con.filter((a) => redondear(a.nota_final) >= notaMinima).length
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.text(`Matriculados: ${alumnos.length}    Aprobados: ${aprob}    Desaprobados: ${con.length - aprob}    Sin nota: ${alumnos.length - con.length}`, 12, y + 6)
  // Firmas
  const yf = Math.min(Math.max(y + 35, 230), 275)
  doc.setLineWidth(0.3)
  doc.line(25, yf, 90, yf)
  doc.line(120, yf, 185, yf)
  doc.text('Firma del docente', 57.5, yf + 4.5, { align: 'center' })
  doc.text(docente || seccion.docente || '', 57.5, yf + 8.5, { align: 'center' })
  doc.text('V.° B.° Director de Escuela', 152.5, yf + 4.5, { align: 'center' })
  doc.save(`acta_${c.codigo_curso || c.cod_curso}_${seccion.cod_seccion}_${String(periodo?.cod_per_acad || '').replace('-', '_')}.pdf`)
}

const NUMEROS = [
  'CERO', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ',
  'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE'
]
