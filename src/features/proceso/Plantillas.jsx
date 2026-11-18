import { AlertTriangle, CheckCircle2, Eye, LayoutTemplate, Save, Trash2, Wand2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { plantillasApi } from '../../api/client'
import Modal from '../../components/Modal'
import { horarioCorto, romano, TURNOS } from '../../utils/academico'

// Qué parte de la plantilla aplica cada rol y en qué fases
const APLICA = {
  jefe: { fases: [1], que: 'horarios', boton: 'Aplicar horarios' },
  director: { fases: [2, 3, 4, 5, 6], que: 'docentes', boton: 'Aplicar docentes' },
  asistente: { fases: [3], que: 'aulas', boton: 'Aplicar aulas' }
}
const AYUDA = {
  jefe: 'Crea en un clic las secciones, turnos y horas de un semestre anterior y luego ajusta solo lo que cambió.',
  director: 'Asigna a cada sección el docente que tenía en la plantilla, solo si está habilitado para el curso y no tiene cruces.',
  asistente: 'Asigna a cada sesión el aula que tenía en la plantilla, solo si está libre a esa hora.'
}
const fecha = (iso) => new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })

function GuardarModal({ periodo, onClose, onSaved }) {
  const [nombre, setNombre] = useState(`Programación ${periodo.cod_per_acad}`)
  const [descripcion, setDescripcion] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const guardar = async () => {
    setSaving(true)
    setError('')
    try {
      onSaved(await plantillasApi.guardar(periodo.id_periodo, nombre, descripcion))
    } catch (err) {
      setError(err.detail)
      setSaving(false)
    }
  }
  return (
    <Modal
      title="Guardar como plantilla"
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={guardar} disabled={saving || nombre.trim().length < 3}>
            <Save size={15} /> {saving ? 'Guardando…' : 'Guardar plantilla'}
          </button>
        </>
      }
    >
      <div className="form-grid one">
        <p className="muted small">
          Se guarda toda la programación de {periodo.cod_per_acad} tal como está ahora: secciones, turnos, días y horas, aulas y docentes. Servirá para los
          próximos períodos {periodo.cod_per_acad.endsWith('-1') ? 'impares (-1)' : 'pares (-2)'}.
        </p>
        <label className="field">
          Nombre
          <input value={nombre} maxLength={120} onChange={(e) => setNombre(e.target.value)} autoFocus />
        </label>
        <label className="field">
          Descripción (opcional)
          <textarea rows={2} maxLength={300} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej.: versión con más secciones en la noche" />
        </label>
        {error && <p className="form-error">{error}</p>}
      </div>
    </Modal>
  )
}

