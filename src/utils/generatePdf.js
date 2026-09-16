import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function descargarFichaMatriculaPDF({
  alumno,
  periodo,
  planNombre,
  secciones,
  totalCreditos,
  totalAsignaturas,
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const diasSemana = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  const codPeriodo = periodo?.cod_per_acad || '2026-1'
  const ahora = new Date()
  const fechaEmision = ahora.toLocaleString('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  })

  // 1. Encabezado institucional UNFV - FIIS
  doc.setFillColor(16, 59, 112) // Azul institucional #103b70
  doc.rect(0, 0, 210, 24, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('UNIVERSIDAD NACIONAL FEDERICO VILLARREAL', 105, 10, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('FACULTAD DE INGENIERÍA INDUSTRIAL Y DE SISTEMAS (FIIS)', 105, 16, { align: 'center' })
  doc.text('Escuela Profesional de Ingeniería de Sistemas', 105, 21, { align: 'center' })

  // 2. Título de la Ficha
  doc.setTextColor(16, 59, 112)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(`CONSTANCIA OFICIAL DE MATRÍCULA ${codPeriodo}`, 105, 33, { align: 'center' })

  // 3. Cuadro de Datos del Estudiante
  doc.setDrawColor(210, 220, 235)
  doc.setFillColor(245, 248, 252)
  doc.roundedRect(14, 38, 182, 34, 3, 3, 'FD')

  doc.setFontSize(9)
  doc.setTextColor(70, 85, 105)
  doc.text('Código de Alumno:', 18, 44)
  doc.text('Estudiante:', 18, 50)
  doc.text('Facultad:', 18, 56)
  doc.text('Plan de Estudios:', 18, 62)
  doc.text('Fecha de Emisión:', 18, 68)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(20, 30, 45)
  doc.text(alumno?.cod_alumno || '20260001', 54, 44)
  doc.text(`${alumno?.apellidos?.toUpperCase() || 'PÉREZ'}, ${alumno?.nombres?.toUpperCase() || 'ANA'}`, 54, 50)
  doc.text('FIIS - Facultad de Ingeniería Industrial y de Sistemas', 54, 56)
  doc.text(planNombre || 'Malla Curricular Vigente 2019', 54, 62)
  doc.text(fechaEmision, 54, 68)

  doc.setFont('helvetica', 'normal')
  doc.text('Período Académico:', 125, 44)
  doc.text('Programa:', 125, 50)
  doc.text('Tope de Créditos:', 125, 56)
  doc.text('Estado:', 125, 62)

  doc.setFont('helvetica', 'bold')
  doc.text(codPeriodo, 160, 44)
  doc.text('Ing. de Sistemas', 160, 50)
  doc.text('26.0 créditos', 160, 56)
  doc.setTextColor(22, 101, 52) // Verde
  doc.text('CONFIRMADA', 160, 62)

  // 4. Tabla de Asignaturas Matriculadas
  const tableData = secciones.map((sec, index) => {
    const curso = sec.curso || {}
    const dia = diasSemana[sec.dia] || ''
    const horario = `${dia} ${sec.hora_inicio || ''}–${sec.hora_fin || ''}`
    const aula = sec.aula ? `Aula ${sec.aula}` : 'FIIS-101'
    const docente = sec.docente || 'Por asignar'

    return [
      (index + 1).toString(),
      curso.codigo_curso || '',
      curso.nombre_curso || '',
      `Ciclo ${curso.ciclo || 1}`,
      `Sec. ${sec.nro_seccion || '01'}`,
      curso.creditos ? Number(curso.creditos).toFixed(1) : '3.0',
      docente,
      `${horario}\n(${aula})`,
    ]
  })

  autoTable(doc, {
    startY: 76,
    head: [['N°', 'Código', 'Asignatura', 'Ciclo', 'Secc.', 'Créd.', 'Docente a Cargo', 'Horario / Aula']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [84, 114, 156], // Azul acero #54729c
      textColor: [255, 255, 255],
      fontSize: 8.5,
      halign: 'center',
      valign: 'middle',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
      2: { cellWidth: 46 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'center', cellWidth: 14 },
      5: { halign: 'center', cellWidth: 13, fontStyle: 'bold' },
      6: { cellWidth: 41 },
      7: { halign: 'center', cellWidth: 28 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  })

  // 5. Cuadro de Resumen de Créditos y Asignaturas
  const finalY = doc.lastAutoTable.finalY + 6

  doc.setFillColor(219, 234, 254) // Celeste suave #dbeafe
  doc.roundedRect(14, finalY, 182, 14, 2, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(30, 64, 175) // Azul #1e40af
  doc.text(`Total de Asignaturas: ${totalAsignaturas}`, 25, finalY + 9)
  doc.text(`Total de Créditos Matriculados: ${Number(totalCreditos).toFixed(1)} / 26.0 máx.`, 80, finalY + 9)
  doc.text('Condición: REGULAR', 155, finalY + 9)

  // 6. Pie de página institucional y código de verificación digital
  const hashVerificacion = Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + ahora.getFullYear()

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text('Nota: Esta ficha certifica la inscripción de cursos en el Sistema de Matrícula Vía Web de la UNFV.', 14, finalY + 24)
  doc.text(`Código de Verificación Digital: FIIS-MAT-${hashVerificacion} | Sistema Web FIIS`, 14, finalY + 28)
  doc.text('Página 1 de 1', 196, finalY + 28, { align: 'right' })

  // Descargar archivo
  const nombreArchivo = `Ficha_Matricula_UNFV_FIIS_${alumno?.cod_alumno || 'alumno'}_${codPeriodo.replace('-', '_')}.pdf`
  doc.save(nombreArchivo)
}
