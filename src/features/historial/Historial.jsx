import { useCallback, useEffect, useMemo, useState } from 'react'
import { matriculaApi } from '../../api/client'
import { Empty, ErrorState, Loading } from '../../components/AsyncState'

const statusLabels = {
  matriculado: 'Matriculado',
  aprobado: 'Aprobado',
  desaprobado: 'Desaprobado',
  retirado: 'Retirado',
}

export default function Historial({ alumno }) {
  const [history, setHistory] = useState(null)
  const [error, setError] = useState(null)
  const [gradeValues, setGradeValues] = useState({})
  const [savingGradeId, setSavingGradeId] = useState(null)
  const [gradeError, setGradeError] = useState(null)
  const [gradeSuccess, setGradeSuccess] = useState(null)
  const [passingGrade, setPassingGrade] = useState(11)

  const load = useCallback(() => {
    setError(null)
    matriculaApi
      .historial(alumno.cod_alumno)
      .then(({ historial, nota_minima }) => {
        setHistory(historial)
        setPassingGrade(nota_minima ?? 11)
      })
      .catch(setError)
  }, [alumno.cod_alumno])

  useEffect(load, [load])

  const groups = useMemo(() => {
    const map = new Map()
    ;(history || []).forEach((item) => {
      const key = item.periodo.cod_per_acad
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(item)
    })
    return [...map.entries()]
  }, [history])

  const getGradeValue = (item) => gradeValues[item.id_detalle] ?? item.nota_final ?? ''

  const saveGrade = async (item) => {
    const rawGrade = getGradeValue(item)
    const grade = Number(rawGrade)
    setGradeError(null)
    setGradeSuccess(null)

    if (rawGrade === '' || !Number.isFinite(grade) || grade < 0 || grade > 20) {
      setGradeError('Ingresa una nota válida entre 0 y 20.')
      return
    }

    setSavingGradeId(item.id_detalle)
    try {
      const { detalle } = await matriculaApi.registrarNota(item.nro_matricula, item.id_seccion, grade)
      const outcome = detalle.estado_academico === 'aprobado' ? 'Aprobado' : 'Desaprobado'
      setGradeSuccess(`Nota registrada: ${outcome}. ${outcome === 'Aprobado' ? 'Los cursos que dependan de este prerrequisito quedan habilitados.' : 'Los cursos que requieren este prerrequisito permanecerán bloqueados.'}`)
      setGradeValues((current) => ({ ...current, [item.id_detalle]: detalle.nota_final }))
      setHistory((current) => current?.map((row) => (
        row.id_detalle === item.id_detalle
          ? { ...row, nota_final: detalle.nota_final, estado_academico: detalle.estado_academico }
          : row
      )) ?? current)
    } catch (err) {
      setGradeError(err.detail || err.message || 'No fue posible registrar la nota.')
    } finally {
      setSavingGradeId(null)
    }
  }

  if (error) return <ErrorState error={error} retry={load} />
  if (!history) return <Loading />

  return (
    <section>
      <div className="section-title">
        <div>
          <p className="eyebrow">Trayectoria académica</p>
          <h2>Historial académico</h2>
          <p>Registra una nota final de 0 a 20. Con {passingGrade} o más el curso queda aprobado y habilita sus cursos dependientes.</p>
        </div>
      </div>

      {gradeError && <div className="alert-box-error">{gradeError}</div>}
      {gradeSuccess && <div className="alert-box-success">{gradeSuccess}</div>}

      {groups.length === 0 ? (
        <Empty>Aún no existen cursos registrados en tu historial.</Empty>
      ) : groups.map(([period, rows]) => (
        <article className="history-group" key={period}>
          <h3>{period}</h3>
          <div className="history-table">
            <div className="history-head">
              <span>Curso</span>
              <span>Créditos</span>
              <span>Estado</span>
              <span>Nota final</span>
            </div>
            {rows.map((item) => {
              const status = item.estado_academico || item.estado
              const canRecordGrade = item.estado === 'matriculado'
              const grade = item.nota_final
              return (
                <div className="history-row" key={item.id_detalle}>
                  <span><b>{item.curso.codigo_curso}</b> {item.curso.nombre_curso}</span>
                  <span>{item.curso.creditos}</span>
                  <span className={status === 'aprobado' ? 'grade passed' : status === 'desaprobado' ? 'grade failed' : ''}>{statusLabels[status] || status}</span>
                  <div className="history-grade-editor">
                    <input
                      aria-label={`Nota de ${item.curso.nombre_curso}`}
                      className={`history-grade-input ${grade >= passingGrade ? 'grade passed' : grade !== null ? 'grade failed' : ''}`}
                      type="number"
                      min="0"
                      max="20"
                      step="1"
                      value={getGradeValue(item)}
                      disabled={!canRecordGrade || savingGradeId === item.id_detalle}
                      onChange={(event) => setGradeValues((current) => ({ ...current, [item.id_detalle]: event.target.value }))}
                    />
                    <button
                      type="button"
                      className="history-grade-save"
                      disabled={!canRecordGrade || savingGradeId === item.id_detalle}
                      onClick={() => saveGrade(item)}
                    >
                      {savingGradeId === item.id_detalle ? 'Guardando…' : 'Guardar'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </article>
      ))}
    </section>
  )
}
