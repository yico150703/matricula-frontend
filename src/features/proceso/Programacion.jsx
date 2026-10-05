import {
  AlertTriangle,
  ArrowLeftCircle,
  CheckCircle2,
  Copy,
  Filter,
  Lock,
  MessageSquareWarning,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  Wrench
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { procesoApi } from '../../api/client'
import { ErrorState, Loading } from '../../components/AsyncState'
import Modal from '../../components/Modal'
import { colorCurso, horarioCorto, romano, TURNOS } from '../../utils/academico'
import { ajustarAlTurno, AulaSelect, DocenteCombo, bloquesDe, horasPlan, RANGO_TURNO, sesionesPorPlan, SesionesEditor, sesionesIniciales, SolicitudModal } from './editores'
import { useProceso } from './ProcesoContext'
import { Mensaje } from '../../components/Aviso'

const TITULOS = {
  jefe: ['Programación de horarios', 'Crea las secciones de cada curso: turno, días y horas.'],
  director: ['Asignación de docentes', 'Elige al docente de cada sección y confirma la programación.'],
  asistente: ['Asignación de aulas', 'Asigna pabellón, aula o laboratorio a cada sección.'],
  admin: ['Proceso de horarios', 'Seguimiento de la programación del período: horarios, docentes y aulas.']
}
const FASE_EDICION = { jefe: 1, director: 2, asistente: 3 }
const SUBTITULO_LECTURA = 'Consulta la programación del período. Para cambiar algo usa “Solicitar cambio”; el otro rol lo revisará.'
// Cursos regulares: secciones A, B y C. Electivos: una sola sección, la E (un solo horario)
const LETRAS = ['A', 'B', 'C']
const letrasDe = (curso) => (curso?.mencion_electiva ? ['E'] : LETRAS)
const ESTADO_DOCENTE = {
  pendiente: ['Por confirmar', 'pill-warn'],
  confirmado: ['Confirmado', 'pill-ok'],
  observado: ['Observado', 'pill-bad']
}

function SeccionModal({ idPeriodo, curso, seccion, onClose, onSaved }) {
  const usadas = curso.secciones.map((s) => s.cod_seccion)
  const [letra, setLetra] = useState(seccion?.cod_seccion || letrasDe(curso).find((l) => !usadas.includes(l)) || letrasDe(curso)[0])
  const [turno, setTurno] = useState(seccion?.turno || 'M')
  const [cupo, setCupo] = useState(seccion?.cupo_maximo || 30)
  const [sesiones, setSesiones] = useState(seccion ? sesionesIniciales(seccion) : sesionesPorPlan(horasPlan(curso), seccion?.turno || 'M'))
  const cambiarTurno = (t) => {
    setTurno(t)
    setSesiones((prev) => ajustarAlTurno(prev, t))
  }
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const guardar = async () => {
    setSaving(true)
    setError('')
    try {
      const payload = { turno, cupo: Number(cupo), sesiones }
      const res = seccion
        ? await procesoApi.editarSeccion(seccion.id_seccion, payload)
        : await procesoApi.crearSeccion(idPeriodo, {
            ...payload,
            cod_curso: curso.cod_curso,
            cod_seccion: letra
          })
      onSaved(res.seccion)
    } catch (err) {
      setError(err.detail)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`${seccion ? 'Editar' : 'Nueva'} sección · ${curso.nombre_curso}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={guardar} disabled={saving || bloquesDe(sesiones) < horasPlan(curso)}>
            {saving ? 'Guardando…' : 'Guardar sección'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <label className="field">
          Sección
          <select value={letra} onChange={(e) => setLetra(e.target.value)} disabled={Boolean(seccion)}>
            {letrasDe(curso).map((l) => (
              <option key={l} value={l} disabled={!seccion && usadas.includes(l)}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Turno
          <select value={turno} onChange={(e) => cambiarTurno(e.target.value)}>
            {Object.entries(TURNOS).map(([k, v]) => (
              <option key={k} value={k}>
                {v} ({RANGO_TURNO[k][0]} a {RANGO_TURNO[k][1]})
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Capacidad
          <input type="number" min="5" max="80" value={cupo} onChange={(e) => setCupo(e.target.value)} />
        </label>
        <div className="field full">
          Días y horas de clase
          <SesionesEditor value={sesiones} onChange={setSesiones} horas={horasPlan(curso)} turno={turno} />
          <p className="plan-nota">
            {curso.nombre_curso}: {curso.ht} h teoría, {curso.hp} h práctica por semana.
          </p>
        </div>
        {error && <p className="form-error full">{error}</p>}
      </div>
    </Modal>
  )
}

function AccionModal({ titulo, texto, pedirMotivo, confirmar, onClose, onConfirm }) {
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const ok = async () => {
    setSaving(true)
    setError('')
    try {
      await onConfirm(motivo)
    } catch (err) {
      setError(err.detail)
      setSaving(false)
    }
  }
  return (
    <Modal
      title={titulo}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={ok} disabled={saving || (pedirMotivo && motivo.trim().length < 5)}>
            {saving ? 'Procesando…' : confirmar}
          </button>
        </>
      }
    >
      <p>{texto}</p>
      {pedirMotivo && (
        <label className="field">
          Motivo
          <textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Qué debe corregir el jefe de departamento" />
        </label>
      )}
      {error && <p className="form-error">{error}</p>}
    </Modal>
  )
}

export default function Programacion({ user }) {
  const rol = user.rol
  const { proceso, procesos, periodoId, aulas, recargar } = useProceso()
  const [data, setData] = useState(null)
  const [docentes, setDocentes] = useState([])
  const [error, setError] = useState(null)
  const [ciclo, setCiclo] = useState('todos')
  const [q, setQ] = useState('')
  const [soloPend, setSoloPend] = useState(false)
  const [msg, setMsg] = useState(null)
  const [editando, setEditando] = useState(null) // { curso, seccion? }
  const [solicitando, setSolicitando] = useState(null)
  const [accion, setAccion] = useState(null)
  const [origen, setOrigen] = useState('')
  const [busy, setBusy] = useState(null)
  const [errAula, setErrAula] = useState({}) // { id_seccion: mensaje } se queda visible junto a la sección

  const cargar = useCallback(async () => {
    if (!periodoId) return
    setError(null)
    try {
      const [det, docs] = await Promise.all([
        procesoApi.detalle(periodoId),
        rol === 'director' || rol === 'jefe' ? procesoApi.docentes(periodoId) : Promise.resolve({ docentes: [] })
      ])
      setData(det)
      setDocentes(docs.docentes)
    } catch (err) {
      setError(err)
    }
  }, [periodoId, rol])

  useEffect(() => {
    setData(null)
    cargar()
  }, [cargar])

  const fase = data?.proceso.fase ?? proceso?.fase
  const puedoEditar = fase === FASE_EDICION[rol]
  const puedoSolicitar = fase > FASE_EDICION[rol] && fase <= 6

  const reemplazarSeccion = (sec) =>
    setData((d) => ({
      ...d,
      cursos: d.cursos.map((c) =>
        c.cod_curso === sec.cod_curso
          ? {
              ...c,
              secciones: c.secciones.map((s) => (s.id_seccion === sec.id_seccion ? { ...s, ...sec } : s))
            }
          : c
      )
    }))

  const refrescarTodo = async () => {
    await Promise.all([cargar(), recargar()])
  }

  const asignarDocente = async (s, id) => {
    setBusy(s.id_seccion)
    setMsg(null)
    try {
      const res = await procesoApi.asignarDocente(s.id_seccion, id ? Number(id) : null)
      reemplazarSeccion(res.seccion)
      procesoApi.docentes(periodoId).then((r) => setDocentes(r.docentes))
    } catch (err) {
      setMsg({ ok: false, text: err.detail })
    } finally {
      setBusy(null)
    }
  }

  const asignarAula = async (s, aula, sesion) => {
    if (!aula) return
    setBusy(s.id_seccion)
    setMsg(null)
    try {
      reemplazarSeccion((await procesoApi.asignarAula(s.id_seccion, aula, sesion)).seccion)
      setErrAula(({ [s.id_seccion]: _, ...resto }) => resto)
    } catch (err) {
      setErrAula((e) => ({ ...e, [s.id_seccion]: err.detail }))
      setMsg({ ok: false, text: `No se asignó el aula a ${s.curso?.nombre_curso || 'la sección'} (${s.cod_seccion}): ${err.detail}` })
    } finally {
      setBusy(null)
    }
  }

  const eliminar = async (s) => {
    setBusy(s.id_seccion)
    try {
      await procesoApi.eliminarSeccion(s.id_seccion)
      await refrescarTodo()
    } catch (err) {
      setMsg({ ok: false, text: err.detail })
    } finally {
      setBusy(null)
    }
  }

  const copiar = async () => {
    setMsg(null)
    try {
      const res = await procesoApi.copiar(periodoId, Number(origen))
      setMsg({ ok: true, text: res.message })
      await refrescarTodo()
    } catch (err) {
      setMsg({ ok: false, text: err.detail })
    }
  }

  const ejecutar = async (acc, motivo) => {
    const res = await procesoApi.accion(periodoId, acc, motivo ? { motivo } : {})
    setAccion(null)
    setMsg({
      ok: true,
      text: `Listo. El proceso está en: ${res.proceso.fase_nombre}.`
    })
    await refrescarTodo()
  }

  const cursos = data?.cursos || []
  const ciclos = [...new Set(cursos.map((c) => c.ciclo))]
  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase()
    return cursos
      .filter((c) => ciclo === 'todos' || c.ciclo === ciclo)
      .filter((c) => !term || c.nombre_curso.toLowerCase().includes(term) || String(c.codigo_curso).includes(term))
      .filter((c) => {
        if (!soloPend) return true
        if (rol === 'jefe') return c.secciones.length === 0 || c.secciones.some((s) => s.avisos?.length)
        if (rol === 'director') return c.secciones.some((s) => s.sin_docente)
        return c.secciones.some((s) => s.sin_aula)
      })
  }, [cursos, ciclo, q, soloPend, rol])

  if (!proceso) return <Loading />
  if (error) return <ErrorState error={error} retry={cargar} />
  if (!data) return <Loading />

  const p = data.proceso
  const cnt = p.conteo
  const [titulo, sub] = TITULOS[rol]
  const botones = []
  if (rol === 'jefe' && fase === 1)
    botones.push([
      'enviar_director',
      'Enviar al Director de Escuela',
      Send,
      'Los horarios se enviarán al director para que asigne docentes. Ya no podrás editarlos directamente.'
    ])
  if (rol === 'director' && fase === 2) {
    botones.push(['devolver_jefe', 'Devolver al Jefe', ArrowLeftCircle, 'Los horarios vuelven a la fase 1 para que el jefe los corrija.', true])
    botones.push(['enviar_confirmacion', 'Enviar a confirmación', Send, 'El jefe y tú confirmarán la programación; luego el asistente asignará aulas.'])
  }
  if (fase === 3 && ((rol === 'jefe' && !p.confirmado_jefe) || (rol === 'director' && !p.confirmado_director)))
    botones.push(['confirmar', 'Confirmar horarios y docentes', CheckCircle2, 'Confirmas que los horarios y los docentes asignados son correctos.'])
  if (rol === 'asistente' && fase === 3)
    botones.push(['enviar_docentes', 'Publicar para los docentes', Send, 'Cada docente verá su horario y deberá confirmarlo o reportar un problema.'])
  if (rol === 'director' && fase === 5)
    botones.push(['iniciar_ajustes', 'Iniciar período de ajustes', Wrench, 'Comienzan las clases: se permiten ajustes de horario por 2 semanas.'])
  if (rol === 'director' && (fase === 5 || fase === 6))
    botones.push(['cerrar', 'Cerrar proceso y matrícula', Lock, 'Se cierra la matrícula y ya no se aceptan cambios de horario.'])

  const esperando =
    fase === 1 && rol !== 'jefe'
      ? 'El Jefe de Departamento está armando los horarios.'
      : fase === 2 && rol !== 'director'
        ? 'El Director de Escuela está asignando docentes.'
        : fase === 3 && rol === 'asistente' && !(p.confirmado_jefe && p.confirmado_director)
          ? `Puedes asignar aulas. Para publicar falta la confirmación de: ${[!p.confirmado_jefe && 'Jefe', !p.confirmado_director && 'Director'].filter(Boolean).join(' y ')}.`
          : fase === 4
            ? `Docentes: ${cnt.docentes_confirmados} secciones confirmadas, ${cnt.docentes_pendientes} por confirmar, ${cnt.docentes_observados} observadas. Cuando todos confirmen, los horarios quedan establecidos y la matrícula se abre sola.`
            : null

  // Solo períodos del mismo tipo de semestre (-1 ciclos impares, -2 ciclos pares), más recientes primero
  const tipo = (x) => x.periodo.cod_per_acad.slice(-2)
  const otros = procesos.filter((x) => x.id_periodo !== periodoId && x.conteo.secciones > 0 && tipo(x) === tipo(p)).sort((a, b) => b.id_periodo - a.id_periodo)

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <p className="eyebrow">Período {p.periodo.cod_per_acad} · Escuela de Ingeniería de Sistemas</p>
          <h1>{titulo}</h1>
          <p className="muted">{puedoEditar || rol === 'admin' ? sub : fase === 7 ? 'Proceso cerrado: la programación queda solo para consulta.' : SUBTITULO_LECTURA}</p>
        </div>
        <div className="hero-stats">
          <span>
            <b>{cnt.secciones}</b> secciones
          </span>
          <span className={cnt.sin_docente ? 'warn' : ''}>
            <b>{cnt.sin_docente}</b> sin docente
          </span>
          <span className={cnt.sin_aula ? 'warn' : ''}>
            <b>{cnt.sin_aula}</b> sin aula
          </span>
        </div>
      </div>

      {p.observacion && fase === 1 && (
        <div className="alert-box-error">
          <AlertTriangle size={16} /> El director devolvió los horarios: “{p.observacion}”
        </div>
      )}
      <Mensaje msg={msg} className="alert-box-error" />
      {fase >= 3 && fase <= 6 && cnt.sin_docente > 0 && (rol === 'director' || rol === 'admin') && (
        <div className="alert-box-warn">
          <AlertTriangle size={16} /> {cnt.sin_docente} {cnt.sin_docente === 1 ? 'sección sigue' : 'secciones siguen'} con «Docente por asignar».{' '}
          {rol === 'director' ? 'Asígnalas desde la columna Docente antes de cerrar la matrícula.' : 'El Director debe completarlas antes del cierre.'}
        </div>
      )}

      {(botones.length > 0 || esperando || fase === 3) && (
        <div className="accion-panel">
          <div className="accion-info">
            {fase === 3 && (
              <div className="confirmaciones">
                <span className={p.confirmado_jefe ? 'ok' : ''}>
                  <CheckCircle2 size={15} /> Jefe {p.confirmado_jefe ? 'confirmó' : 'por confirmar'}
                </span>
                <span className={p.confirmado_director ? 'ok' : ''}>
                  <CheckCircle2 size={15} /> Director {p.confirmado_director ? 'confirmó' : 'por confirmar'}
                </span>
                <span className={cnt.sin_aula === 0 ? 'ok' : ''}>
                  <CheckCircle2 size={15} /> Aulas {cnt.sin_aula === 0 ? 'completas' : `faltan ${cnt.sin_aula}`}
                </span>
              </div>
            )}
            {esperando && <p className="muted">{esperando}</p>}
            {!puedoEditar && puedoSolicitar && (
              <p className="muted small">
                <Lock size={13} /> Tu fase de edición ya pasó: para cambiar algo usa “Solicitar cambio” en la sección.
              </p>
            )}
          </div>
          <div className="accion-botones">
            {botones.map(([acc, label, Icon, texto, motivo]) => (
              <button
                key={acc}
                type="button"
                className={acc === 'devolver_jefe' ? 'btn-secondary' : 'btn-primary'}
                onClick={() => setAccion({ acc, label, texto, motivo })}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {rol === 'jefe' && fase === 1 && cnt.secciones === 0 && otros.length > 0 && (
        <div className="bulk-bar">
          <span>
            <strong>Empieza rápido:</strong> copia las secciones, turnos y horas de un período anterior (sin docentes ni aulas) y ajústalas.
          </span>
          <div className="bulk-buttons">
            <select className="select-input" value={origen} onChange={(e) => setOrigen(e.target.value)}>
              <option value="">— Período base —</option>
              {otros.map((o) => (
                <option key={o.id_periodo} value={o.id_periodo}>
                  {o.periodo.cod_per_acad} ({o.conteo.secciones} secciones)
                </option>
              ))}
            </select>
            <button type="button" className="btn-outline" disabled={!origen} onClick={copiar}>
              <Copy size={15} /> Copiar como base
            </button>
          </div>
        </div>
      )}

      {rol === 'admin' && p.historial?.length > 0 && (
        <details className="panel-card actividad-proceso">
          <summary>Actividad reciente del proceso ({p.historial.length})</summary>
          <ul>
            {p.historial.map((h, i) => (
              <li key={i}>
                <time>{new Date(h.fecha).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}</time>
                <span>
                  <b>{h.usuario}</b> · {h.accion}
                </span>
                <small>Fase {h.fase}</small>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="toolbar wrap">
        <div className="search-wrap">
          <Search size={16} />
          <input className="search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar curso o código" />
        </div>
        <div className="chips">
          <button type="button" className={`chip ${ciclo === 'todos' ? 'active' : ''}`} onClick={() => setCiclo('todos')}>
            Todos
          </button>
          {ciclos.map((n) => (
            <button key={n} type="button" className={`chip ${ciclo === n ? 'active' : ''}`} onClick={() => setCiclo(n)}>
              Ciclo {romano(n)}
            </button>
          ))}
        </div>
        <label className="check-inline">
          <input type="checkbox" checked={soloPend} onChange={(e) => setSoloPend(e.target.checked)} /> <Filter size={14} /> Solo pendientes
        </label>
      </div>

      <div className="curso-list">
        {filtrados.map((c) => (
          <article key={c.cod_curso} className="prog-card" style={{ '--c': colorCurso(c.id_curso) }}>
            <header>
              <span className="curso-abrev">{c.abreviatura}</span>
              <div>
                <strong>{c.nombre_curso}</strong>
                <small>
                  {c.codigo_curso} · Ciclo {romano(c.ciclo)} · {c.creditos} créditos · HT {c.ht} / HP {c.hp}
                  {c.mencion_electiva ? ' · Electivo' : ''}
                </small>
              </div>
              {rol === 'jefe' && puedoEditar && c.secciones.length < letrasDe(c).length && (
                <button type="button" className="btn-secondary btn-sm" onClick={() => setEditando({ curso: c })}>
                  <Plus size={14} /> Sección
                </button>
              )}
            </header>
            {c.secciones.length === 0 ? (
              <p className="prog-empty">Sin secciones programadas.</p>
            ) : (
              <div className="table-scroll">
                <table className="data-table prog-table">
                  <thead>
                    <tr>
                      <th>Secc.</th>
                      <th>Turno</th>
                      <th>Horario</th>
                      <th>Cap.</th>
                      <th>Docente</th>
                      <th>Aula</th>
                      {fase >= 4 && <th>Docente confirma</th>}
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {c.secciones.map((s) => {
                      const [elabel, ecls] = ESTADO_DOCENTE[s.estado_docente] || ['—', 'pill-muted']
                      return (
                        <tr key={s.id_seccion} className={busy === s.id_seccion ? 'row-busy' : ''}>
                          <td>
                            <span className="sec-letter">{s.cod_seccion}</span>
                          </td>
                          <td>
                            <span className={`turno-pill turno-${s.turno}`}>{TURNOS[s.turno]}</span>
                          </td>
                          <td className="small">
                            {horarioCorto(s)}
                            {s.avisos?.map((a) => (
                              <div key={a} className="sec-warn">
                                <AlertTriangle size={13} /> {a}
                              </div>
                            ))}
                          </td>
                          <td>{s.cupo_maximo}</td>
                          <td className="small">
                            {rol === 'director' && (puedoEditar || (fase >= 3 && fase <= 6 && s.sin_docente)) ? (
                              <DocenteCombo
                                value={s.id_docente || null}
                                actual={s.docente}
                                docentes={docentes}
                                onChange={(id) => asignarDocente(s, id)}
                                disabled={busy === s.id_seccion}
                              />
                            ) : (
                              <span className={s.sin_docente ? 'text-warn' : ''}>{s.sin_docente ? 'Docente por asignar' : s.docente}</span>
                            )}
                          </td>
                          <td className="small">
                            {rol === 'asistente' && puedoEditar ? (
                              (s.sesiones || []).length > 1 ? (
                                <div className="aulas-sesion">
                                  <AulaSelect
                                    value={s.sesiones.every((x) => x.aula === s.sesiones[0].aula) ? s.sesiones[0].aula : 'POR ASIGNAR'}
                                    aulas={aulas}
                                    onChange={(a) => asignarAula(s, a)}
                                    disabled={busy === s.id_seccion}
                                    placeholder="— Misma aula para todo —"
                                  />
                                  {s.sesiones.map((ses, i) => (
                                    <label key={i}>
                                      <span>{ses.dia_nombre?.slice(0, 3)}</span>
                                      <AulaSelect value={ses.aula} aulas={aulas} onChange={(a) => asignarAula(s, a, i)} disabled={busy === s.id_seccion} />
                                    </label>
                                  ))}
                                </div>
                              ) : (
                                <AulaSelect value={s.aula} aulas={aulas} onChange={(a) => asignarAula(s, a)} disabled={busy === s.id_seccion} />
                              )
                            ) : (
                              <span className={s.sin_aula ? 'text-warn' : ''}>{s.sin_aula ? 'Por asignar' : s.ubicacion?.texto}</span>
                            )}
                            {errAula[s.id_seccion] && (
                              <div className="sec-warn aula-error">
                                <AlertTriangle size={13} /> {errAula[s.id_seccion]}
                              </div>
                            )}
                          </td>
                          {fase >= 4 && (
                            <td>{s.id_docente ? <span className={`pill ${ecls}`}>{elabel}</span> : <span className="small muted">Departamento</span>}</td>
                          )}
                          <td className="right actions-cell">
                            {rol === 'jefe' && puedoEditar && (
                              <>
                                <button
                                  type="button"
                                  className="icon-btn edit"
                                  onClick={() => setEditando({ curso: c, seccion: s })}
                                  aria-label="Editar sección"
                                >
                                  <Pencil size={15} />
                                </button>
                                <button type="button" className="icon-btn" onClick={() => eliminar(s)} aria-label="Eliminar sección">
                                  <Trash2 size={15} />
                                </button>
                              </>
                            )}
                            {puedoSolicitar && (
                              <button type="button" className="btn-secondary btn-sm" onClick={() => setSolicitando(s)}>
                                <MessageSquareWarning size={14} /> Solicitar cambio
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        ))}
      </div>

      {editando && (
        <SeccionModal
          idPeriodo={periodoId}
          curso={editando.curso}
          seccion={editando.seccion}
          onClose={() => setEditando(null)}
          onSaved={async (sec) => {
            setEditando(null)
            setMsg(
              sec.avisos?.length
                ? {
                    ok: false,
                    text: `Guardado con advertencias: ${sec.avisos.join('; ')}`
                  }
                : { ok: true, text: 'Sección guardada.' }
            )
            await refrescarTodo()
          }}
        />
      )}
      {solicitando && (
        <SolicitudModal
          rol={rol}
          idPeriodo={periodoId}
          seccion={solicitando}
          docentes={docentes}
          aulas={aulas}
          onClose={() => setSolicitando(null)}
          onDone={() => {
            setSolicitando(null)
            setMsg({
              ok: true,
              text: 'Solicitud enviada. Verás la respuesta en “Solicitudes de cambio”.'
            })
            recargar()
          }}
        />
      )}
      {accion && (
        <AccionModal
          titulo={accion.label}
          texto={accion.texto}
          pedirMotivo={accion.motivo}
          confirmar={accion.label}
          onClose={() => setAccion(null)}
          onConfirm={(motivo) => ejecutar(accion.acc, motivo)}
        />
      )}
    </section>
  )
}
