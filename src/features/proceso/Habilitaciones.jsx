import { AlertTriangle, BookOpen, GraduationCap, Lock, Save, Search, Undo2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { habilitacionesApi } from '../../api/client'
import { ErrorState, Loading } from '../../components/AsyncState'
import { Mensaje } from '../../components/Aviso'
import { romano } from '../../utils/academico'

const sinTildes = (t) =>
  String(t || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

function PorDocente({ data, puedeEditar, onGuardado }) {
  const [q, setQ] = useState('')
  const [qCurso, setQCurso] = useState('')
  const [idSel, setIdSel] = useState(data.docentes[0]?.id_admin ?? null)
  const sel = data.docentes.find((d) => d.id_admin === idSel)
  const [marcados, setMarcados] = useState(new Set(sel?.cursos || []))
  const [msg, setMsg] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setMarcados(new Set(sel?.cursos || []))
    setMsg(null)
  }, [sel])

  const docentes = data.docentes.filter((d) => !q.trim() || sinTildes(d.nombre_docente).includes(sinTildes(q.trim())))
  const cursos = data.cursos.filter((c) => !qCurso.trim() || sinTildes(`${c.nombre_curso} ${c.codigo_curso}`).includes(sinTildes(qCurso.trim())))
  const porCiclo = useMemo(() => {
    const m = new Map()
    cursos.forEach((c) => m.set(c.ciclo, [...(m.get(c.ciclo) || []), c]))
    return [...m.entries()]
  }, [cursos])
  const original = new Set(sel?.cursos || [])
  const cambios = [...marcados].filter((c) => !original.has(c)).length + [...original].filter((c) => !marcados.has(c)).length
  const enUso = sel?.en_uso || {}

  const alternar = (cod) => {
    if (!puedeEditar || enUso[cod]) return
    setMarcados((prev) => {
      const n = new Set(prev)
      if (n.has(cod)) n.delete(cod)
      else n.add(cod)
      return n
    })
  }
  const guardar = async () => {
    setSaving(true)
    setMsg(null)
    try {
      const res = await habilitacionesApi.guardar(sel.id_admin, [...marcados])
      setMsg({ ok: true, text: res.message })
      onGuardado(res.docente)
    } catch (err) {
      setMsg({ ok: false, text: err.detail })
    } finally {
      setSaving(false)
    }
  }
  const cambiarDocente = (id) => {
    if (cambios && !window.confirm('Tienes cambios sin guardar en este docente. ¿Descartarlos?')) return
    setIdSel(id)
  }

  return (
    <div className="habil-layout">
      <aside className="panel-card habil-docentes">
        <div className="search-wrap">
          <Search size={16} />
          <input className="search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar docente" />
        </div>
        <ul>
          {docentes.map((d) => (
            <li key={d.id_admin}>
              <button type="button" className={d.id_admin === idSel ? 'activo' : ''} onClick={() => cambiarDocente(d.id_admin)}>
                <span>{d.nombre_docente}</span>
                <span className={`pill ${d.cursos.length ? 'pill-ok' : 'pill-warn'}`}>{d.cursos.length}</span>
              </button>
            </li>
          ))}
          {docentes.length === 0 && <li className="muted small habil-vacio">Sin resultados.</li>}
        </ul>
      </aside>

      {sel ? (
        <section className="panel-card habil-cursos">
          <header className="habil-cab">
            <div>
              <h2>{sel.nombre_docente}</h2>
              <p className="muted small">
                {marcados.size} {marcados.size === 1 ? 'curso habilitado' : 'cursos habilitados'} · {sel.email}
              </p>
            </div>
            {puedeEditar && (
              <div className="habil-botones">
                <button type="button" className="btn-secondary btn-sm" disabled={!cambios || saving} onClick={() => setMarcados(new Set(sel.cursos))}>
                  <Undo2 size={14} /> Descartar
                </button>
                <button type="button" className="btn-primary btn-sm" disabled={!cambios || saving} onClick={guardar}>
                  <Save size={14} /> {saving ? 'Guardando…' : `Guardar${cambios ? ` (${cambios})` : ''}`}
                </button>
              </div>
            )}
          </header>
          <Mensaje msg={msg} className="alert-box-error" />
          {!puedeEditar && <p className="info-strip">Solo el Jefe de Departamento y el Director de Escuela modifican las habilitaciones.</p>}
          <div className="search-wrap habil-buscar-curso">
            <Search size={16} />
            <input className="search-input" value={qCurso} onChange={(e) => setQCurso(e.target.value)} placeholder="Buscar curso o código" />
          </div>
          {porCiclo.map(([ciclo, lista]) => (
            <fieldset key={ciclo} className="habil-ciclo">
              <legend>
                Ciclo {romano(ciclo)} <small>({lista.filter((c) => marcados.has(c.cod_curso)).length}/{lista.length})</small>
              </legend>
              {lista.map((c) => {
                const uso = enUso[c.cod_curso]
                return (
                  <label key={c.cod_curso} className={`habil-curso ${marcados.has(c.cod_curso) ? 'on' : ''} ${uso ? 'bloqueado' : ''}`} title={uso ? `Lo dicta en ${uso.join(', ')}: no se puede quitar mientras tenga esas secciones.` : ''}>
                    <input type="checkbox" checked={marcados.has(c.cod_curso)} disabled={!puedeEditar || Boolean(uso)} onChange={() => alternar(c.cod_curso)} />
                    <span>
                      {c.nombre_curso}
                      <small>
                        {c.codigo_curso}
                        {c.mencion_electiva ? ' · Electivo' : ''}
                        {uso && (
                          <>
                            {' '}
                            · <Lock size={11} /> dicta en {uso.join(', ')}
                          </>
                        )}
                      </small>
                    </span>
                  </label>
                )
              })}
            </fieldset>
          ))}
          {porCiclo.length === 0 && <p className="muted small">Ningún curso coincide con «{qCurso}».</p>}
        </section>
      ) : (
        <section className="panel-card">
          <p className="muted">No hay docentes activos.</p>
        </section>
      )}
    </div>
  )
}