function VerModal({ id, onClose }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [ciclo, setCiclo] = useState('todos')
  useEffect(() => {
    plantillasApi
      .ver(id)
      .then((r) => setData(r.plantilla))
      .catch((err) => setError(err.detail))
  }, [id])
  const ciclos = data ? [...new Set(data.detalle.map((s) => s.ciclo))] : []
  const filas = data ? data.detalle.filter((s) => ciclo === 'todos' || s.ciclo === ciclo) : []
  return (
    <Modal title={data ? data.nombre : 'Plantilla'} size="lg" onClose={onClose}>
      {error && <p className="form-error">{error}</p>}
      {!data && !error && <p className="muted">Cargando…</p>}
      {data && (
        <>
          <p className="muted small plantilla-meta">
            {data.descripcion && <>{data.descripcion} · </>}
            {data.secciones} secciones de {data.cursos} cursos · {data.con_docente} con docente · {data.con_aula} con aula
            {data.origen && <> · tomada de {data.origen}</>}
          </p>
          <div className="chips plantilla-chips">
            <button type="button" className={`chip ${ciclo === 'todos' ? 'active' : ''}`} onClick={() => setCiclo('todos')}>
              Todos
            </button>
            {ciclos.map((n) => (
              <button key={n} type="button" className={`chip ${ciclo === n ? 'active' : ''}`} onClick={() => setCiclo(n)}>
                Ciclo {romano(n)}
              </button>
            ))}
          </div>
          <div className="table-scroll">
            <table className="data-table plantilla-tabla">
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Secc.</th>
                  <th>Turno</th>
                  <th>Horario</th>
                  <th>Aula</th>
                  <th>Docente</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((s) => (
                  <tr key={`${s.cod_curso}-${s.cod_seccion}`}>
                    <td>
                      <strong>{s.curso}</strong>
                      <small className="muted block">
                        {s.codigo_curso} · Ciclo {romano(s.ciclo)}
                      </small>
                    </td>
                    <td>
                      <span className="sec-letter">{s.cod_seccion}</span>
                    </td>
                    <td>{TURNOS[s.turno]}</td>
                    <td className="small">{horarioCorto(s)}</td>
                    <td className="small">{[...new Set(s.sesiones.map((x) => x.aula || '—'))].join(' · ')}</td>
                    <td className="small">
                      {s.docente ? (
                        <>
                          {s.docente}
                          {!s.docente_habilitado && (
                            <span className="sec-warn">
                              <AlertTriangle size={12} /> No habilitado para este curso
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="muted">Por asignar</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  )
}

function AplicarModal({ rol, fase, periodo, plantilla, haySecciones, onClose, onApplied }) {
  const [reemplazar, setReemplazar] = useState(false)
  const [sobrescribir, setSobrescribir] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const conf = APLICA[rol]

  const aplicar = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await plantillasApi.aplicar(periodo.id_periodo, plantilla.id, rol === 'jefe' ? { reemplazar } : { sobrescribir })
      setResultado(res)
      onApplied(res)
    } catch (err) {
      setError(err.detail)
    } finally {
      setSaving(false)
    }
  }

  const explicacion = {
    jefe: `Se crearán en ${periodo.cod_per_acad} las secciones de «${plantilla.nombre}» con sus turnos, días y horas. Los docentes y las aulas los asignan después el Director y el Asistente.`,
    director: `Cada sección de ${periodo.cod_per_acad} recibirá el docente que tenía en «${plantilla.nombre}» (misma asignatura y sección). Se omiten los docentes que no están habilitados para el curso o que tendrían un cruce.`,
    asistente: `Cada sesión de clase recibirá el aula que tenía en «${plantilla.nombre}» a la misma hora. Se omiten las aulas ocupadas.`
  }[rol]

  if (resultado) {
    const ajustadas = resultado.omitidas.filter((o) => o.ajustada)
    const omitidas = resultado.omitidas.filter((o) => !o.ajustada)
    return (
      <Modal
        title="Plantilla aplicada"
        onClose={onClose}
        footer={
          <button type="button" className="btn-primary" onClick={onClose}>
            Entendido
          </button>
        }
      >
        <p className="plantilla-resultado-ok">
          <CheckCircle2 size={18} /> {resultado.message}
        </p>
        {ajustadas.length > 0 && (
          <details className="plantilla-omitidas" open={omitidas.length === 0}>
            <summary>{ajustadas.length} creadas con un ajuste</summary>
            <ul>
              {ajustadas.map((o, i) => (
                <li key={i}>
                  <b>{o.seccion}</b>: {o.motivo}
                </li>
              ))}
            </ul>
          </details>
        )}
        {omitidas.length > 0 && (
          <details className="plantilla-omitidas warn" open>
            <summary>
              {omitidas.length} no se aplicaron{rol === 'jefe' ? ' (créalas o ajústalas a mano)' : ''}
            </summary>
            <ul>
              {omitidas.map((o, i) => (
                <li key={i}>
                  <b>{o.seccion}</b>: {o.motivo}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Modal>
    )
  }

  return (
    <Modal
      title={`${conf.boton} · ${plantilla.nombre}`}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={aplicar} disabled={saving}>
            <Wand2 size={15} /> {saving ? 'Aplicando…' : conf.boton}
          </button>
        </>
      }
    >
      <div className="form-grid one">
        <p>{explicacion}</p>
        {rol === 'jefe' && haySecciones && (
          <div className="opciones-aplicar">
            <label className="check-inline">
              <input type="radio" name="modo" checked={!reemplazar} onChange={() => setReemplazar(false)} /> Agregar solo las secciones que faltan
            </label>
            <label className="check-inline">
              <input type="radio" name="modo" checked={reemplazar} onChange={() => setReemplazar(true)} /> Reemplazar toda la programación actual
            </label>
            {reemplazar && (
              <p className="form-error small">
                <AlertTriangle size={14} /> Se eliminarán las secciones que ya creaste en este período.
              </p>
            )}
          </div>
        )}
        {rol === 'director' && fase === 2 && (
          <label className="check-inline">
            <input type="checkbox" checked={sobrescribir} onChange={(e) => setSobrescribir(e.target.checked)} /> Reemplazar también los docentes que ya asignaste
          </label>
        )}
        {rol === 'director' && fase > 2 && <p className="muted small">En esta fase solo se completan las secciones que siguen con «Docente por asignar».</p>}
        {rol === 'asistente' && (
          <label className="check-inline">
            <input type="checkbox" checked={sobrescribir} onChange={(e) => setSobrescribir(e.target.checked)} /> Reemplazar también las aulas que ya asignaste
          </label>
        )}
        {error && <p className="form-error">{error}</p>}
      </div>
    </Modal>
  )
}

/** Panel de plantillas de la pantalla de programación. */
export default function PlantillasPanel({ user, proceso, onApplied }) {
  const rol = user.rol
  const periodo = proceso.periodo
  const fase = proceso.fase
  const haySecciones = proceso.conteo.secciones > 0
  const puedeAplicar = Boolean(APLICA[rol]?.fases.includes(fase))
  const [lista, setLista] = useState(null)
  const [error, setError] = useState('')
  const [todas, setTodas] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [viendo, setViendo] = useState(null)
  const [aplicando, setAplicando] = useState(null)
  const [abierto, setAbierto] = useState(puedeAplicar && (rol !== 'jefe' || !haySecciones))

  const cargar = useCallback(() => {
    plantillasApi
      .listar(periodo.id_periodo)
      .then((r) => setLista(r.plantillas))
      .catch((err) => setError(err.detail))
  }, [periodo.id_periodo])
  useEffect(cargar, [cargar])

  const visibles = useMemo(() => (lista || []).filter((p) => todas || p.compatible), [lista, todas])
  const incompatibles = (lista || []).filter((p) => !p.compatible).length

  const eliminar = async (p) => {
    if (!window.confirm(`¿Eliminar la plantilla «${p.nombre}»? No afecta a ningún período.`)) return
    try {
      await plantillasApi.eliminar(p.id)
      cargar()
    } catch (err) {
      setError(err.detail)
    }
  }
  const puedeBorrar = (p) => rol === 'jefe' || rol === 'admin' || p.id_autor === user.id_admin

  return (
    <>
    <details className="panel-card plantillas-panel" open={abierto} onToggle={(e) => setAbierto(e.currentTarget.open)}>
      <summary>
        <LayoutTemplate size={18} />
        <span>
          <strong>Plantillas de horario</strong>
          <small>{puedeAplicar ? AYUDA[rol] : 'Guarda la programación de este período para reutilizarla en los siguientes.'}</small>
        </span>
        {lista && <span className="pill pill-muted">{visibles.length}</span>}
      </summary>

      <div className="plantillas-cuerpo">
        <div className="plantillas-barra">
          {incompatibles > 0 && (
            <label className="check-inline">
              <input type="checkbox" checked={todas} onChange={(e) => setTodas(e.target.checked)} /> Ver también las de {periodo.cod_per_acad.endsWith('-1') ? 'semestres pares' : 'semestres impares'} ({incompatibles})
            </label>
          )}
          {haySecciones && rol !== 'docente' && (
            <button type="button" className="btn-outline" onClick={() => setGuardando(true)}>
              <Save size={15} /> Guardar {periodo.cod_per_acad} como plantilla
            </button>
          )}
        </div>
        {error && <p className="form-error">{error}</p>}
        {lista && visibles.length === 0 && (
          <p className="muted small">
            Aún no hay plantillas para {periodo.cod_per_acad.endsWith('-1') ? 'semestres impares (-1)' : 'semestres pares (-2)'}. Cuando termines la programación,
            guárdala como plantilla para el próximo año.
          </p>
        )}
        <ul className="plantillas-lista">
          {visibles.map((p) => (
            <li key={p.id} className={p.compatible ? '' : 'incompatible'}>
              <div className="plantilla-info">
                <strong>{p.nombre}</strong>
                <small>
                  {p.secciones} secciones · {p.con_docente} con docente · {p.con_aula} con aula
                  {p.origen && ` · de ${p.origen}`}
                  {p.autor ? ` · ${p.autor}` : ''} · {fecha(p.creado_en)}
                </small>
                {!p.compatible && <small className="text-warn">Es de otro tipo de semestre: no se puede aplicar a {periodo.cod_per_acad}.</small>}
              </div>
              <div className="plantilla-acciones">
                <button type="button" className="btn-secondary btn-sm" onClick={() => setViendo(p.id)}>
                  <Eye size={14} /> Ver
                </button>
                {puedeAplicar && p.compatible && (
                  <button type="button" className="btn-primary btn-sm" onClick={() => setAplicando(p)}>
                    <Wand2 size={14} /> {APLICA[rol].boton}
                  </button>
                )}
                {puedeBorrar(p) && (
                  <button type="button" className="icon-btn" onClick={() => eliminar(p)} aria-label={`Eliminar ${p.nombre}`}>
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </details>

      {guardando && (
        <GuardarModal
          periodo={periodo}
          onClose={() => setGuardando(false)}
          onSaved={() => {
            setGuardando(false)
            cargar()
          }}
        />
      )}
      {viendo && <VerModal id={viendo} onClose={() => setViendo(null)} />}
      {aplicando && (
        <AplicarModal
          rol={rol}
          fase={fase}
          periodo={periodo}
          plantilla={aplicando}
          haySecciones={haySecciones}
          onClose={() => setAplicando(null)}
          onApplied={onApplied}
        />
      )}
    </>
  )
}
