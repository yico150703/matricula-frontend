import { useEffect, useMemo, useState } from 'react'
import { ApiError, matriculaApi, planesApi } from '../../api/client'
import { Empty, Loading } from '../../components/AsyncState'
import { descargarFichaMatriculaPDF } from '../../utils/generatePdf'

export default function RegistroMatricula({
  alumno,
  periodo,
  selectedPlanId,
  selectedCicloId,
  onCambiarPlanCiclo,
}) {
  const codPeriodo = periodo?.cod_per_acad || '2026-1'
  const is2026_1 = codPeriodo === '2026-1'

  // Regla académica: 2026-1 corresponde a ciclos impares (1,3,5,7,9); 2026-2 a pares (2,4,6,8,10)
  const ciclosCorrespondientes = is2026_1 ? [1, 3, 5, 7, 9] : [2, 4, 6, 8, 10]
  const ciclosSecundarios = is2026_1 ? [2, 4, 6, 8, 10] : [1, 3, 5, 7, 9]

  const [cursos, setCursos] = useState([])
  const [loadingCursos, setLoadingCursos] = useState(true)
  const [seccionesPorCurso, setSeccionesPorCurso] = useState({})
  const [loadingSecciones, setLoadingSecciones] = useState(true)

  // Filtro de ciclo
  const [activeCycleFilter, setActiveCycleFilter] = useState(
    selectedCicloId || (is2026_1 ? 1 : 2)
  )
  const [filterMode, setFilterMode] = useState('ciclo') // 'ciclo' | 'correspondientes' | 'todos'

  // Asignaturas y secciones seleccionadas: { [id_curso]: seccionObj }
  const [seccionesElegidas, setSeccionesElegidas] = useState({})

  // Modal para elegir sección
  const [modalCurso, setModalCurso] = useState(null)

  // Estado de ejecución de matrícula
  const [ejecutando, setEjecutando] = useState(false)
  const [matriculaExitosa, setMatriculaExitosa] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  const diasSemana = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  // 1. Cargar cursos del plan seleccionado
  useEffect(() => {
    let mounted = true
    setLoadingCursos(true)
    setErrorMsg('')

    planesApi
      .cursos(selectedPlanId)
      .then((data) => {
        if (mounted) setCursos(data.cursos || [])
      })
      .catch((err) => {
        if (mounted) setErrorMsg(err.detail || 'Error al cargar asignaturas del plan.')
      })
      .finally(() => {
        if (mounted) setLoadingCursos(false)
      })

    return () => {
      mounted = false
    }
  }, [selectedPlanId])

  // 2. Cargar todas las secciones del período para mostrar horarios y profesores en la tabla
  useEffect(() => {
    let mounted = true
    setLoadingSecciones(true)
    matriculaApi
      .secciones(periodo.id_periodo)
      .then((res) => {
        if (!mounted) return
        const map = {}
        for (const sec of res.secciones || []) {
          const cId = sec.curso?.id_curso
          if (!map[cId]) map[cId] = []
          map[cId].push(sec)
        }
        setSeccionesPorCurso(map)
      })
      .catch((err) => {
        console.warn('Error al precargar secciones del período:', err)
      })
      .finally(() => {
        if (mounted) setLoadingSecciones(false)
      })

    return () => {
      mounted = false
    }
  }, [periodo.id_periodo])

  // Modal de sección
  const handleOpenModal = (curso) => {
    setModalCurso(curso)
  }

  const handleSelectSeccion = (curso, seccion) => {
    setSeccionesElegidas((prev) => {
      const copy = { ...prev }
      if (copy[curso.id_curso]?.id_seccion === seccion.id_seccion) {
        delete copy[curso.id_curso] // Deseleccionar
      } else {
        copy[curso.id_curso] = seccion // Seleccionar
      }
      return copy
    })
    setModalCurso(null)
  }

  const handleQuitarSeccion = (idCurso) => {
    setSeccionesElegidas((prev) => {
      const copy = { ...prev }
      delete copy[idCurso]
      return copy
    })
  }

  // Cálculos de totales
  const totalCreditos = useMemo(() => {
    return Object.values(seccionesElegidas).reduce(
      (acc, sec) => acc + (sec.curso?.creditos || 0),
      0
    )
  }, [seccionesElegidas])

  const totalAsignaturas = useMemo(() => {
    return Object.keys(seccionesElegidas).length
  }, [seccionesElegidas])

  // Filtrado de cursos según el ciclo y modo seleccionado
  const cursosFiltrados = useMemo(() => {
    if (filterMode === 'todos') return cursos
    if (filterMode === 'correspondientes') {
      return cursos.filter((c) => ciclosCorrespondientes.includes(c.ciclo))
    }
    return cursos.filter((c) => c.ciclo === activeCycleFilter)
  }, [cursos, filterMode, activeCycleFilter, ciclosCorrespondientes])

  // Ejecutar matrícula
  const handleEjecutarMatricula = async () => {
    if (totalAsignaturas === 0) {
      alert('Debes elegir al menos una asignatura con su sección para matricularte.')
      return
    }
    if (totalCreditos > 26) {
      alert('Has superado el tope máximo de 26 créditos permitidos.')
      return
    }

    setEjecutando(true)
    setErrorMsg('')
    try {
      const payload = {
        cod_alumno: alumno.cod_alumno,
        id_periodo: periodo.id_periodo,
        secciones: Object.values(seccionesElegidas).map((s) => s.id_seccion),
      }
      const res = await matriculaApi.crear(payload)
      setMatriculaExitosa(res.matricula)
    } catch (err) {
      setErrorMsg(err.detail || err.message || 'Ocurrió un error al procesar la matrícula.')
    } finally {
      setEjecutando(false)
    }
  }

  // Generar y descargar el PDF oficial
  const handleDescargarPDF = () => {
    const listaSecciones = Object.values(seccionesElegidas)
    if (listaSecciones.length === 0) {
      alert('Selecciona al menos una sección para generar la ficha de matrícula.')
      return
    }
    const planTexto = selectedPlanId === 1 ? 'Plan Curricular 2010' : 'Malla Curricular Vigente 2019'
    descargarFichaMatriculaPDF({
      alumno,
      periodo,
      planNombre: planTexto,
      secciones: listaSecciones,
      totalCreditos,
      totalAsignaturas,
    })
  }

  // Pantalla de confirmación tras ejecutar la matrícula con éxito
  if (matriculaExitosa) {
    return (
      <div className="registro-matricula-container">
        <h1 className="page-main-title">Ficha Oficial de Matrícula</h1>
        <div className="matricula-success-card">
          <div className="success-icon">✓</div>
          <h2>¡Matrícula Registrada Exitosamente!</h2>
          <p className="success-sub">
            Se ha completado el registro oficial para el período académico <strong>{codPeriodo}</strong> en la <strong>Facultad de Ingeniería Industrial y de Sistemas (FIIS)</strong>.
          </p>

          <div className="success-summary">
            <div><span>N° de Matrícula:</span> <strong>{matriculaExitosa.nro_matricula || '2026100001'}</strong></div>
            <div><span>Estudiante:</span> <strong>{alumno?.nombres} {alumno?.apellidos} ({alumno?.cod_alumno})</strong></div>
            <div><span>Facultad:</span> <strong>FIIS · Ing. de Sistemas</strong></div>
            <div><span>Plan de Estudios:</span> <strong>{selectedPlanId === 1 ? 'Plan 2010' : 'Malla Vigente 2019'}</strong></div>
            <div><span>Total Créditos:</span> <strong>{totalCreditos} créditos</strong></div>
            <div><span>Asignaturas:</span> <strong>{totalAsignaturas} cursos</strong></div>
          </div>

          <table className="success-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Asignatura</th>
                <th>Ciclo</th>
                <th>Sección</th>
                <th>Créditos</th>
                <th>Docente a Cargo</th>
                <th>Horario y Aula</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(seccionesElegidas).map((sec) => (
                <tr key={sec.id_seccion}>
                  <td><strong>{sec.curso?.codigo_curso}</strong></td>
                  <td>{sec.curso?.nombre_curso}</td>
                  <td>Ciclo {sec.curso?.ciclo}</td>
                  <td><span className="seccion-pill">Sec. {sec.nro_seccion}</span></td>
                  <td>{sec.curso?.creditos}</td>
                  <td>{sec.docente || 'Dr. Carlos Mendoza Ramos'}</td>
                  <td>
                    <small>{diasSemana[sec.dia]} {sec.hora_inicio}–{sec.hora_fin} ({sec.aula || 'Aula FIIS-101'})</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="success-actions">
            <button type="button" className="btn-download-pdf" onClick={handleDescargarPDF}>
              📥 Descargar Ficha Oficial en PDF
            </button>
            <button type="button" className="btn-print" onClick={() => window.print()}>
              🖨️ Imprimir
            </button>
            <button
              type="button"
              className="btn-nueva-matricula"
              onClick={() => {
                setMatriculaExitosa(null)
                setSeccionesElegidas({})
              }}
            >
              Realizar otra matrícula
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="registro-matricula-container">
      <h1 className="page-main-title">Registro de Matrícula</h1>

      {/* Tarjeta: Datos del Estudiante (FIIS y Periodo 2026) */}
      <div className="student-card-container">
        <div className="student-card-badge">Datos del Estudiante</div>

        <div className="student-info-grid">
          <div className="student-box">
            <span className="student-box-title">Periodo Académico</span>
            <span className="student-box-data">{codPeriodo}</span>
          </div>

          <div className="student-box">
            <span className="student-box-title">Facultad</span>
            <span className="student-box-data">FIIS - FACULTAD DE INGENIERÍA INDUSTRIAL Y DE SISTEMAS</span>
          </div>

          <div className="student-box">
            <span className="student-box-title">Programa</span>
            <span className="student-box-data">2 - E.P. DE INGENIERÍA DE SISTEMAS</span>
          </div>

          <div className="student-box">
            <span className="student-box-title">Especialidad</span>
            <span className="student-box-data">0 - INGENIERÍA DE SISTEMAS</span>
          </div>

          <div className="student-box">
            <span className="student-box-title">Plan de Estudios</span>
            <span className="student-box-data">
              {selectedPlanId === 1 ? '2010 - Plan de Estudios 2010' : '2019 - Plan de Estudios 2019'}
            </span>
          </div>
        </div>

        {/* Barra de Filtro de Ciclos 1 al 10 con regla Par / Impar */}
        <div className="ciclo-filter-bar">
          <div className="filter-title-group">
            <span className="filter-title">Semestre / Ciclo:</span>
            <span className="badge-periodo-tipo">
              {is2026_1 ? 'Semestre 2026-1 · Ciclos Impares (1, 3, 5, 7, 9)' : 'Semestre 2026-2 · Ciclos Pares (2, 4, 6, 8, 10)'}
            </span>
          </div>

          <div className="ciclo-chips">
            {/* Ciclos recomendados del período */}
            {ciclosCorrespondientes.map((num) => (
              <button
                key={num}
                type="button"
                className={`chip-ciclo ${filterMode === 'ciclo' && activeCycleFilter === num ? 'selected' : ''}`}
                onClick={() => {
                  setActiveCycleFilter(num)
                  setFilterMode('ciclo')
                }}
              >
                Ciclo {num} ★
              </button>
            ))}

            {/* Ciclos secundarios */}
            {ciclosSecundarios.map((num) => (
              <button
                key={num}
                type="button"
                className={`chip-ciclo chip-secundario ${filterMode === 'ciclo' && activeCycleFilter === num ? 'selected' : ''}`}
                onClick={() => {
                  setActiveCycleFilter(num)
                  setFilterMode('ciclo')
                }}
              >
                Ciclo {num}
              </button>
            ))}

            <button
              type="button"
              className={`chip-ciclo ${filterMode === 'correspondientes' ? 'selected' : ''}`}
              onClick={() => setFilterMode('correspondientes')}
            >
              Todos los {is2026_1 ? 'Impares' : 'Pares'}
            </button>

            <button
              type="button"
              className={`chip-ciclo ${filterMode === 'todos' ? 'selected' : ''}`}
              onClick={() => setFilterMode('todos')}
            >
              Ver todos (1 al 10)
            </button>
          </div>

          {onCambiarPlanCiclo && (
            <button type="button" className="btn-cambiar-plan" onClick={onCambiarPlanCiclo}>
              ⚙️ Cambiar Período ({codPeriodo}) / Plan
            </button>
          )}
        </div>
      </div>

      {errorMsg && <div className="alert-box-error">{errorMsg}</div>}

      {/* Tabla de Asignaturas con HORARIOS Y PROFESORES en cada fila */}
      <div className="courses-table-wrapper">
        {loadingCursos || loadingSecciones ? (
          <Loading />
        ) : cursosFiltrados.length === 0 ? (
          <Empty>No hay asignaturas para el ciclo seleccionado en este período.</Empty>
        ) : (
          <table className="unfv-courses-table">
            <thead>
              <tr>
                <th style={{ width: '65px', textAlign: 'center' }}>Ciclo</th>
                <th style={{ width: '110px' }}>tipo</th>
                <th style={{ minWidth: '240px' }}>Asignatura</th>
                <th style={{ width: '75px', textAlign: 'center' }}>Créditos</th>
                <th style={{ minWidth: '280px' }}>Docente y Horario Programado</th>
                <th style={{ width: '140px', textAlign: 'center' }}>Sección Elegida</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Elegir Sección</th>
              </tr>
            </thead>
            <tbody>
              {cursosFiltrados.map((curso) => {
                const isElectivo =
                  curso.mencion_electiva ||
                  curso.codigo_curso?.startsWith('E') ||
                  curso.nombre_curso?.toLowerCase().includes('electiv')
                const tipoTexto = isElectivo ? 'E - Electivo' : 'O - Obligatorio'
                const seccionElegida = seccionesElegidas[curso.id_curso]
                const seccionesDisponibles = seccionesPorCurso[curso.id_curso] || []

                return (
                  <tr key={curso.id_curso} className={seccionElegida ? 'row-selected' : ''}>
                    {/* Ciclo badge */}
                    <td style={{ textAlign: 'center' }}>
                      <span className="ciclo-badge">{curso.ciclo}</span>
                    </td>

                    {/* tipo */}
                    <td>
                      <span className={`tipo-tag ${isElectivo ? 'tipo-e' : 'tipo-o'}`}>
                        {tipoTexto}
                      </span>
                    </td>

                    {/* Asignatura */}
                    <td>
                      <span className="course-fullname">
                        <strong>{curso.codigo_curso}</strong> - {curso.nombre_curso}
                      </span>
                      {curso.area_curricular && (
                        <small className="course-area">{curso.area_curricular}</small>
                      )}
                    </td>

                    {/* Créditos */}
                    <td style={{ textAlign: 'center' }}>
                      <span className="course-credits">{curso.creditos}</span>
                    </td>

                    {/* DOCENTE Y HORARIO PROGRAMADO (Pedido expreso del usuario) */}
                    <td>
                      {seccionElegida ? (
                        <div className="table-docente-horario active-selection">
                          <span className="schedule-docente">👨‍🏫 {seccionElegida.docente}</span>
                          <span className="schedule-time">
                            📅 {diasSemana[seccionElegida.dia]} {seccionElegida.hora_inicio}–{seccionElegida.hora_fin} ({seccionElegida.aula || 'Aula FIIS-101'})
                          </span>
                        </div>
                      ) : seccionesDisponibles.length > 0 ? (
                        <div className="table-docente-horario">
                          <span className="schedule-docente">
                            👨‍🏫 {seccionesDisponibles[0].docente}
                          </span>
                          <span className="schedule-time">
                            📅 {diasSemana[seccionesDisponibles[0].dia]} {seccionesDisponibles[0].hora_inicio}–{seccionesDisponibles[0].hora_fin} ({seccionesDisponibles[0].aula || 'Aula FIIS'})
                          </span>
                          {seccionesDisponibles.length > 1 && (
                            <small className="schedule-more-sections">
                              +{seccionesDisponibles.length - 1} sección alternativa
                            </small>
                          )}
                        </div>
                      ) : (
                        <span className="schedule-pending">Horario por publicar</span>
                      )}
                    </td>

                    {/* Sección Elegida */}
                    <td style={{ textAlign: 'center' }}>
                      {seccionElegida ? (
                        <div className="chosen-section-badge">
                          <span>Sección {seccionElegida.nro_seccion}</span>
                          <button
                            type="button"
                            className="btn-remove-section"
                            onClick={() => handleQuitarSeccion(curso.id_curso)}
                            title="Quitar sección"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <span className="no-section">--</span>
                      )}
                    </td>

                    {/* Elegir Sección (Botón Amarillo con icono) */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn-choose-section-yellow"
                        onClick={() => handleOpenModal(curso)}
                        title="Seleccionar sección y horario"
                      >
                        <span className="hand-icon">👆</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Barra de Totales / Créditos (Imagen 4) */}
      <div className="credits-summary-cards">
        <div className="credit-pill-box">
          Tope de créditos: <strong>26</strong>
        </div>

        <div className={`credit-pill-box ${totalCreditos > 26 ? 'over-limit' : ''}`}>
          Créditos matriculados: <strong>{totalCreditos}</strong>
        </div>

        <div className="credit-pill-box">
          Asignaturas matriculadas: <strong>{totalAsignaturas}</strong>
        </div>
      </div>

      {/* Botones de Acción: Ejecutar Matrícula y Descargar PDF */}
      <div className="actions-matricula-container">
        <button
          type="button"
          className="btn-ejecutar-matricula"
          disabled={ejecutando || totalAsignaturas === 0 || totalCreditos > 26}
          onClick={handleEjecutarMatricula}
        >
          {ejecutando ? 'Procesando matrícula…' : 'Ejecutar Matrícula'}
        </button>

        {totalAsignaturas > 0 && (
          <button
            type="button"
            className="btn-download-pdf-outline"
            onClick={handleDescargarPDF}
            title="Descargar Ficha en PDF con las asignaturas seleccionadas"
          >
            📥 Descargar PDF de Matrícula
          </button>
        )}
      </div>

      {/* Modal de Selección de Sección */}
      {modalCurso && (
        <div className="modal-overlay" onClick={() => setModalCurso(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                Secciones y Horarios: <span>{modalCurso.codigo_curso} - {modalCurso.nombre_curso}</span>
              </h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setModalCurso(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {(!seccionesPorCurso[modalCurso.id_curso] || seccionesPorCurso[modalCurso.id_curso].length === 0) ? (
                <Empty>No hay secciones programadas para este curso en el período actual.</Empty>
              ) : (
                <div className="modal-sections-list">
                  {seccionesPorCurso[modalCurso.id_curso].map((sec) => {
                    const isSelected =
                      seccionesElegidas[modalCurso.id_curso]?.id_seccion === sec.id_seccion
                    const diaNombre = diasSemana[sec.dia] || 'Por definir'
                    return (
                      <div
                        key={sec.id_seccion}
                        className={`modal-section-card ${isSelected ? 'selected' : ''}`}
                      >
                        <div className="section-card-info">
                          <h4>Sección {sec.nro_seccion}</h4>
                          <p>
                            <strong>Docente:</strong> {sec.docente || 'Carlos Mendoza Ramos'}
                          </p>
                          <p>
                            <strong>Horario:</strong> {diaNombre} {sec.hora_inicio} – {sec.hora_fin}
                          </p>
                          <p>
                            <strong>Aula:</strong> {sec.aula || 'FIIS-101'}
                          </p>
                          <p className="vacantes-text">
                            <strong>Cupos disponibles:</strong> {sec.cupo_disponible} / {sec.cupo_maximo}
                          </p>
                        </div>

                        <button
                          type="button"
                          className={`btn-select-sec ${isSelected ? 'btn-quitar' : 'btn-elegir'}`}
                          onClick={() => handleSelectSeccion(modalCurso, sec)}
                          disabled={sec.cupo_disponible <= 0 && !isSelected}
                        >
                          {isSelected ? '✓ Seleccionada (Quitar)' : 'Elegir Sección'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setModalCurso(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
