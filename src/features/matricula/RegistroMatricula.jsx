import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, matriculaApi, planesApi } from '../../api/client'
import { Empty, ErrorState, Loading } from '../../components/AsyncState'
import { DIAS, MAX_CREDITOS, esPeriodoImpar, planPorId, romano, seCruzan } from '../../utils/academico'

const horarioTexto = (s) => `${DIAS[s.dia] || ''} ${s.hora_inicio}–${s.hora_fin} · ${s.aula}`

export default function RegistroMatricula({ alumno, periodo, ciclo, onCambiarCiclo }) {
  const plan = planPorId(alumno.id_plan)
  const [data, setData] = useState(null) // { cursos, malla, secciones, matricula }
  const [error, setError] = useState(null)
  const [elegidas, setElegidas] = useState({}) // id_curso -> seccion
  const [modalCurso, setModalCurso] = useState(null)
  const [ejecutando, setEjecutando] = useState(false)
  const [retirando, setRetirando] = useState(null)
  const [confirmRetiro, setConfirmRetiro] = useState(null)
  const [msg, setMsg] = useState(null)
  const [exito, setExito] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [cursosRes, mallaRes, seccionesRes, matriculaRes] = await Promise.all([
        planesApi.cursos(alumno.id_plan),
        matriculaApi.malla(alumno.cod_alumno),
        matriculaApi.secciones(periodo.id_periodo, { plan: alumno.id_plan }),
        matriculaApi.actual(alumno.cod_alumno, periodo.id_periodo).catch((err) => {
          if (err instanceof ApiError && err.status === 404) return { matricula: null }
          throw err
        }),
      ])
      const malla = Object.fromEntries((mallaRes.cursos || []).map((c) => [c.id_curso, c]))
      const secciones = {}
      for (const s of seccionesRes.secciones || []) (secciones[s.id_curso] ||= []).push(s)
      setData({ cursos: cursosRes.cursos || [], malla, secciones, matricula: matriculaRes.matricula })
    } catch (err) {
      setError(err)
    }
  }, [alumno.cod_alumno, alumno.id_plan, periodo.id_periodo])

  useEffect(() => {
    load()
  }, [load])

  // Detalles activos de la matrícula del período, por curso
  const matriculados = useMemo(() => {
    const map = {}
    for (const d of data?.matricula?.detalles || []) {
      if (d.estado === 'matriculado' && d.seccion) map[d.seccion.id_curso] = d
    }
    return map
  }, [data])

  const creditosMatriculados = Object.values(matriculados).reduce((s, d) => s + Number(d.seccion.curso?.creditos || 0), 0)
  const creditosElegidos = Object.values(elegidas).reduce((s, sec) => s + Number(sec.curso?.creditos || 0), 0)
  const totalCreditos = creditosMatriculados + creditosElegidos
  const excede = totalCreditos > MAX_CREDITOS

  const cursosCiclo = useMemo(() => (data?.cursos || []).filter((c) => c.ciclo === ciclo), [data, ciclo])

  // Secciones que ya ocupan horario (matriculadas + elegidas), para detectar cruces
  const ocupadas = useMemo(
    () => [
      ...Object.values(matriculados).map((d) => ({ ...d.seccion, origen: 'matriculada' })),
      ...Object.values(elegidas).map((s) => ({ ...s, origen: 'elegida' })),
    ],
    [matriculados, elegidas],
  )
  const cruceCon = (sec, idCursoPropio) => ocupadas.find((o) => o.id_curso !== idCursoPropio && seCruzan(o, sec))

  const elegir = (curso, sec) => {
    setElegidas((prev) => {
      const copy = { ...prev }
      if (copy[curso.id_curso]?.id_seccion === sec.id_seccion) delete copy[curso.id_curso]
      else copy[curso.id_curso] = sec
      return copy
    })
    setModalCurso(null)
  }

  const quitar = (idCurso) =>
    setElegidas((prev) => {
      const copy = { ...prev }
      delete copy[idCurso]
      return copy
    })

  const ejecutar = async () => {
    setMsg(null)
    if (!Object.keys(elegidas).length) return setMsg({ ok: false, text: 'Elige al menos una sección.' })
    if (excede) return setMsg({ ok: false, text: `Superas el tope de ${MAX_CREDITOS} créditos.` })
    setEjecutando(true)
    try {
      const res = await matriculaApi.crear({
        cod_alumno: alumno.cod_alumno,
        id_periodo: periodo.id_periodo,
        secciones: Object.values(elegidas).map((s) => s.id_seccion),
      })
      setElegidas({})
      setExito(res.matricula)
      load()
    } catch (err) {
      setMsg({ ok: false, text: err.detail || 'Ocurrió un error al procesar la matrícula.' })
    } finally {
      setEjecutando(false)
    }
  }

  const retirar = async (detalle) => {
    setConfirmRetiro(null)
    setRetirando(detalle.seccion.id_seccion)
    setMsg(null)
    try {
      await matriculaApi.retirar(data.matricula.nro_matricula, detalle.seccion.id_seccion)
      setMsg({ ok: true, text: `Retiraste ${detalle.seccion.curso?.nombre_curso}. La vacante fue liberada.` })
      await load()
    } catch (err) {
      setMsg({ ok: false, text: err.detail })
    } finally {
      setRetirando(null)
    }
  }

  const descargarPDF = (matricula) => {
    const secciones = (matricula?.detalles || []).filter((d) => d.estado === 'matriculado' && d.seccion).map((d) => d.seccion)
    if (!secciones.length) return
    import('../../utils/generatePdf').then(({ descargarFichaMatriculaPDF }) => descargarFichaMatriculaPDF({
      alumno,
      periodo,
      planNombre: plan.nombre,
      nroMatricula: matricula.nro_matricula,
      secciones,
      totalCreditos: secciones.reduce((s, x) => s + Number(x.curso?.creditos || 0), 0),
      totalAsignaturas: secciones.length,
    }))
  }

  if (error) return <ErrorState error={error} retry={load} />
  if (!data) return <Loading />

  if (exito) {
    const activos = exito.detalles.filter((d) => d.estado === 'matriculado' && d.seccion)
    return (
      <div className="registro-matricula-container">
        <h1 className="page-main-title">Ficha de matrícula</h1>
        <div className="matricula-success-card">
          <div className="success-icon">✓</div>
          <h2>¡Matrícula registrada!</h2>
          <p className="success-sub">
            Período <strong>{periodo.cod_per_acad}</strong> · Facultad de Ingeniería Industrial y de Sistemas.
          </p>
          <div className="success-summary">
            <div>
              <span>N° de matrícula:</span> <strong>{exito.nro_matricula}</strong>
            </div>
            <div>
              <span>Estudiante:</span>{' '}
              <strong>
                {alumno.nombres} {alumno.apellidos} ({alumno.cod_alumno})
              </strong>
            </div>
            <div>
              <span>Plan:</span> <strong>{plan.nombre}</strong>
            </div>
            <div>
              <span>Créditos:</span> <strong>{activos.reduce((s, d) => s + Number(d.seccion.curso?.creditos || 0), 0)}</strong>
            </div>
          </div>
          <div className="table-scroll">
            <table className="success-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Asignatura</th>
                  <th>Sección</th>
                  <th>Créd.</th>
                  <th>Docente</th>
                  <th>Horario y aula</th>
                </tr>
              </thead>
              <tbody>
                {activos.map(({ seccion: s }) => (
                  <tr key={s.id_seccion}>
                    <td>
                      <strong>{s.curso?.codigo_curso}</strong>
                    </td>
                    <td>{s.curso?.nombre_curso}</td>
                    <td>
                      <span className="seccion-pill">{s.nro_seccion}</span>
                    </td>
                    <td>{s.curso?.creditos}</td>
                    <td>{s.docente}</td>
                    <td>
                      <small>{horarioTexto(s)}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="success-actions">
            <button type="button" className="btn-download-pdf" onClick={() => descargarPDF(exito)}>
              📥 Descargar ficha en PDF
            </button>
            <button type="button" className="btn-print" onClick={() => window.print()}>
              🖨️ Imprimir
            </button>
            <button type="button" className="btn-nueva-matricula" onClick={() => setExito(null)}>
              Volver a la matrícula
            </button>
          </div>
        </div>
      </div>
    )
  }

  const hayMatricula = Object.keys(matriculados).length > 0

  return (
    <div className="registro-matricula-container">
      <h1 className="page-main-title">Registro de matrícula</h1>

      <div className="student-card-container">
        <div className="student-card-badge">Datos del estudiante</div>
        <div className="student-info-grid">
          <div className="student-box">
            <span className="student-box-title">Período académico</span>
            <span className="student-box-data">{periodo.cod_per_acad}</span>
          </div>
          <div className="student-box">
            <span className="student-box-title">Estudiante</span>
            <span className="student-box-data">
              {alumno.cod_alumno} · {alumno.apellidos}, {alumno.nombres}
            </span>
          </div>
          <div className="student-box">
            <span className="student-box-title">Programa</span>
            <span className="student-box-data">E.P. de Ingeniería de Sistemas</span>
          </div>
          <div className="student-box">
            <span className="student-box-title">Plan de estudios</span>
            <span className="student-box-data">{plan.nombre}</span>
          </div>
        </div>

        <div className="ciclo-active-banner">
          <div className="ciclo-banner-left">
            <span className="ciclo-pill-badge">Ciclo {romano(ciclo)}</span>
            <div className="ciclo-banner-text">
              <h4 className="ciclo-banner-title">Asignaturas del ciclo {romano(ciclo)}</h4>
              <p className="ciclo-banner-desc">
                Período <strong>{periodo.cod_per_acad}</strong> ({esPeriodoImpar(periodo.cod_per_acad) ? 'semestre impar' : 'semestre par'}) ·{' '}
                {cursosCiclo.length} asignaturas
              </p>
            </div>
          </div>
          <div className="toolbar">
            {hayMatricula && (
              <button type="button" className="btn-secondary" onClick={() => descargarPDF(data.matricula)}>
                📥 Mi ficha PDF
              </button>
            )}
            <button type="button" className="btn-cambiar-plan" onClick={onCambiarCiclo}>
              ⚙️ Cambiar ciclo / período
            </button>
          </div>
        </div>
      </div>

      {msg && <div className={msg.ok ? 'alert-box-success' : 'alert-box-error'}>{msg.text}</div>}

      <div className="courses-table-wrapper">
        {cursosCiclo.length === 0 ? (
          <Empty>No hay asignaturas para el ciclo seleccionado.</Empty>
        ) : (
          <table className="unfv-courses-table">
            <thead>
              <tr>
                <th style={{ width: 60, textAlign: 'center' }}>Ciclo</th>
                <th style={{ width: 110 }}>Tipo</th>
                <th style={{ minWidth: 240 }}>Asignatura</th>
                <th style={{ width: 75, textAlign: 'center' }}>Créditos</th>
                <th style={{ minWidth: 260 }}>Docente y horario</th>
                <th style={{ width: 150, textAlign: 'center' }}>Sección</th>
                <th style={{ width: 110, textAlign: 'center' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {cursosCiclo.map((curso) => {
                const estado = data.malla[curso.id_curso]?.estado
                const matriculado = matriculados[curso.id_curso]
                const elegida = elegidas[curso.id_curso]
                const secciones = data.secciones[curso.id_curso] || []
                const isElectivo = Boolean(curso.mencion_electiva) || /electiv/i.test(curso.nombre_curso)
                const aprobado = estado === 'aprobado'
                const bloqueado = estado === 'bloqueado_por_prerrequisito'
                const enOtroPeriodo = estado === 'en_curso' && !matriculado
                const puedeElegir = !matriculado && !aprobado && !bloqueado && !enOtroPeriodo && secciones.length > 0
                const mostrar = matriculado?.seccion || elegida || secciones[0]

                return (
                  <tr key={curso.id_curso} className={matriculado ? 'row-enrolled' : elegida ? 'row-selected' : ''}>
                    <td style={{ textAlign: 'center' }}>
                      <span className="ciclo-badge">{curso.ciclo}</span>
                    </td>
                    <td>
                      <span className={`tipo-tag ${isElectivo ? 'tipo-e' : 'tipo-o'}`}>{isElectivo ? 'E - Electivo' : 'O - Obligatorio'}</span>
                    </td>
                    <td>
                      <span className="course-fullname">
                        <strong>{curso.codigo_curso}</strong> - {curso.nombre_curso}
                      </span>
                      {curso.area_curricular && <small className="course-area">{curso.area_curricular}</small>}
                      {aprobado && <span className="prereq-badge-approved">✓ Ya aprobado</span>}
                      {bloqueado && <span className="prereq-badge-blocked">🔒 Falta aprobar prerrequisitos</span>}
                      {estado === 'desaprobado' && <span className="prereq-badge-blocked">Desaprobado · puedes volver a llevarlo</span>}
                      {enOtroPeriodo && <span className="prereq-badge-blocked">En curso en otro período</span>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="course-credits">{curso.creditos}</span>
                    </td>
                    <td>
                      {mostrar ? (
                        <div className={`table-docente-horario ${matriculado || elegida ? 'active-selection' : ''}`}>
                          <span className="schedule-docente">👨‍🏫 {mostrar.docente}</span>
                          <span className="schedule-time">📅 {horarioTexto(mostrar)}</span>
                          {!matriculado && !elegida && secciones.length > 1 && (
                            <small className="schedule-more-sections">+{secciones.length - 1} sección alternativa</small>
                          )}
                        </div>
                      ) : (
                        <span className="schedule-pending">Horario por publicar</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {matriculado ? (
                        <span className="pill pill-ok">Matriculado · {matriculado.seccion.nro_seccion}</span>
                      ) : elegida ? (
                        <div className="chosen-section-badge">
                          <span>Sección {elegida.nro_seccion}</span>
                          <button type="button" className="btn-remove-section" onClick={() => quitar(curso.id_curso)} title="Quitar sección">
                            ×
                          </button>
                        </div>
                      ) : (
                        <span className="no-section">--</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {matriculado ? (
                        matriculado.nota_final !== null ? (
                          <span className="small muted">Con nota</span>
                        ) : confirmRetiro === curso.id_curso ? (
                          <div className="stack-xs">
                            <button type="button" className="btn-danger btn-sm" onClick={() => retirar(matriculado)}>
                              Confirmar
                            </button>
                            <button type="button" className="btn-secondary btn-sm" onClick={() => setConfirmRetiro(null)}>
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            disabled={retirando === matriculado.seccion.id_seccion}
                            onClick={() => setConfirmRetiro(curso.id_curso)}
                          >
                            Retirar
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          className={`btn-choose-section-yellow ${puedeElegir ? '' : 'disabled'}`}
                          disabled={!puedeElegir}
                          onClick={() => setModalCurso(curso)}
                          title={
                            aprobado
                              ? 'Asignatura ya aprobada'
                              : bloqueado
                                ? 'Debes aprobar los prerrequisitos (nota ≥ 11)'
                                : secciones.length === 0
                                  ? 'Sin secciones programadas'
                                  : 'Elegir sección'
                          }
                        >
                          <span className="hand-icon">{bloqueado ? '🔒' : aprobado ? '✓' : '👆'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="credits-summary-cards">
        <div className="credit-pill-box">
          Tope de créditos: <strong>{MAX_CREDITOS}</strong>
        </div>
        <div className="credit-pill-box">
          Ya matriculados: <strong>{creditosMatriculados}</strong>
        </div>
        <div className={`credit-pill-box ${excede ? 'over-limit' : ''}`}>
          Total con selección: <strong>{totalCreditos}</strong>
        </div>
        <div className="credit-pill-box">
          Asignaturas por matricular: <strong>{Object.keys(elegidas).length}</strong>
        </div>
      </div>

      <div className="actions-matricula-container">
        <button
          type="button"
          className="btn-ejecutar-matricula"
          disabled={ejecutando || !Object.keys(elegidas).length || excede}
          onClick={ejecutar}
        >
          {ejecutando ? 'Procesando matrícula…' : 'Ejecutar matrícula'}
        </button>
      </div>

      {modalCurso && (
        <div className="modal-overlay" onClick={() => setModalCurso(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                Secciones: <span>{modalCurso.codigo_curso} - {modalCurso.nombre_curso}</span>
              </h3>
              <button type="button" className="btn-close-modal" onClick={() => setModalCurso(null)} aria-label="Cerrar">
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-sections-list">
                {(data.secciones[modalCurso.id_curso] || []).map((sec) => {
                  const selected = elegidas[modalCurso.id_curso]?.id_seccion === sec.id_seccion
                  const cruce = cruceCon(sec, modalCurso.id_curso)
                  const sinCupo = sec.cupo_disponible <= 0
                  return (
                    <div key={sec.id_seccion} className={`modal-section-card ${selected ? 'selected' : ''}`}>
                      <div className="section-card-info">
                        <h4>Sección {sec.nro_seccion}</h4>
                        <p>
                          <strong>Docente:</strong> {sec.docente}
                        </p>
                        <p>
                          <strong>Horario:</strong> {horarioTexto(sec)}
                        </p>
                        <p className="vacantes-text">
                          <strong>Vacantes:</strong> {sec.cupo_disponible} / {sec.cupo_maximo}
                        </p>
                        {cruce && (
                          <p className="cruce-warning">
                            ⚠️ Se cruza con {cruce.curso?.nombre_curso} ({cruce.origen === 'matriculada' ? 'ya matriculada' : 'seleccionada'})
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        className={`btn-select-sec ${selected ? 'btn-quitar' : 'btn-elegir'}`}
                        onClick={() => elegir(modalCurso, sec)}
                        disabled={!selected && (sinCupo || Boolean(cruce))}
                      >
                        {selected ? '✓ Seleccionada (quitar)' : sinCupo ? 'Sin vacantes' : cruce ? 'Cruce de horario' : 'Elegir sección'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-modal-cancel" onClick={() => setModalCurso(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
