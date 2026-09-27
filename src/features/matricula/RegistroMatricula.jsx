import {
  AlertTriangle,
  ArrowLeftRight,
  BookMarked,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Layers,
  Lock,
  MapPin,
  Plus,
  RefreshCcw,
  Repeat,
  ShoppingCart,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { carritoApi, matriculaApi } from '../../api/client'
import { ErrorState, Loading } from '../../components/AsyncState'
import { colorCurso, horarioCorto, planPorId, romano, seCruzan, TURNOS } from '../../utils/academico'

const descargarFicha = (alumno, periodo, matricula) =>
  import('../../utils/generatePdf').then(({ descargarFichaMatriculaPDF }) => descargarFichaMatriculaPDF({ alumno, periodo, matricula }))

function Vacantes({ s }) {
  if (s.limite === undefined) return null
  const libres = Math.max(0, s.limite - s.matriculados - s.reservados)
  const pct = Math.min(100, ((s.matriculados + s.reservados) / Math.max(1, s.limite)) * 100)
  return (
    <div className="vacantes" title={`Capacidad ${s.capacidad} · matriculados ${s.matriculados} · reservados en carritos ${s.reservados}`}>
      <div className="vacantes-bar">
        <i style={{ width: `${pct}%` }} className={libres === 0 ? 'full' : pct > 80 ? 'warn' : ''} />
      </div>
      <span>
        <b>{s.matriculados}</b>/{s.capacidad} matriculados
        {s.reservados > 0 && ` · ${s.reservados} reservadas`}
        {s.es_repitente && s.sobrecupo_repitentes > 0 && <em> · +{s.sobrecupo_repitentes} por repitencia</em>}
      </span>
    </div>
  )
}

function SeccionOpcion({ s, curso, estadoSec, onAdd, onRemove, busy }) {
  const { enCarrito, matriculada, cruce, llena } = estadoSec
  const deshabilitada = !enCarrito && !matriculada && (cruce || llena || busy)
  return (
    <div className={`sec-option ${enCarrito ? 'in-cart' : ''} ${matriculada ? 'enrolled' : ''} ${deshabilitada ? 'disabled' : ''}`}>
      <div className="sec-head">
        <span className="sec-letter">{s.cod_seccion}</span>
        <span className={`turno-pill turno-${s.turno}`}>{TURNOS[s.turno] || s.turno}</span>
        {matriculada && <span className="pill pill-ok">Matriculado</span>}
        {enCarrito && <span className="pill pill-info">En carrito</span>}
      </div>
      <div className="sec-body">
        <span>
          <Clock size={14} /> {horarioCorto(s)}
        </span>
        <span>
          <User size={14} /> {s.docente}
        </span>
        <span>
          <MapPin size={14} /> {s.ubicacion?.texto || s.aula}
        </span>
        <Vacantes s={s} />
        {cruce && !enCarrito && !matriculada && (
          <span className="sec-warn">
            <AlertTriangle size={14} /> Se cruza con {cruce.curso?.nombre_curso}
          </span>
        )}
      </div>
      {!matriculada &&
        (enCarrito ? (
          <button type="button" className="btn-secondary btn-sm" onClick={() => onRemove(s)} disabled={busy}>
            <X size={14} /> Quitar
          </button>
        ) : (
          <button type="button" className="btn-primary btn-sm" onClick={() => onAdd(curso, s)} disabled={deshabilitada}>
            {llena ? 'Sin vacantes' : cruce ? 'Cruce de horario' : (
              <>
                <Plus size={14} /> Agregar
              </>
            )}
          </button>
        ))}
    </div>
  )
}

const ESTADOS = {
  aprobado: ['Aprobado', 'pill-ok'],
  en_curso: ['En curso', 'pill-info'],
  disponible: ['Disponible', 'pill-muted'],
  desaprobado: ['Repitente', 'pill-bad'],
  bloqueado_por_prerrequisito: ['Bloqueado', 'pill-lock'],
}

function CursoFila({ curso, children, abierto, onToggle }) {
  const [label, cls] = ESTADOS[curso.estado] || [curso.estado, 'pill-muted']
  const bloqueado = curso.estado === 'bloqueado_por_prerrequisito' || curso.estado === 'aprobado'
  return (
    <article className={`curso-card ${bloqueado ? 'is-locked' : ''}`} style={{ '--c': colorCurso(curso.id_curso) }}>
      <button type="button" className="curso-card-head" onClick={onToggle} disabled={bloqueado}>
        <span className="curso-abrev">{curso.abreviatura}</span>
        <span className="curso-titulo">
          <strong>{curso.nombre_curso}</strong>
          <small>
            {curso.codigo_curso} · Ciclo {romano(curso.ciclo)} · {curso.creditos} créditos
            {curso.mencion_electiva ? ' · Electivo' : ''}
          </small>
          {curso.estado === 'bloqueado_por_prerrequisito' && curso.prerrequisitos_pendientes?.length > 0 && (
            <small className="curso-lock">
              <Lock size={12} /> Requiere: {curso.prerrequisitos_pendientes.join(', ')}
            </small>
          )}
        </span>
        <span className={`pill ${cls}`}>{label}</span>
      </button>
      {abierto && !bloqueado && <div className="sec-grid">{children}</div>}
    </article>
  )
}

function Cronometro({ segundos, onExpire }) {
  const [left, setLeft] = useState(segundos)
  useEffect(() => setLeft(segundos), [segundos])
  useEffect(() => {
    if (left === null || left === undefined) return undefined
    if (left <= 0) {
      onExpire()
      return undefined
    }
    const t = setTimeout(() => setLeft((v) => v - 1), 1000)
    return () => clearTimeout(t)
  }, [left, onExpire])
  if (left === null || left === undefined) return null
  const m = String(Math.floor(left / 60)).padStart(2, '0')
  const s = String(left % 60).padStart(2, '0')
  return (
    <span className={`cart-timer ${left < 120 ? 'low' : ''}`} title="Tiempo de reserva de tus vacantes">
      <Clock size={15} /> {m}:{s}
    </span>
  )
}

export default function RegistroMatricula({ alumno, periodo, ciclo, onCambiarCiclo }) {
  const plan = planPorId(alumno.id_plan)
  const [oferta, setOferta] = useState(null)
  const [matricula, setMatricula] = useState(null)
  const [carrito, setCarrito] = useState(null)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('ciclo')
  const [abiertos, setAbiertos] = useState({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [exito, setExito] = useState(null)
  const [confirmRetiro, setConfirmRetiro] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [of, mat, car] = await Promise.all([
        matriculaApi.oferta(alumno.cod_alumno, periodo.id_periodo),
        matriculaApi.actual(alumno.cod_alumno, periodo.id_periodo),
        carritoApi.ver(alumno.cod_alumno, periodo.id_periodo),
      ])
      setOferta(of)
      setMatricula(mat.matricula)
      setCarrito(car)
    } catch (err) {
      setError(err)
    }
  }, [alumno.cod_alumno, periodo.id_periodo])

  useEffect(() => {
    load()
  }, [load])

  const enCarrito = useMemo(() => new Map((carrito?.items || []).map((i) => [i.seccion.id_seccion, i.seccion])), [carrito])
  const matriculadas = useMemo(
    () => (matricula?.detalles || []).filter((d) => d.estado === 'matriculado' && d.seccion).map((d) => d.seccion),
    [matricula],
  )
  const ocupadas = useMemo(() => [...matriculadas, ...enCarrito.values()], [matriculadas, enCarrito])

  const estadoSeccion = (curso, s) => ({
    enCarrito: enCarrito.has(s.id_seccion),
    matriculada: matriculadas.some((m) => m.id_seccion === s.id_seccion),
    cruce: ocupadas.find((o) => o.id_curso !== curso.id_curso && seCruzan(o, s)),
    llena: s.limite !== undefined && s.matriculados + s.reservados >= s.limite,
  })

  const aplicarCarrito = (res) => {
    setCarrito(res)
    if (res.mensaje) setMsg({ ok: true, text: res.mensaje })
  }

  const agregar = async (ids) => {
    setBusy(true)
    setMsg(null)
    try {
      aplicarCarrito(await carritoApi.agregar(alumno.cod_alumno, periodo.id_periodo, ids))
      const of = await matriculaApi.oferta(alumno.cod_alumno, periodo.id_periodo)
      setOferta(of)
    } catch (err) {
      setMsg({ ok: false, text: err.detail })
    } finally {
      setBusy(false)
    }
  }

  const quitar = async (s) => {
    setBusy(true)
    try {
      setCarrito(await carritoApi.quitar(alumno.cod_alumno, periodo.id_periodo, s.id_seccion))
    } catch (err) {
      setMsg({ ok: false, text: err.detail })
    } finally {
      setBusy(false)
    }
  }

  const vaciar = async () => {
    setBusy(true)
    try {
      setCarrito(await carritoApi.vaciar(alumno.cod_alumno, periodo.id_periodo))
    } finally {
      setBusy(false)
    }
  }

  const confirmar = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const res = await carritoApi.confirmar(alumno.cod_alumno, periodo.id_periodo)
      setExito(res.matricula)
      await load()
    } catch (err) {
      setMsg({ ok: false, text: err.detail })
      await load()
    } finally {
      setBusy(false)
    }
  }

  const retirar = async (detalle) => {
    setConfirmRetiro(null)
    setBusy(true)
    try {
      await matriculaApi.retirar(matricula.nro_matricula, detalle.seccion.id_seccion)
      setMsg({ ok: true, text: `Retiraste ${detalle.seccion.curso?.nombre_curso}. La vacante quedó libre.` })
      await load()
    } catch (err) {
      setMsg({ ok: false, text: err.detail })
    } finally {
      setBusy(false)
    }
  }

  const onExpire = useCallback(() => {
    setMsg({ ok: false, text: 'Tu reserva venció y las vacantes se liberaron. Vuelve a agregar los cursos.' })
    carritoApi.ver(alumno.cod_alumno, periodo.id_periodo).then(setCarrito).catch(() => {})
  }, [alumno.cod_alumno, periodo.id_periodo])

  if (error) return <ErrorState error={error} retry={load} />
  if (!oferta || !carrito) return <Loading />

  const cursos = oferta.cursos
  const delCiclo = cursos.filter((c) => c.ciclo === ciclo)
  const otros = cursos.filter((c) => c.ciclo !== ciclo && (c.estado === 'disponible' || c.estado === 'desaprobado'))
  const bloqueadosOtros = cursos.filter((c) => c.ciclo !== ciclo && c.estado === 'bloqueado_por_prerrequisito').length
  const letras = [...new Set(delCiclo.flatMap((c) => c.secciones.map((s) => s.cod_seccion)))].filter((l) => l !== 'E').sort()
  const turnoDe = (letra) => delCiclo.flatMap((c) => c.secciones).find((s) => s.cod_seccion === letra)?.turno

  const agregarSeccionCompleta = (letra) => {
    const ids = delCiclo
      .filter((c) => (c.estado === 'disponible' || c.estado === 'desaprobado') && !c.mencion_electiva)
      .filter((c) => !matriculadas.some((m) => m.id_curso === c.id_curso))
      .map((c) => c.secciones.find((s) => s.cod_seccion === letra))
      .filter(Boolean)
      .map((s) => s.id_seccion)
    if (!ids.length) return setMsg({ ok: false, text: `No hay cursos disponibles para agregar en la sección ${letra}.` })
    return agregar(ids)
  }

  const creditosTotal = carrito.creditos_matriculados + carrito.creditos_carrito
  const pct = Math.min(100, (creditosTotal / carrito.max_creditos) * 100)
  const renderCurso = (curso) => (
    <CursoFila key={curso.id_curso} curso={curso} abierto={abiertos[curso.id_curso] ?? true} onToggle={() => setAbiertos((a) => ({ ...a, [curso.id_curso]: !(a[curso.id_curso] ?? true) }))}>
      {curso.secciones.map((s) => (
        <SeccionOpcion key={s.id_seccion} s={s} curso={curso} estadoSec={estadoSeccion(curso, s)} onAdd={(_, sec) => agregar([sec.id_seccion])} onRemove={quitar} busy={busy} />
      ))}
    </CursoFila>
  )

  if (exito) {
    const activos = exito.detalles.filter((d) => d.estado === 'matriculado' && d.seccion)
    return (
      <div className="registro-matricula-container">
        <div className="matricula-success-card">
          <CheckCircle2 size={56} className="success-icon-svg" />
          <h2>Matrícula registrada</h2>
          <p className="success-sub">
            Período <strong>{periodo.cod_per_acad}</strong> · N.º de matrícula <strong>{exito.nro_matricula}</strong> ·{' '}
            {activos.length} asignaturas · {activos.reduce((a, d) => a + Number(d.seccion.curso?.creditos || 0), 0)} créditos
          </p>
          <div className="success-actions">
            <button type="button" className="btn-primary" onClick={() => descargarFicha(alumno, periodo, exito)}>
              <Download size={16} /> Descargar ficha de matrícula (PDF)
            </button>
            <Link to="/horario" className="btn-secondary">
              <CalendarDays size={16} /> Ver mi horario
            </Link>
            <button type="button" className="btn-secondary" onClick={() => setExito(null)}>
              <ArrowLeftRight size={16} /> Seguir en matrícula
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="matricula-layout">
      <div className="matricula-main">
        <div className="page-hero">
          <div>
            <p className="eyebrow">Período {periodo.cod_per_acad} · {plan.nombre}</p>
            <h1>Registro de matrícula</h1>
            <p className="muted">
              {alumno.cod_alumno} · {alumno.apellidos}, {alumno.nombres} · Nivel actual: ciclo {romano(oferta.ciclo_actual)}
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={onCambiarCiclo}>
            <RefreshCcw size={16} /> Cambiar ciclo / período
          </button>
        </div>

        <div className="tabs">
          <button type="button" className={tab === 'ciclo' ? 'active' : ''} onClick={() => setTab('ciclo')}>
            <Layers size={16} /> Ciclo {romano(ciclo)} <span className="tab-count">{delCiclo.length}</span>
          </button>
          <button type="button" className={tab === 'otros' ? 'active' : ''} onClick={() => setTab('otros')}>
            <Repeat size={16} /> Otros ciclos / repitencia <span className="tab-count">{otros.length}</span>
          </button>
          <button type="button" className={tab === 'mia' ? 'active' : ''} onClick={() => setTab('mia')}>
            <BookMarked size={16} /> Mi matrícula <span className="tab-count">{matriculadas.length}</span>
          </button>
        </div>

        {msg && <div className={msg.ok ? 'alert-box-success' : 'alert-box-error'}>{msg.text}</div>}

        {tab === 'ciclo' && (
          <>
            {letras.length > 0 && (
              <div className="bulk-bar">
                <span>
                  <strong>Matrícula rápida:</strong> agrega todos los cursos del ciclo en la misma sección (sin cruces de horario).
                </span>
                <div className="bulk-buttons">
                  {letras.map((l) => (
                    <button key={l} type="button" className="btn-outline" onClick={() => agregarSeccionCompleta(l)} disabled={busy}>
                      Sección {l} · {TURNOS[turnoDe(l)]}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {delCiclo.length === 0 ? (
              <p className="empty-note">
                El ciclo {romano(ciclo)} no tiene cursos programados en {periodo.cod_per_acad}. En los períodos -1 se dictan los ciclos
                impares y en los -2 los pares.
              </p>
            ) : (
              <div className="curso-list">{delCiclo.map(renderCurso)}</div>
            )}
          </>
        )}

        {tab === 'otros' && (
          <>
            <p className="info-strip">
              Aquí aparecen los cursos de otros ciclos que puedes llevar en {periodo.cod_per_acad}: los que desaprobaste (con sobrecupo
              para repitentes) y los que aún no llevaste. Se suman a tu carrito y respetan el máximo de {carrito.max_creditos} créditos.
              {bloqueadosOtros > 0 && ` ${bloqueadosOtros} cursos más siguen bloqueados por prerrequisitos.`}
            </p>
            {otros.length === 0 ? (
              <p className="empty-note">No tienes cursos de otros ciclos disponibles en este período.</p>
            ) : (
              <div className="curso-list">
                {[...otros].sort((a, b) => (b.repitente - a.repitente) || a.ciclo - b.ciclo).map(renderCurso)}
              </div>
            )}
          </>
        )}

        {tab === 'mia' && (
          <div className="panel-card">
            {matriculadas.length === 0 ? (
              <p className="empty-note">Aún no tienes cursos matriculados en {periodo.cod_per_acad}.</p>
            ) : (
              <>
                <div className="card-head">
                  <h3>
                    Matrícula N.º {matricula.nro_matricula} · {matriculadas.length} cursos
                  </h3>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => descargarFicha(alumno, periodo, matricula)}>
                    <Download size={14} /> Ficha PDF
                  </button>
                </div>
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Asignatura</th>
                        <th>Secc.</th>
                        <th>Horario</th>
                        <th>Docente</th>
                        <th className="right" />
                      </tr>
                    </thead>
                    <tbody>
                      {matricula.detalles
                        .filter((d) => d.estado === 'matriculado')
                        .map((d) => (
                          <tr key={d.id}>
                            <td>
                              <code className="code-chip light">{d.seccion.curso?.codigo_curso}</code>
                            </td>
                            <td>{d.seccion.curso?.nombre_curso}</td>
                            <td>
                              {d.seccion.cod_seccion} · {d.seccion.turno}
                            </td>
                            <td className="small">{horarioCorto(d.seccion)}</td>
                            <td className="small">{d.seccion.docente}</td>
                            <td className="right">
                              {d.nota_final !== null ? (
                                <span className="small muted">Con nota</span>
                              ) : confirmRetiro === d.id ? (
                                <span className="actions-cell">
                                  <button type="button" className="btn-danger btn-sm" onClick={() => retirar(d)}>
                                    Confirmar retiro
                                  </button>
                                  <button type="button" className="btn-secondary btn-sm" onClick={() => setConfirmRetiro(null)}>
                                    No
                                  </button>
                                </span>
                              ) : (
                                <button type="button" className="btn-secondary btn-sm" onClick={() => setConfirmRetiro(d.id)} disabled={busy}>
                                  Retirar
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <aside className="cart-panel">
        <div className="cart-head">
          <h3>
            <ShoppingCart size={18} /> Mi carrito
          </h3>
          {carrito.items.length > 0 && <Cronometro segundos={carrito.segundos_restantes} onExpire={onExpire} />}
        </div>
        <div className="credit-meter">
          <div className="credit-meter-top">
            <span>Créditos</span>
            <strong className={creditosTotal > carrito.max_creditos ? 'over' : ''}>
              {creditosTotal} / {carrito.max_creditos}
            </strong>
          </div>
          <div className="credit-bar">
            <i className="enrolled" style={{ width: `${(carrito.creditos_matriculados / carrito.max_creditos) * 100}%` }} />
            <i className="cart" style={{ width: `${Math.max(0, pct - (carrito.creditos_matriculados / carrito.max_creditos) * 100)}%` }} />
          </div>
          <small className="muted">
            {carrito.creditos_matriculados} matriculados · {carrito.creditos_carrito} en el carrito
          </small>
        </div>

        {carrito.items.length === 0 ? (
          <p className="cart-empty">
            Agrega secciones desde la lista. Tus vacantes quedan reservadas por {carrito.minutos_reserva} minutos mientras completas tu
            matrícula.
          </p>
        ) : (
          <ul className="cart-items">
            {carrito.items.map(({ seccion: s }) => (
              <li key={s.id_seccion} style={{ '--c': colorCurso(s.id_curso) }}>
                <div>
                  <strong>{s.curso?.nombre_curso}</strong>
                  <small>
                    Secc. {s.cod_seccion} ({TURNOS[s.turno]}) · {s.curso?.creditos} cr. · Ciclo {romano(s.curso?.ciclo)}
                  </small>
                  <small>{horarioCorto(s)}</small>
                </div>
                <button type="button" className="icon-btn" onClick={() => quitar(s)} disabled={busy} aria-label="Quitar del carrito">
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="cart-actions">
          <button type="button" className="btn-primary btn-block" disabled={busy || carrito.items.length === 0} onClick={confirmar}>
            <CheckCircle2 size={17} /> {busy ? 'Procesando…' : `Matricular ${carrito.items.length || ''} curso(s)`}
          </button>
          {carrito.items.length > 0 && (
            <button type="button" className="btn-link" onClick={vaciar} disabled={busy}>
              Vaciar carrito
            </button>
          )}
        </div>
      </aside>
    </div>
  )
}
