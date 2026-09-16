import React, { useEffect, useState, useMemo } from 'react'
import { alumnosApi, matriculaApi, planesApi } from '../../api/client'

export default function CalificacionesModal({ isOpen, onClose, alumno, onNotasUpdated }) {
  const [cursos, setCursos] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCicloFilter, setSelectedCicloFilter] = useState('todos')
  const [gradeInputs, setGradeInputs] = useState({})
  const [savingCode, setSavingCode] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  const idPlan = alumno?.id_plan || alumno?.corr_pe || 2

  const loadData = async () => {
    if (!alumno?.cod_alumno) return
    setLoading(true)
    setErrorMsg('')
    try {
      // 1. Obtener todos los cursos del plan
      const cursosRes = await planesApi.cursos(idPlan)
      const listaCursos = cursosRes.cursos || []

      // 2. Obtener el historial para saber qué notas tiene el alumno
      let notasMap = {}
      try {
        const histRes = await matriculaApi.historial(alumno.cod_alumno)
        const historial = histRes.historial || []
        historial.forEach((item) => {
          if (item.curso && item.nota_final !== null && item.nota_final !== undefined) {
            notasMap[item.curso.cod_curso] = {
              nota: Number(item.nota_final),
              estado: item.estado_academico,
              id_seccion: item.id_seccion,
              nro_matricula: item.nro_matricula,
            }
          }
        })
      } catch (err) {
        console.warn('Historial previo no disponible:', err)
      }

      // Combinar cursos con sus notas
      const cursosConNotas = listaCursos.map((c) => ({
        ...c,
        notaActual: notasMap[c.cod_curso]?.nota ?? null,
        estadoAcademico:
          notasMap[c.cod_curso]?.nota !== undefined
            ? notasMap[c.cod_curso].nota >= 11
              ? 'aprobado'
              : 'desaprobado'
            : 'pendiente',
      }))

      setCursos(cursosConNotas)

      // Inicializar inputs
      const initialInputs = {}
      cursosConNotas.forEach((c) => {
        initialInputs[c.cod_curso] = c.notaActual !== null ? String(c.notaActual) : ''
      })
      setGradeInputs(initialInputs)
    } catch (err) {
      setErrorMsg(err.detail || err.message || 'Error al cargar cursos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      setFeedback(null)
      setErrorMsg('')
      loadData()
    }
  }, [isOpen, alumno])

  if (!isOpen) return null

  const handleInputChange = (codCurso, val) => {
    setGradeInputs((prev) => ({
      ...prev,
      [codCurso]: val,
    }))
  }

  const handleGuardarNota = async (curso) => {
    const rawVal = gradeInputs[curso.cod_curso]
    if (rawVal === '' || rawVal === undefined) {
      setErrorMsg('Ingresa una nota entre 0 y 20.')
      return
    }

    const numNota = Number(rawVal)
    if (isNaN(numNota) || numNota < 0 || numNota > 20) {
      setErrorMsg('La nota debe ser un número válido entre 0 y 20.')
      return
    }

    setSavingCode(curso.cod_curso)
    setErrorMsg('')
    setFeedback(null)

    try {
      const res = await alumnosApi.calificar(alumno.cod_alumno, curso.cod_curso, numNota)
      setFeedback({
        tipo: res.es_aprobado ? 'aprobado' : 'desaprobado',
        mensaje: res.mensaje,
        cursoNombre: curso.nombre_curso || curso.den_curso,
        nota: numNota,
        sucesores: res.sucesores || [],
      })

      // Actualizar estado local
      setCursos((prev) =>
        prev.map((c) =>
          c.cod_curso === curso.cod_curso
            ? {
                ...c,
                notaActual: numNota,
                estadoAcademico: numNota >= 11 ? 'aprobado' : 'desaprobado',
              }
            : c
        )
      )

      if (onNotasUpdated) {
        onNotasUpdated()
      }
    } catch (err) {
      setErrorMsg(err.detail || err.message || 'Error al registrar la calificación.')
    } finally {
      setSavingCode(null)
    }
  }

  const filteredCursos = cursos.filter((c) => {
    const matchCiclo =
      selectedCicloFilter === 'todos' || String(c.ciclo) === String(selectedCicloFilter)
    if (!matchCiclo) return false

    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const nom = (c.nombre_curso || c.den_curso || '').toLowerCase()
    const cod = String(c.cod_curso || '').toLowerCase()
    return nom.includes(q) || cod.includes(q)
  })

  const getRoman = (n) => {
    const r = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X' }
    return r[n] || n
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 1300,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '96vw',
          maxWidth: '980px',
          height: '90vh',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #cbd5e1',
        }}
      >
        {/* Header Institucional */}
        <div
          style={{
            padding: '1.2rem 1.75rem',
            background: 'linear-gradient(135deg, #0a2540 0%, #0f3b60 100%)',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#93c5fd',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: '0.25rem',
              }}
            >
              <span>🏛️ UNFV · FIIS</span>
              <span>•</span>
              <span>E.P. de Ingeniería de Sistemas</span>
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#ffffff',
              }}
            >
              🎯 Asignación de Calificaciones y Control de Prerrequisitos
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#e2e8f0' }}>
              Alumno(a): <strong>{alumno?.nombres} {alumno?.apellidos}</strong> (Código: <code>{alumno?.cod_alumno}</code>)
            </p>
          </div>

          <button
            onClick={onClose}
            title="Cerrar ventana"
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: '#ffffff',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.85)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
          >
            ✕
          </button>
        </div>

        {/* Regla Oficial UNFV */}
        <div
          style={{
            background: '#f0fdf4',
            borderBottom: '1.5px solid #bbf7d0',
            padding: '0.85rem 1.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
          }}
        >
          <span style={{ fontSize: '1.4rem' }}>💡</span>
          <div style={{ fontSize: '0.86rem', color: '#166534', lineHeight: 1.45 }}>
            <strong>Regla Académica:</strong> Una nota de <strong>11 a 20 APRUEBA</strong> la asignatura y{' '}
            <strong>habilita inmediatamente</strong> los cursos sucesores que la exigen como prerrequisito para la matrícula.{' '}
            Una nota de <strong>10 o menos DESAPRUEBA</strong> y <strong>bloquea</strong> la matrícula de dichos cursos en el siguiente período.
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            style={{
              margin: '1rem 1.75rem 0',
              padding: '1rem',
              borderRadius: '10px',
              background: feedback.tipo === 'aprobado' ? '#ecfdf5' : '#fef2f2',
              border: `1.5px solid ${feedback.tipo === 'aprobado' ? '#10b981' : '#ef4444'}`,
              color: feedback.tipo === 'aprobado' ? '#065f46' : '#991b1b',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.35rem' }}>
              {feedback.tipo === 'aprobado' ? '✅ Asignatura Aprobada' : '❌ Asignatura Desaprobada'} (Nota: {feedback.nota})
            </div>
            <div style={{ fontSize: '0.88rem' }}>{feedback.mensaje}</div>
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              margin: '1rem 1.75rem 0',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1.5px solid #ef4444',
              color: '#991b1b',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Barra de Filtros y Búsqueda */}
        <div
          style={{
            padding: '1rem 1.75rem',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Búsqueda */}
          <div style={{ flex: '1', minWidth: '240px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Buscar curso por nombre o código..."
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: '#0f172a',
                background: '#ffffff',
              }}
            />
          </div>

          {/* Chips por Ciclo */}
          <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', maxWidth: '100%', paddingBottom: '0.2rem' }}>
            <button
              type="button"
              onClick={() => setSelectedCicloFilter('todos')}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
                background: selectedCicloFilter === 'todos' ? '#0f3b60' : '#ffffff',
                color: selectedCicloFilter === 'todos' ? '#ffffff' : '#334155',
              }}
            >
              Todos los Ciclos
            </button>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSelectedCicloFilter(n)}
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  background: selectedCicloFilter === n ? '#0f3b60' : '#ffffff',
                  color: selectedCicloFilter === n ? '#ffffff' : '#334155',
                }}
              >
                Ciclo {getRoman(n)}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla de Asignaturas */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.75rem' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              Cargando catálogo de asignaturas y estado académico...
            </div>
          ) : filteredCursos.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              No se encontraron asignaturas para el criterio de búsqueda.
            </div>
          ) : (
            <div style={{ border: '1.5px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <tr>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#0f172a', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>
                      Ciclo
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#0f172a', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>
                      Código
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#0f172a', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>
                      Asignatura
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#0f172a', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>
                      Estado Actual
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#0f172a', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>
                      Asignar Nota (0 - 20)
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#0f172a', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCursos.map((curso, idx) => {
                    const currentInput = gradeInputs[curso.cod_curso] ?? ''
                    const num = Number(currentInput)
                    const hasInput = currentInput !== '' && !isNaN(num)
                    const isPreviewApproved = hasInput && num >= 11
                    const isSaving = savingCode === curso.cod_curso

                    return (
                      <tr
                        key={curso.cod_curso}
                        style={{
                          background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                          borderBottom: '1px solid #e2e8f0',
                          transition: 'background 0.15s',
                        }}
                      >
                        {/* Ciclo */}
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span
                            style={{
                              background: '#e0f2fe',
                              color: '#0369a1',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                            }}
                          >
                            Ciclo {getRoman(curso.ciclo)}
                          </span>
                        </td>

                        {/* Código */}
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, fontFamily: 'monospace', color: '#334155' }}>
                          {curso.cod_curso}
                        </td>

                        {/* Asignatura */}
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.92rem' }}>
                            {curso.nombre_curso || curso.den_curso}
                          </strong>
                          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                            {curso.creditos} Créditos · Tipo: {curso.tipo_curso || 'Obligatorio'}
                          </span>
                        </td>

                        {/* Estado Actual */}
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          {curso.notaActual !== null ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.3rem 0.75rem',
                                borderRadius: '999px',
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                background: curso.notaActual >= 11 ? '#dcfce7' : '#fee2e2',
                                color: curso.notaActual >= 11 ? '#15803d' : '#b91c1c',
                                border: `1px solid ${curso.notaActual >= 11 ? '#86efac' : '#fca5a5'}`,
                              }}
                            >
                              {curso.notaActual >= 11 ? '✓ Aprobado' : '✗ Desaprobado'} ({curso.notaActual})
                            </span>
                          ) : (
                            <span
                              style={{
                                padding: '0.3rem 0.65rem',
                                borderRadius: '999px',
                                fontWeight: 600,
                                fontSize: '0.78rem',
                                background: '#f1f5f9',
                                color: '#64748b',
                              }}
                            >
                              Pendiente
                            </span>
                          )}
                        </td>

                        {/* Input de Nota */}
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                            <input
                              type="number"
                              min="0"
                              max="20"
                              step="0.5"
                              value={currentInput}
                              onChange={(e) => handleInputChange(curso.cod_curso, e.target.value)}
                              placeholder="0 - 20"
                              style={{
                                width: '75px',
                                padding: '0.45rem 0.6rem',
                                border: '1.5px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '0.92rem',
                                fontWeight: 700,
                                textAlign: 'center',
                                color: '#0f172a',
                                background: '#ffffff',
                              }}
                            />
                            {hasInput && (
                              <span
                                style={{
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  padding: '0.2rem 0.45rem',
                                  borderRadius: '4px',
                                  background: isPreviewApproved ? '#dcfce7' : '#fee2e2',
                                  color: isPreviewApproved ? '#166534' : '#991b1b',
                                }}
                              >
                                {isPreviewApproved ? '>=11 (Aprueba)' : '<=10 (Desaprueba)'}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Botón Guardar */}
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <button
                            type="button"
                            disabled={isSaving || currentInput === ''}
                            onClick={() => handleGuardarNota(curso)}
                            style={{
                              background: '#0f3b60',
                              color: '#ffffff',
                              border: 'none',
                              padding: '0.45rem 0.95rem',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              cursor: isSaving || currentInput === '' ? 'not-allowed' : 'pointer',
                              boxShadow: '0 2px 6px rgba(15, 59, 96, 0.2)',
                              transition: 'all 0.18s ease',
                              opacity: isSaving || currentInput === '' ? 0.6 : 1,
                            }}
                            onMouseOver={(e) => {
                              if (!isSaving && currentInput !== '') e.currentTarget.style.background = '#0284c7'
                            }}
                            onMouseOut={(e) => {
                              if (!isSaving && currentInput !== '') e.currentTarget.style.background = '#0f3b60'
                            }}
                          >
                            {isSaving ? 'Guardando...' : '💾 Guardar'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '0.9rem 1.75rem',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Los cambios se guardan directamente en PostgreSQL y actualizan el estado de la matrícula en tiempo real.
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#0f3b60',
              color: '#ffffff',
              border: 'none',
              padding: '0.55rem 1.4rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            Listo / Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