function PorCurso({ data }) {
  const [q, setQ] = useState('')
  const [soloSin, setSoloSin] = useState(false)
  const porCurso = useMemo(() => {
    const m = new Map(data.cursos.map((c) => [c.cod_curso, []]))
    data.docentes.forEach((d) => d.cursos.forEach((c) => m.get(c)?.push(d.nombre_docente)))
    return m
  }, [data])
  const filas = data.cursos
    .filter((c) => !q.trim() || sinTildes(`${c.nombre_curso} ${c.codigo_curso}`).includes(sinTildes(q.trim())))
    .filter((c) => !soloSin || porCurso.get(c.cod_curso).length === 0)
  const sinDocente = data.cursos.filter((c) => porCurso.get(c.cod_curso).length === 0).length
  return (
    <section className="panel-card">
      <div className="toolbar wrap">
        <div className="search-wrap">
          <Search size={16} />
          <input className="search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar curso o código" />
        </div>
        <label className="check-inline">
          <input type="checkbox" checked={soloSin} onChange={(e) => setSoloSin(e.target.checked)} /> Solo cursos sin docentes habilitados ({sinDocente})
        </label>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Curso</th>
              <th>Ciclo</th>
              <th>Docentes habilitados</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((c) => {
              const nombres = porCurso.get(c.cod_curso)
              return (
                <tr key={c.cod_curso}>
                  <td>
                    <strong>{c.nombre_curso}</strong>
                    <small className="muted block">
                      {c.codigo_curso}
                      {c.mencion_electiva ? ' · Electivo' : ''}
                    </small>
                  </td>
                  <td>{romano(c.ciclo)}</td>
                  <td className="small">
                    {nombres.length ? (
                      nombres.join(' · ')
                    ) : (
                      <span className="text-warn">
                        <AlertTriangle size={13} /> Ninguno: no se le podrá asignar docente
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/** Qué cursos puede dictar cada docente. Solo los habilitados aparecen al asignar docentes a una sección. */
export default function Habilitaciones() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [vista, setVista] = useState('docente')

  const cargar = () => {
    setError(null)
    habilitacionesApi
      .listar()
      .then(setData)
      .catch(setError)
  }
  useEffect(cargar, [])

  if (error) return <ErrorState error={error} retry={cargar} />
  if (!data) return <Loading />

  const total = data.docentes.reduce((a, d) => a + d.cursos.length, 0)
  return (
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <p className="eyebrow">Escuela de Ingeniería de Sistemas · Plan 2019</p>
          <h1>Docentes habilitados</h1>
          <p className="muted">Define qué cursos puede dictar cada docente. Al asignar docentes a una sección solo aparecen los habilitados para ese curso.</p>
        </div>
        <div className="hero-stats">
          <span>
            <b>{data.docentes.length}</b> docentes
          </span>
          <span>
            <b>{total}</b> habilitaciones
          </span>
        </div>
      </div>
      <div className="chips">
        <button type="button" className={`chip ${vista === 'docente' ? 'active' : ''}`} onClick={() => setVista('docente')}>
          <GraduationCap size={14} /> Por docente
        </button>
        <button type="button" className={`chip ${vista === 'curso' ? 'active' : ''}`} onClick={() => setVista('curso')}>
          <BookOpen size={14} /> Por curso
        </button>
      </div>
      {vista === 'docente' ? (
        <PorDocente
          data={data}
          puedeEditar={data.puede_editar}
          onGuardado={(doc) => setData((d) => ({ ...d, docentes: d.docentes.map((x) => (x.id_admin === doc.id_admin ? doc : x)) }))}
        />
      ) : (
        <PorCurso data={data} />
      )}
    </section>
  )
}
