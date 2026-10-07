import { BookOpenCheck, CheckCheck, ClipboardList, Inbox, Megaphone, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { BUZON_EVENT, buzonApi } from '../../api/client'
import { Empty, ErrorState, Loading } from '../../components/AsyncState'

const ICONOS = { seguridad: ShieldCheck, matricula: ClipboardList, notas: BookOpenCheck, aviso: Megaphone }

const avisarConteo = (n) => window.dispatchEvent(new CustomEvent(BUZON_EVENT, { detail: n }))

const fecha = (iso) => new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/** Buzón del alumno: avisos del sistema (seguridad de la cuenta y, más adelante, matrícula, notas, etc.). */
export default function Buzon() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [abierto, setAbierto] = useState(null)

  const cargar = useCallback(async () => {
    setError(null)
    try {
      const res = await buzonApi.listar()
      setData(res)
      avisarConteo(res.no_leidos)
    } catch (err) {
      setError(err)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const abrir = async (m) => {
    setAbierto((a) => (a === m.id ? null : m.id))
    if (m.leido) return
    setData((d) => ({ ...d, no_leidos: Math.max(0, d.no_leidos - 1), mensajes: d.mensajes.map((x) => (x.id === m.id ? { ...x, leido: true } : x)) }))
    try {
      const res = await buzonApi.leer(m.id)
      avisarConteo(res.no_leidos)
    } catch {
      /* se marcará al recargar */
    }
  }

  const leerTodos = async () => {
    await buzonApi.leerTodos()
    setData((d) => ({ ...d, no_leidos: 0, mensajes: d.mensajes.map((x) => ({ ...x, leido: true })) }))
    avisarConteo(0)
  }

  if (error) return <ErrorState error={error} retry={cargar} />
  if (!data) return <Loading />

  return (
    <section className="page-stack buzon">
      <div className="buzon-head">
        <div>
          <h1>Buzón</h1>
          <p className="muted">{data.no_leidos ? `${data.no_leidos} sin leer` : 'Todo leído'}</p>
        </div>
        {data.no_leidos > 0 && (
          <button type="button" className="btn-secondary btn-sm" onClick={leerTodos}>
            <CheckCheck size={15} /> Marcar todo como leído
          </button>
        )}
      </div>

      {data.mensajes.length === 0 ? (
        <Empty>
          <Inbox size={34} />
          <span>No tienes mensajes.</span>
        </Empty>
      ) : (
        <ul className="buzon-lista">
          {data.mensajes.map((m) => {
            const Icon = ICONOS[m.tipo] || Megaphone
            const open = abierto === m.id
            return (
              <li key={m.id} className={`buzon-item ${m.leido ? '' : 'nuevo'} ${open ? 'open' : ''}`}>
                <button type="button" className="buzon-fila" onClick={() => abrir(m)} aria-expanded={open}>
                  <span className={`buzon-icono tipo-${m.tipo}`}>
                    <Icon size={17} />
                  </span>
                  <span className="buzon-texto">
                    <strong>{m.titulo}</strong>
                    <small>
                      {m.tipo_nombre} · {fecha(m.creado_en)}
                    </small>
                  </span>
                  {!m.leido && <span className="buzon-punto" aria-label="Sin leer" />}
                </button>
                {open && <p className="buzon-cuerpo">{m.cuerpo}</p>}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
