import { useEffect, useMemo, useState } from 'react'
import { ApiError, matriculaApi, planesApi } from '../../api/client'
import { Empty, Loading } from '../../components/AsyncState'

export default function RegistroMatricula({
  alumno,
  periodo,
  selectedPlanId,
  selectedCicloId,
  onCambiarPlanCiclo,
}) {
  const [cursos, setCursos] = useState([])
  const [loadingCursos, setLoadingCursos] = useState(true)
  const [seccionesPorCurso, setSeccionesPorCurso] = useState({})
  const [activeCycleFilter, setActiveCycleFilter] = useState(selectedCicloId || 1)
  const [filterAll, setFilterAll] = useState(false)

  // Asignaturas y secciones seleccionadas por el alumno: { [id_curso]: seccionObj }
  const [seccionesElegidas, setSeccionesElegidas] = useState({})

  // Modal para elegir sección
  const [modalCurso, setModalCurso] = useState(null)
  const [modalSecciones, setModalSecciones] = useState([])
  const [loadingModalSecciones, setLoadingModalSecciones] = useState(false)

  // Estado de ejecución de matrícula
  const [ejecutando, setEjecutando] = useState(false)
  const [matriculaExitosa, setMatriculaExitosa] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Cargar cursos del plan seleccionado
  useEffect(() => {
    let mounted = true
    setLoadingCursos(true)
    setErrorMsg('')

    planesApi
      .cursos(selectedPlanId)
      .then((data) => {
        if (mounted) {
          setCursos(data.cursos || [])
        }
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

  // Cargar secciones disponibles para un curso al abrir el modal
  const handleOpenSecciones = async (curso) => {
    setModalCurso(curso)
    setModalSecciones([])
    setLoadingModalSecciones(true)
    try {
      const res = await matriculaApi.secciones(periodo.id_periodo, curso.id_curso)
      setModalSecciones(res.secciones || [])
    } catch (err) {
      console.error(err)
      setModalSecciones([])
    } finally {
      setLoadingModalSecciones(false)
    }
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
    return Object.values(seccionesElegidas).reduce((acc, sec) => acc + (sec.curso?.creditos || 0), 0)
  }, [seccionesElegidas])

  const totalAsignaturas = useMemo(() => {
    return Object.keys(seccionesElegidas).length
  }, [seccionesElegidas])

  // Cursos visibles según filtro de ciclo
  const cursosFiltrados = useMemo(() => {
    if (filterAll) return cursos
    return cursos.filter((c) => c.ciclo === activeCycleFilter)
  }, [cursos, filterAll, activeCycleFilter])

  // Ejecutar matrícula
  const handleEjecutarMatricula = async () => {
    if (totalAsignaturas === 0) {
      alert('Debes elegir al menos una sección para matricularte.')
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

  const diasSemana = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  // Pantalla de confirmación si la matrícula se ejecutó con éxito
  if (matriculaExitosa) {
    return (
      <div className="registro-matricula-container">
        <h1 className="page-main-title">Constancia de Matrícula</h1>
        <div className="matricula-success-card">
          <div className="success-icon">✓</div>
          <h2>¡Matrícula Registrada Exitosamente!</h2>
          <p className="success-sub">
            Se ha generado tu ficha oficial de matrícula para el período académico <strong>{periodo?.cod_per_acad || '2024-2'}</strong>.
          </p>

          <div className="success-summary">
            <div><span>N° de Matrícula:</span> <strong>{matriculaExitosa.nro_matricula || '2024200001'}</strong></div>
            <div><span>Estudiante:</span> <strong>{alumno?.nombres} {alumno?.apellidos} ({alumno?.cod_alumno})</strong></div>
            <div><span>Plan de Estudios:</span> <strong>{selectedPlanId === 1 ? 'Plan 2010' : 'Malla Curricular 2019'}</strong></div>
            <div><span>Total Créditos:</span> <strong>{totalCreditos} créditos</strong></div>
            <div><span>Asignaturas:</span> <strong>{totalAsignaturas} asignaturas</strong></div>
          </div>

          <table className="success-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Asignatura</th>
                <th>Sección</th>
                <th>Créditos</th>
                <th>Horario / Aula</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(seccionesElegidas).map((sec) => (
                <tr key={sec.id_seccion}>
                  <td><strong>{sec.curso?.codigo_curso}</strong></td>
                  <td>{sec.curso?.nombre_curso}</td>
                  <td><span className="seccion-pill">Sección {sec.nro_seccion}</span></td>
                  <td>{sec.curso?.creditos}</td>
                  <td>
                    <small>{diasSemana[sec.dia]} {sec.hora_inicio}–{sec.hora_fin} (Aula {sec.aula})</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="success-actions">
            <button type="button" className="btn-print" onClick={() => window.print()}>
              🖨️ Imprimir Ficha de Matrícula
            </button>
            <button
              type="button"
              className="btn-nueva-matricula"
              onClick={() => {
                setMatriculaExitosa(null)
                setSeccionesElegidas({})
              }}
            >
              Volver al Registro
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="registro-matricula-container">
      <h1 className="page-main-title">Registro de Matrícula</h1>

      {/* Tarjeta: Datos del Estudiante (Imagen 1) */}
      <div className="student-card-container">
        <div className="student-card-badge">Datos del Estudiante</div>

        <div className="student-info-grid">
          <div className="student-box">
            <span className="student-box-title">Periodo Académico</span>
            <span className="student-box-data">{periodo?.cod_per_acad || '2024-2'}</span>
          </div>

          <div className="student-box">
            <span className="student-box-title">Facultad</span>
            <span className="student-box-data">12 - FACULTAD DE INGENIERÍA ELECTRÓNICA E INFORMÁTICA</span>
          </div>

          <div className="student-box">
            <span className="student-box-title">Programa</span>
            <span className="student-box-data">2 - E.P. de Ingeniería de Sistemas</span>
          </div>

          <div className="student-box">
            <span className="student-box-title">Especialidad</span>
            <span className="student-box-data">0 - Ingeniería de Sistemas</span>
          </div>

          <div className="student-box">
            <span className="student-box-title">Plan de Estudios</span>
            <span className="student-box-data">
              {selectedPlanId === 1 ? '2010 - Plan de Estudios 2010' : '2019 - Plan de Estudios 2019'}
            </span>
          </div>
        </div>

        {/* Barra de Filtro de Ciclos 1 al 10 */}
        <div className="ciclo-filter-bar">
          <span className="filter-title">Semestre / Ciclo:</span>
          <div className="ciclo-chips">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                type="button"
                className={`chip-ciclo ${!filterAll && activeCycleFilter === num ? 'selected' : ''}`}
                onClick={() => {
                  setActiveCycleFilter(num)
                  setFilterAll(false)
                }}
              >
                Ciclo {num}
              </button>
            ))}
            <button
              type="button"
              className={`chip-ciclo ${filterAll ? 'selected' : ''}`}
              onClick={() => setFilterAll(true)}
            >
              Todos los ciclos
            </button>
          </div>

          {onCambiarPlanCiclo && (
            <button type="button" className="btn-cambiar-plan" onClick={onCambiarPlanCiclo}>
              ⚙️ Cambiar Plan
            </button>
          )}
        </div>
      </div>

      {errorMsg && <div className="alert-box-error">{errorMsg}</div>}

      {/* Tabla de Asignaturas (Imágenes 3 y 4) */}
      <div className="courses-table-wrapper">
        {loadingCursos ? (
          <Loading />
        ) : cursosFiltrados.length === 0 ? (
          <Empty>No hay asignaturas disponibles para el ciclo seleccionado.</Empty>
        ) : (
          <table className="unfv-courses-table">
            <thead>
              <tr>
                <th style={{ width: '80px', textAlign: 'center' }}>Ciclo</th>
                <th style={{ width: '130px' }}>tipo</th>
                <th>Asignatura</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Créditos</th>
                <th style={{ width: '150px', textAlign: 'center' }}>Sección Elegida</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Elegir Sección</th>
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
                        onClick={() => handleOpenSecciones(curso)}
                        title="Seleccionar sección"
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

      {/* Botón Verde Centrado: Ejecutar Matrícula (Imagen 4) */}
      <div className="execute-matricula-container">
        <button
          type="button"
          className="btn-ejecutar-matricula"
          disabled={ejecutando || totalAsignaturas === 0 || totalCreditos > 26}
          onClick={handleEjecutarMatricula}
        >
          {ejecutando ? 'Procesando matrícula…' : 'Ejecutar Matrícula'}
        </button>
      </div>

      {/* Modal de Selección de Sección */}
      {modalCurso && (
        <div className="modal-overlay" onClick={() => setModalCurso(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                Secciones para: <span>{modalCurso.codigo_curso} - {modalCurso.nombre_curso}</span>
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
              {loadingModalSecciones ? (
                <Loading />
              ) : modalSecciones.length === 0 ? (
                <Empty>No hay secciones programadas para este curso en el período actual.</Empty>
              ) : (
                <div className="modal-sections-list">
                  {modalSecciones.map((sec) => {
                    const isSelected = seccionesElegidas[modalCurso.id_curso]?.id_seccion === sec.id_seccion
                    const diaNombre = diasSemana[sec.dia] || 'Por definir'
                    return (
                      <div
                        key={sec.id_seccion}
                        className={`modal-section-card ${isSelected ? 'selected' : ''}`}
                      >
                        <div className="section-card-info">
                          <h4>Sección {sec.nro_seccion}</h4>
                          <p>
                            <strong>Horario:</strong> {diaNombre} {sec.hora_inicio} – {sec.hora_fin}
                          </p>
                          <p>
                            <strong>Docente:</strong> {sec.docente || 'Por asignar'}
                          </p>
                          <p>
                            <strong>Aula:</strong> {sec.aula || 'A-101'}
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
