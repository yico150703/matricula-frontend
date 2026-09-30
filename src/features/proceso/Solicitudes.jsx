import { ArrowRight, CheckCircle2, Inbox, MessageCircle, Send, XCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { procesoApi } from '../../api/client'
import { Empty, ErrorState, Loading } from '../../components/AsyncState'
import { DIAS, horarioCorto } from '../../utils/academico'
import { horasPlan, PropuestaEditor, ROL_NOMBRE, sesionesIniciales, TIPOS } from './editores'
import { useProceso } from './ProcesoContext'

const ESTADO = {
  pendiente: ['Pendiente', 'pill-warn'],
  aprobada: ['Aprobada', 'pill-ok'],
  rechazada: ['Rechazada', 'pill-bad']
}

function describirPropuesta(tipo, p) {
  if (!p) return 'Sin propuesta: se pide revisar.'
  if (tipo === 'horario') return p.sesiones.map((s) => `${DIAS[s.dia]} ${s.hora_inicio}-${s.hora_fin}`).join(' · ')
  if (tipo === 'docente') return p.docente || `Docente #${p.id_docente}`
  return p.aula
}

function Tarjeta({ sol, user, docentes, aulas, onChange }) {
  const [abierta, setAbierta] = useState(sol.puedo_resolver)
  const [texto, setTexto] = useState('')
  const [respuesta, setRespuesta] = useState('')
  const [modificar, setModificar] = useState(!sol.propuesta && sol.puedo_resolver)
  const [propuesta, setPropuesta] = useState({
    sesiones: sol.propuesta?.sesiones || sesionesIniciales(sol.seccion),
    id_docente: sol.propuesta?.id_docente || '',
    aula: sol.propuesta?.aula || ''
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [label, cls] = ESTADO[sol.estado]
  const s = sol.seccion

  const run = async (fn) => {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(err.detail)
    } finally {
      setBusy(false)
    }
  }
  const enviarMensaje = () =>
    run(async () => {
      const r = await procesoApi.mensaje(sol.id, texto)
      setTexto('')
      onChange(r.solicitud)
    })
  const resolver = (accion) =>
    run(async () => {
      const prop =
        accion === 'aprobar' && modificar
          ? sol.tipo === 'horario'
            ? { sesiones: propuesta.sesiones }
            : sol.tipo === 'docente'
              ? { id_docente: propuesta.id_docente }
              : { aula: propuesta.aula }
          : undefined
      const r = await procesoApi.resolver(sol.id, accion, respuesta, prop)
      onChange(r.solicitud, true)
    })

  return (
    <article className={`sol-card estado-${sol.estado}`}>
      <button type="button" className="sol-head" onClick={() => setAbierta((v) => !v)}>
        <span className={`sol-tipo tipo-${sol.tipo}`}>{TIPOS[sol.tipo]}</span>
        <div>
          <strong>
            {s?.curso?.nombre_curso} · Secc. {s?.cod_seccion}
          </strong>
          <small>
            {ROL_NOMBRE[sol.rol_autor]} ({sol.autor}) <ArrowRight size={12} /> {ROL_NOMBRE[sol.rol_destino]} · {new Date(sol.creado_en).toLocaleString('es-PE')}
          </small>
        </div>
        <span className={`pill ${cls}`}>{label}</span>
      </button>
      {abierta && (
        <div className="sol-body">
          <p className="sol-desc">“{sol.descripcion}”</p>
          <div className="sol-cambio">
            <div>
              <span>{sol.estado === 'pendiente' ? 'Actual' : 'Antes'}</span>
              <b>{sol.anterior || (sol.tipo === 'horario' ? horarioCorto(s) : sol.tipo === 'docente' ? s?.docente : s?.ubicacion?.texto)}</b>
            </div>
            <ArrowRight size={18} />
            <div>
              <span>{sol.estado === 'aprobada' ? 'Aplicado' : 'Propuesto'}</span>
              <b>{describirPropuesta(sol.tipo, sol.propuesta)}</b>
            </div>
          </div>
          {sol.respuesta && <p className="sol-respuesta">Respuesta: {sol.respuesta}</p>}

          <div className="hilo">
            {sol.mensajes.map((m) => (
              <div key={m.id} className={`msg ${m.rol === user.rol ? 'mio' : ''}`}>
                <small>
                  {ROL_NOMBRE[m.rol]} · {m.autor} · {new Date(m.creado_en).toLocaleString('es-PE')}
                </small>
                <p>{m.texto}</p>
              </div>
            ))}
            {sol.estado === 'pendiente' && (
              <div className="msg-input">
                <input
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Escribe un mensaje para coordinar el cambio…"
                  onKeyDown={(e) => e.key === 'Enter' && texto.trim() && enviarMensaje()}
                />
                <button type="button" className="btn-secondary btn-sm" disabled={!texto.trim() || busy} onClick={enviarMensaje}>
                  <Send size={14} /> Enviar
                </button>
              </div>
            )}
          </div>

          {sol.puedo_resolver && (
            <div className="sol-resolver">
              <label className="check-inline">
                <input type="checkbox" checked={modificar} onChange={(e) => setModificar(e.target.checked)} />
                {sol.propuesta ? 'Aprobar con otra alternativa' : 'Definir el cambio que se aplicará'}
              </label>
              {modificar && <PropuestaEditor tipo={sol.tipo} value={propuesta} onChange={setPropuesta} docentes={docentes} aulas={aulas} horas={horasPlan(sol.seccion?.curso)} />}
              <textarea rows={2} value={respuesta} onChange={(e) => setRespuesta(e.target.value)} placeholder="Respuesta (obligatoria si rechazas)" />
              <div className="form-actions">
                <button type="button" className="btn-secondary" disabled={busy} onClick={() => resolver('rechazar')}>
                  <XCircle size={15} /> Rechazar
                </button>
                <button type="button" className="btn-primary" disabled={busy} onClick={() => resolver('aprobar')}>
                  <CheckCircle2 size={15} /> Aprobar y aplicar
                </button>
              </div>
            </div>
          )}
          {error && <p className="form-error">{error}</p>}
        </div>
      )}
    </article>
  )
}

export default function Solicitudes({ user }) {
  const { periodoId, proceso, aulas, recargar } = useProceso()
  const [lista, setLista] = useState(null)
  const [docentes, setDocentes] = useState([])
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('recibidas')

  const cargar = useCallback(async () => {
    if (!periodoId) return
    setError(null)
    try {
      const [r, d] = await Promise.all([
        procesoApi.solicitudes(periodoId),
        user.rol === 'director' || user.rol === 'jefe' ? procesoApi.docentes(periodoId) : Promise.resolve({ docentes: [] })
      ])
      setLista(r.solicitudes)
      setDocentes(d.docentes)
    } catch (err) {
      setError(err)
    }
  }, [periodoId, user.rol])
  useEffect(() => {
    setLista(null)
    cargar()
  }, [cargar])

  if (error) return <ErrorState error={error} retry={cargar} />
  if (!lista || !proceso) return <Loading />
  const recibidas = lista.filter((s) => s.rol_destino === user.rol)
  const enviadas = lista.filter((s) => s.rol_destino !== user.rol)
  const mostrar = user.rol === 'docente' ? lista : tab === 'recibidas' ? recibidas : enviadas

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <p className="eyebrow">Período {proceso.periodo.cod_per_acad}</p>
          <h1>{user.rol === 'docente' ? 'Mis reportes' : 'Solicitudes de cambio'}</h1>
          <p className="muted">Todo cambio fuera de la fase de cada rol se coordina aquí y se aplica solo cuando el otro rol lo acepta.</p>
        </div>
      </div>
      {user.rol !== 'docente' && (
        <div className="tabs">
          <button type="button" className={tab === 'recibidas' ? 'active' : ''} onClick={() => setTab('recibidas')}>
            <Inbox size={16} /> Recibidas{' '}
            <span className="tab-count" title="Pendientes de respuesta">
              {recibidas.filter((s) => s.estado === 'pendiente').length}
            </span>
          </button>
          <button type="button" className={tab === 'enviadas' ? 'active' : ''} onClick={() => setTab('enviadas')}>
            <MessageCircle size={16} /> Enviadas y del equipo <span className="tab-count">{enviadas.length}</span>
          </button>
        </div>
      )}
      {mostrar.length === 0 ? (
        <Empty>
          <Inbox size={34} />
          <span>No hay solicitudes aquí.</span>
        </Empty>
      ) : (
        <div className="sol-list">
          {mostrar.map((sol) => (
            <Tarjeta
              key={sol.id}
              sol={sol}
              user={user}
              docentes={docentes}
              aulas={aulas}
              onChange={(nueva, resuelta) => {
                setLista((l) =>
                  l.map((x) =>
                    x.id === nueva.id
                      ? {
                          ...nueva,
                          puedo_resolver: nueva.estado === 'pendiente' && nueva.rol_destino === user.rol
                        }
                      : x
                  )
                )
                if (resuelta) recargar()
              }}
            />
          ))}
        </div>
      )}
    </section>
  )
}
