import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { DIAS, formatoNota, redondear, sesionesDe } from './academico'

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

/** Ficha de matrícula del período (formato UNFV) con horario, aula y docente de cada curso. */
export function descargarFichaMatriculaPDF({ alumno, periodo, matricula }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const cod = periodo?.cod_per_acad || matricula?.periodo?.cod_per_acad || ''
  const [anio, num] = cod.split('-')
  const detalles = (matricula?.detalles || []).filter((d) => d.estado === 'matriculado' && d.seccion)
  const nivel = Math.min(...detalles.map((d) => d.seccion.curso?.ciclo || 10))
  let y = encabezado(doc, `FICHA DE MATRICULA  ${anio}-${num}`, alumno, Number.isFinite(nivel) ? nivel : 1)

  const body = detalles.map((d, i) => {
    const s = d.seccion
    const c = s.curso || {}
    const horario = sesionesDe(s)
      .map((x) => `${DIAS[x.dia]} ${x.hora_inicio}-${x.hora_fin}`)
      .join('\n')
    const aulas = [...new Set(sesionesDe(s).map((x) => x.aula || s.aula))].join('\n')
    return [
      i + 1,
      `${anio} ${num}`,
      c.codigo_curso,
      s.turno,
      s.cod_seccion,
      { content: `${c.nombre_curso || ''}\n${s.docente || ''}`, styles: { fontSize: 7 } },
      pad2(c.creditos || 0),
      pad2(c.ciclo || 0),
      '2019',
      horario,
      aulas,
    ]
  })

  autoTable(doc, {
    ...tablaBase,
    startY: y + 1,
    head: [['Ord.', 'Periodo', 'Cod Asig.', 'T', 'S', 'Asignatura / Docente', 'Cred', 'Nivel', 'Plan', 'Horario', 'Aula']],
    body,
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 13 },
      2: { halign: 'center', cellWidth: 14 },
      3: { halign: 'center', cellWidth: 5 },
      4: { halign: 'center', cellWidth: 5 },
      5: { cellWidth: 58 },
      6: { halign: 'center', cellWidth: 9 },
      7: { halign: 'center', cellWidth: 9 },
      8: { halign: 'center', cellWidth: 10 },
      9: { cellWidth: 36 },
      10: { halign: 'center', cellWidth: 19 },
    },
  })

  y = doc.lastAutoTable.finalY + 2
  lineaFinal(doc, y)
  const creditos = detalles.reduce((a, d) => a + Number(d.seccion.curso?.creditos || 0), 0)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  y += 6
  doc.text(`N.º Matrícula :   ${matricula?.nro_matricula ?? '-'}`, 12, y)
  doc.text(`Total  Asignaturas :   ${detalles.length}`, 75, y)
  doc.text(`Total  Creditos :   ${creditos}`, 140, y)
  y += 5
  if (matricula?.fecha_matricula) {
    const f = new Date(matricula.fecha_matricula)
    doc.text(`Fecha de matrícula :   ${f.toLocaleString('es-PE')}`, 12, y)
  }
  doc.text('Estado :   CONFIRMADA', 140, y)
  y += 2
  lineaFinal(doc, y)
  doc.setFontSize(7)
  doc.setTextColor(90, 90, 90)
  doc.text('T: turno (M mañana, T tarde, N noche) · S: sección. Documento generado por el Sistema de Matrícula FIIS - UNFV.', 12, y + 5)

  doc.save(nombreArchivo('Ficha_Matricula', alumno, { cod_per_acad: cod }))
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

