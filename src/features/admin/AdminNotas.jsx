import { Info, Save, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adminApi, matriculaApi } from '../../api/client'
import { ErrorState, Loading } from '../../components/AsyncState'
import { formatoNota, planPorId, redondear, romano } from '../../utils/academico'

const ESTADOS = {
  aprobado: ['Aprobado', 'pill-ok'],
  desaprobado: ['Desaprobado', 'pill-bad'],
  en_curso: ['En curso', 'pill-info'],
  disponible: ['Disponible', 'pill-muted'],
  bloqueado_por_prerrequisito: ['Bloqueado', 'pill-lock'],
}
const CAMPOS = ['n1', 'n2', 'n3', 'sustitutorio', 'aplazado']
const ETIQUETA = { n1: 'N1', n2: 'N2', n3: 'N3', sustitutorio: 'Su', aplazado: 'Ap' }

/** Misma regla que el servidor: media de N1-N3 (Su reemplaza a la menor), Ap manda si existe; redondeo desde .5 */
function previsualizar(v) {
  const num = (x) => (x === '' || x === null || x === undefined ? null : Number(x))
  const parciales = ['n1', 'n2', 'n3'].map((k) => num(v[k])).filter((x) => x !== null && !Number.isNaN(x))
  const su = num(v.sustitutorio)
  const ap = num(v.aplazado)
  let promedio = null
  if (parciales.length) {
    const vals = [...parciales]
    if (su !== null) {
      const i = vals.indexOf(Math.min(...vals))
      if (su > vals[i]) vals[i] = su
    }
    promedio = redondear(vals.reduce((a, b) => a + b, 0) / vals.length)
  }
  const final = ap !== null ? redondear(ap) : promedio !== null ? promedio : num(v.nota) !== null ? redondear(num(v.nota)) : null
  return { promedio, final }
}

