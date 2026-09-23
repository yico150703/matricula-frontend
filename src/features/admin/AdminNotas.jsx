import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adminApi, matriculaApi } from '../../api/client'
import { ErrorState, Loading } from '../../components/AsyncState'
import { planPorId, romano } from '../../utils/academico'

const ESTADOS = {
  aprobado: ['Aprobado', 'pill-ok'],
  desaprobado: ['Desaprobado', 'pill-bad'],
  en_curso: ['En curso', 'pill-info'],
  disponible: ['Disponible', 'pill-muted'],
  bloqueado_por_prerrequisito: ['Bloqueado', 'pill-lock'],
}

function PanelNotas({ alumno }) {
  const [cursos, setCursos] = useState(null)
  const [notaMinima, setNotaMinima] = useState(11)
  const [error, setError] = useState(null)
  const [inputs, setInputs] = useState({})
  const [saving, setSaving] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [ciclo, setCiclo] = useState('todos')
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    setError(null)
    try {
      const [malla, hist] = await Promise.all([matriculaApi.malla(alumno.cod_alumno), matriculaApi.historial(alumno.cod_alumno)])
      // Nota vigente por curso: la aprobada si existe, si no la más reciente
      const notas = {}
      for (const h of hist.historial || []) {
        if (h.nota_final === null || h.estado !== 'matriculado') continue
        const key = h.curso.id_curso
        const prev = notas[key]
        if (!prev || (h.estado_academico === 'aprobado' && prev.estado_academico !== 'aprobado')) notas[key] = h
      }
      const list = (malla.cursos || []).map((c) => ({ ...c, nota: notas[c.id_curso]?.nota_final ?? null, periodoNota: notas[c.id_curso]?.periodo?.cod_per_acad }))
      setCursos(list)
      setNotaMinima(malla.nota_minima ?? 11)
      setInputs(Object.fromEntries(list.map((c) => [c.id_curso, c.nota ?? ''])))
    } catch (err) {
      setError(err)
    }
  }, [alumno.cod_alumno])

  useEffect(() => {
    setCursos(null)
    setFeedback(null)
    load()
  }, [load])

  const guardar = async (curso) => {
    const raw = inputs[curso.id_curso]
    const nota = Number(raw)
    if (raw === '' || !Number.isFinite(nota) || nota < 0 || nota > 20) {
      setFeedback({ ok: false, text: 'Ingresa una nota válida entre 0 y 20.' })
      return
    }
    setSaving(curso.id_curso)
    setFeedback(null)
    try {
      const res = await adminApi.calificar(alumno.cod_alumno, curso.cod_curso, nota)
      setFeedback({ ok: res.es_aprobado, text: res.mensaje })
      await load()
    } catch (err) {
      setFeedback({ ok: false, text: err.detail })
    } finally {
      setSaving(null)
    }
  }

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (cursos || []).filter(
      (c) =>
        (ciclo === 'todos' || c.ciclo === ciclo) &&
        (!term || c.nombre_curso.toLowerCase().includes(term) || String(c.codigo_curso).toLowerCase().includes(term)),
    )
  }, [cursos, ciclo, q])

  if (error) return <ErrorState error={error} retry={load} />
  if (!cursos) return <Loading />

  const aprobados = cursos.filter((c) => c.estado === 'aprobado')
  const creditos = aprobados.reduce((s, c) => s + Number(c.creditos || 0), 0)

  return (
    <>
      <div className="stat-grid">
        <div className="stat">
          <b>{aprobados.length}</b>
          <span>Cursos aprobados de {cursos.length}</span>
        </div>
        <div className="stat">
          <b>{creditos}</b>
          <span>Créditos aprobados</span>
        </div>
        <div className="stat">
          <b>{cursos.filter((c) => c.estado === 'en_curso').length}</b>
          <span>En curso (sin nota)</span>
        </div>
        <div className="stat">
          <b>{cursos.filter((c) => c.estado === 'desaprobado').length}</b>
          <span>Desaprobados</span>
        </div>
      </div>

      <p className="info-strip">
        Nota de <b>{notaMinima} a 20</b> aprueba y habilita los cursos que la tienen como prerrequisito. Nota menor a {notaMinima}{' '}
        desaprueba. Si el alumno está matriculado en el curso, la nota se registra en esa matrícula.
      </p>
      {feedback && <p className={feedback.ok ? 'form-success' : 'form-error'}>{feedback.text}</p>}

      <div className="toolbar wrap">
        <input className="search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Buscar curso" />
        <div className="chips">
          <button type="button" className={`chip ${ciclo === 'todos' ? 'active' : ''}`} onClick={() => setCiclo('todos')}>
            Todos
          </button>
          {[...new Set(cursos.map((c) => c.ciclo))].map((n) => (
            <button key={n} type="button" className={`chip ${ciclo === n ? 'active' : ''}`} onClick={() => setCiclo(n)}>
              {romano(n)}
            </button>
          ))}
        </div>
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ciclo</th>
              <th>Código</th>
              <th>Asignatura</th>
              <th>Estado</th>
              <th>Nota actual</th>
              <th className="right">Registrar nota</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((c) => {
              const [label, cls] = ESTADOS[c.estado] || [c.estado, 'pill-muted']
              const value = inputs[c.id_curso] ?? ''
              const changed = String(value) !== String(c.nota ?? '')
              return (
                <tr key={c.id_curso}>
                  <td>{romano(c.ciclo)}</td>
                  <td>
                    <code className="code-chip light">{c.codigo_curso}</code>
                  </td>
                  <td>
                    <strong>{c.nombre_curso}</strong>
                    <div className="small muted">{c.creditos} créditos</div>
                  </td>
                  <td>
                    <span className={`pill ${cls}`}>{label}</span>
                  </td>
                  <td>
                    {c.nota !== null ? (
                      <span className={`grade-badge ${c.nota >= notaMinima ? 'ok' : 'bad'}`}>
                        {c.nota} <small>{c.periodoNota}</small>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="right">
                    <form
                      className="grade-form"
                      onSubmit={(e) => {
                        e.preventDefault()
                        guardar(c)
                      }}
                    >
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={value}
                        aria-label={`Nota de ${c.nombre_curso}`}
                        onChange={(e) => setInputs((s) => ({ ...s, [c.id_curso]: e.target.value }))}
                        className={value === '' ? '' : Number(value) >= notaMinima ? 'ok' : 'bad'}
                      />
                      <button className="btn-primary btn-sm" disabled={saving === c.id_curso || value === '' || !changed}>
                        {saving === c.id_curso ? '…' : 'Guardar'}
                      </button>
                    </form>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default function AdminNotas() {
  const [params, setParams] = useSearchParams()
  const [alumnos, setAlumnos] = useState(null)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const selectedCode = params.get('alumno') || ''

  const load = useCallback(() => {
    setError(null)
    adminApi
      .alumnos()
      .then((r) => setAlumnos(r.alumnos || []))
      .catch(setError)
  }, [])
  useEffect(load, [load])

  const alumno = alumnos?.find((a) => a.cod_alumno === selectedCode)
  const opciones = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (alumnos || []).filter((a) => !term || `${a.cod_alumno} ${a.nombres} ${a.apellidos}`.toLowerCase().includes(term))
  }, [alumnos, q])

  if (error) return <ErrorState error={error} retry={load} />
  if (!alumnos) return <Loading />

  return (
    <section className="page-stack">
      <div className="section-title">
        <div>
          <p className="eyebrow">Administración</p>
          <h2>Calificaciones</h2>
        </div>
      </div>

      <article className="panel-card">
        <div className="toolbar wrap">
          <input className="search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Filtrar alumnos" />
          <select
            className="select-input"
            value={selectedCode}
            onChange={(e) => setParams(e.target.value ? { alumno: e.target.value } : {})}
          >
            <option value="">— Selecciona un alumno ({opciones.length}) —</option>
            {opciones.map((a) => (
              <option key={a.cod_alumno} value={a.cod_alumno}>
                {a.cod_alumno} · {a.apellidos}, {a.nombres}
              </option>
            ))}
          </select>
        </div>
        {alumno && (
          <div className="student-strip">
            <strong>
              {alumno.apellidos}, {alumno.nombres}
            </strong>
            <span>Código {alumno.cod_alumno}</span>
            <span>{planPorId(alumno.id_plan).nombre}</span>
            <span className={`pill ${alumno.estado === 'activo' ? 'pill-ok' : 'pill-muted'}`}>{alumno.estado}</span>
          </div>
        )}
      </article>

      {alumno ? (
        <article className="panel-card">
          <PanelNotas alumno={alumno} />
        </article>
      ) : (
        <p className="empty-note">Selecciona un alumno para ver y registrar sus notas.</p>
      )}
    </section>
  )
}
