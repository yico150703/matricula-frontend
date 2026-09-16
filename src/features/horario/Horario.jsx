import { useCallback, useEffect, useState } from 'react'
import { ApiError, matriculaApi } from '../../api/client'
import { Empty, ErrorState, Loading } from '../../components/AsyncState'

const weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default function Horario({ alumno }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [ocultosIds, setOcultosIds] = useState(() => {
    try {
      const saved = localStorage.getItem(`horario_ocultos_${alumno?.cod_alumno}`)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [autoHideApproved, setAutoHideApproved] = useState(true)
  const [toastMessage, setToastMessage] = useState('')

  const load = useCallback(async () => {
    try {
      setError(null)
      const periods = await matriculaApi.periodos()
      const current = periods.periodos.find((item) => item.estado === 'en_curso') || periods.periodos[0]
      if (!current) return setData({ period: null, details: [] })

      try {
        const response = await matriculaApi.actual(alumno.cod_alumno, current.id_periodo)
        setData({
          period: current,
          details: response.matricula.detalles.filter((item) => item.estado === 'matriculado'),
        })
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setData({ period: current, details: [] })
        } else {
          throw err
        }
      }
    } catch (err) {
      setError(err)
    }
  }, [alumno.cod_alumno])

  useEffect(() => {
    load()
  }, [load])

  const handleBorrarDelCalendario = (item) => {
    const newOcultos = [...ocultosIds, item.id]
    setOcultosIds(newOcultos)
    try {
      localStorage.setItem(`horario_ocultos_${alumno?.cod_alumno}`, JSON.stringify(newOcultos))
    } catch (e) {
      console.warn(e)
    }

    const cursoNom = item.seccion?.curso?.nombre_curso || item.seccion?.curso?.den_curso || 'La asignatura'
    setToastMessage(
      `🗑️ '${cursoNom}' fue retirado del calendario para que no estorbe. Tu aprobación con nota ${item.nota_final} se mantiene registrada en el historial.`
    )
    setTimeout(() => setToastMessage(''), 5000)
  }

  const handleRestaurarHorario = () => {
    setOcultosIds([])
    try {
      localStorage.removeItem(`horario_ocultos_${alumno?.cod_alumno}`)
    } catch (e) {
      console.warn(e)
    }
    setToastMessage('🔄 Se han restaurado todos los cursos en tu calendario semanal.')
    setTimeout(() => setToastMessage(''), 4000)
  }

  if (error) return <ErrorState error={error} retry={load} />
  if (!data) return <Loading />
  if (!data.period) return <Empty>No hay período académico en curso.</Empty>

  // Filtrado de cursos para el calendario semanal
  const visibleDetails = data.details.filter((item) => {
    // Si fue borrado manualmente por el usuario
    if (ocultosIds.includes(item.id)) return false
    // Si la opción de auto-ocultar cursos aprobados está activa
    const isApproved = item.nota_final !== null && item.nota_final !== undefined && Number(item.nota_final) >= 11
    if (autoHideApproved && isApproved) return false
    return true
  })

  const approvedCount = data.details.filter(
    (item) => item.nota_final !== null && Number(item.nota_final) >= 11
  ).length

  return (
    <section>
      <div className="section-title">
        <div>
          <p className="eyebrow">Período {data.period.cod_per_acad} · UNFV FIIS</p>
          <h2>Mi Horario Semanal</h2>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
            Visualiza la distribución de tus asignaturas matriculadas de Lunes a Sábado.
          </p>
        </div>

        {/* Controles de Calendario */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {approvedCount > 0 && (
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#15803d',
                background: '#dcfce7',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid #86efac',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={autoHideApproved}
                onChange={(e) => setAutoHideApproved(e.target.checked)}
              />
              <span>Ocultar cursos ya aprobados ({approvedCount})</span>
            </label>
          )}

          {ocultosIds.length > 0 && (
            <button
              type="button"
              onClick={handleRestaurarHorario}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#334155',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🔄 Restaurar borrados ({ocultosIds.length})
            </button>
          )}
        </div>
      </div>

      {toastMessage && (
        <div
          style={{
            margin: '1rem 0',
            padding: '0.85rem 1.25rem',
            background: '#ecfdf5',
            border: '1.5px solid #10b981',
            borderRadius: '10px',
            color: '#065f46',
            fontWeight: 600,
            fontSize: '0.9rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage('')}
            style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {visibleDetails.length === 0 ? (
        <div
          style={{
            padding: '3rem',
            textAlign: 'center',
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🗓️</div>
          <h3 style={{ color: '#0f172a', margin: '0 0 0.5rem 0' }}>No hay asignaturas activas en este horario</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto' }}>
            {data.details.length > 0
              ? 'Todos tus cursos matriculados ya fueron aprobados y retirados del calendario para que no estorben.'
              : 'Aún no tienes secciones matriculadas para el período académico actual.'}
          </p>
          {ocultosIds.length > 0 && (
            <button
              type="button"
              onClick={handleRestaurarHorario}
              style={{
                marginTop: '1rem',
                background: '#0f3b60',
                color: '#ffffff',
                border: 'none',
                padding: '0.55rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Mostrar cursos aprobados en el calendario
            </button>
          )}
        </div>
      ) : (
        <div className="schedule">
          {weekdays.map((day, index) => {
            const dayCourses = visibleDetails.filter((item) => item.seccion?.dia === index + 1)
            return (
              <div className="day-column" key={day}>
                <h3>{day}</h3>
                {dayCourses.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', padding: '1.5rem 0' }}>
                    Sin clases
                  </div>
                ) : (
                  dayCourses.map((item) => {
                    const isApproved =
                      item.nota_final !== null &&
                      item.nota_final !== undefined &&
                      Number(item.nota_final) >= 11

                    return (
                      <article
                        className="event"
                        key={item.id}
                        style={{
                          background: isApproved ? '#f0fdf4' : '#e8f4ff',
                          borderLeft: `4px solid ${isApproved ? '#16a34a' : '#1479c9'}`,
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <time style={{ fontWeight: 700 }}>
                            {item.seccion?.hora_inicio}–{item.seccion?.hora_fin}
                          </time>

                          {/* Botón para borrar del calendario si está aprobado */}
                          {isApproved && (
                            <button
                              type="button"
                              onClick={() => handleBorrarDelCalendario(item)}
                              title="Borrar del calendario para que no estorbe (ya aprobado)"
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#dc2626',
                                padding: '0.15rem 0.4rem',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              🗑️ Borrar
                            </button>
                          )}
                        </div>

                        <strong>{item.seccion?.curso?.nombre_curso || item.seccion?.curso?.den_curso}</strong>
                        <span>Sección {item.seccion?.num_seccion || item.seccion?.nro_seccion} · Aula {item.seccion?.num_aula || item.seccion?.aula}</span>
                        <small>{item.seccion?.docente_nombre || item.seccion?.docente || 'Docente FIIS'}</small>

                        {/* Estado académico */}
                        {item.nota_final !== null && item.nota_final !== undefined && (
                          <div style={{ marginTop: '0.35rem' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                padding: '0.15rem 0.5rem',
                                borderRadius: '4px',
                                background: isApproved ? '#dcfce7' : '#fee2e2',
                                color: isApproved ? '#15803d' : '#b91c1c',
                              }}
                            >
                              {isApproved ? `✓ Aprobado (Nota: ${item.nota_final})` : `✗ Desaprobado (${item.nota_final})`}
                            </span>
                          </div>
                        )}
                      </article>
                    )
                  })
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