function PanelNotas({ alumno }) {
  const [cursos, setCursos] = useState(null)
  const [notaMinima, setNotaMinima] = useState(11)
  const [error, setError] = useState(null)
  const [valores, setValores] = useState({})
  const [modo, setModo] = useState({}) // id_curso -> 'parciales' | 'directa'
  const [saving, setSaving] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [ciclo, setCiclo] = useState('todos')
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    setError(null)
    try {
      const [malla, hist] = await Promise.all([matriculaApi.malla(alumno.cod_alumno), matriculaApi.historial(alumno.cod_alumno)])
      const porCurso = {}
      for (const h of hist.historial || []) {
        if (h.estado !== 'matriculado') continue
        const prev = porCurso[h.curso.id_curso]
        const mejor = !prev || (h.nota_final === null && prev.nota_final !== null) || (h.estado_academico === 'aprobado' && prev.estado_academico !== 'aprobado')
        if (mejor) porCurso[h.curso.id_curso] = h
      }
      const list = (malla.cursos || []).map((c) => ({ ...c, registro: porCurso[c.id_curso] || null }))
      setCursos(list)
      setNotaMinima(malla.nota_minima ?? 11)
      setValores(
        Object.fromEntries(
          list.map((c) => [
            c.id_curso,
            Object.fromEntries([...CAMPOS, 'nota'].map((k) => [k, c.registro?.[k === 'nota' ? 'nota_final' : k] ?? ''])),
          ]),
        ),
      )
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
    const v = valores[curso.id_curso] || {}
    const directa = (modo[curso.id_curso] || 'parciales') === 'directa'
    const payload = directa ? { nota: v.nota } : Object.fromEntries(CAMPOS.map((k) => [k, v[k] === '' ? null : Number(v[k])]))
    const fuera = Object.values(payload).some((x) => x !== null && x !== '' && (Number(x) < 0 || Number(x) > 20))
    if (fuera) return setFeedback({ ok: false, text: 'Las notas deben estar entre 0 y 20.' })
    setSaving(curso.id_curso)
    setFeedback(null)
    try {
      const res = await adminApi.calificar(alumno.cod_alumno, curso.cod_curso, payload)
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
  const set = (id, k, val) => setValores((s) => ({ ...s, [id]: { ...s[id], [k]: val } }))

  return (
    <>
      <div className="stat-grid">
        <div className="stat">
          <b>{aprobados.length}</b>
          <span>Cursos aprobados de {cursos.length}</span>
        </div>
        <div className="stat">
          <b>{aprobados.reduce((s, c) => s + Number(c.creditos || 0), 0)}</b>
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
        <Info size={15} /> Registra N1, N2 y N3: el promedio se redondea al entero (desde x.5 sube: 10.5 = 11; 10.4 = 10). El
        sustitutorio (Su) reemplaza a la nota más baja si es mayor y el aplazado (Ap), si existe, es la nota final. Aprueba con {notaMinima}.
      </p>
      {feedback && <p className={feedback.ok ? 'form-success' : 'form-error'}>{feedback.text}</p>}

      <div className="toolbar wrap">
        <div className="search-wrap">
          <Search size={16} />
          <input className="search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar curso" />
        </div>
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
        <table className="data-table grades-editor">
          <thead>
            <tr>
              <th>Ciclo</th>
              <th>Asignatura</th>
              <th>Estado</th>
              <th>Registro de notas</th>
              <th>Final</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtrados.map((c) => {
              const [label, cls] = ESTADOS[c.estado] || [c.estado, 'pill-muted']
              const v = valores[c.id_curso] || {}
              const m = modo[c.id_curso] || 'parciales'
              const prev = previsualizar(m === 'directa' ? { nota: v.nota } : v)
              return (
                <tr key={c.id_curso}>
                  <td>{romano(c.ciclo)}</td>
                  <td>
                    <strong>{c.nombre_curso}</strong>
                    <div className="small muted">
                      {c.codigo_curso} · {c.creditos} cr.
                      {c.registro?.periodo && ` · ${c.registro.periodo.cod_per_acad} secc. ${c.registro.seccion}`}
                    </div>
                  </td>
                  <td>
                    <span className={`pill ${cls}`}>{label}</span>
                  </td>
                  <td>
                    <div className="grade-inputs">
                      <select
                        value={m}
                        onChange={(e) => setModo((s) => ({ ...s, [c.id_curso]: e.target.value }))}
                        aria-label="Tipo de registro"
                      >
                        <option value="parciales">N1-N3</option>
                        <option value="directa">Nota final</option>
                      </select>
                      {m === 'directa' ? (
                        <label>
                          <span>Nota</span>
                          <input type="number" min="0" max="20" step="0.1" value={v.nota ?? ''} onChange={(e) => set(c.id_curso, 'nota', e.target.value)} />
                        </label>
                      ) : (
                        CAMPOS.map((k) => (
                          <label key={k} className={k === 'sustitutorio' || k === 'aplazado' ? 'opt' : ''}>
                            <span>{ETIQUETA[k]}</span>
                            <input type="number" min="0" max="20" step="0.1" value={v[k] ?? ''} onChange={(e) => set(c.id_curso, k, e.target.value)} />
                          </label>
                        ))
                      )}
                    </div>
                  </td>
                  <td>
                    {prev.final !== null ? (
                      <span className={`grade-badge ${prev.final >= notaMinima ? 'ok' : 'bad'}`}>{formatoNota(prev.final)}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="right">
                    <button type="button" className="btn-primary btn-sm" disabled={saving === c.id_curso || prev.final === null} onClick={() => guardar(c)}>
                      <Save size={14} /> {saving === c.id_curso ? '…' : 'Guardar'}
                    </button>
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
      <div className="page-hero">
        <div>
          <p className="eyebrow">Administración</p>
          <h1>Calificaciones</h1>
        </div>
      </div>

      <article className="panel-card">
        <div className="toolbar wrap">
          <div className="search-wrap">
            <Search size={16} />
            <input className="search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar alumnos" />
          </div>
          <select className="select-input" value={selectedCode} onChange={(e) => setParams(e.target.value ? { alumno: e.target.value } : {})}>
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
