import { ArrowLeft, FileDown, FileText, Save, Send, Upload } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { notasApi } from '../../api/client'
import { ErrorState, Loading } from '../../components/AsyncState'
import { formatoNota, romano, TURNOS } from '../../utils/academico'
import { abrirPdfActa, CAMPOS_NOTA, calcularNota, EstadoActa, notaValida } from './comun'

const aTexto = (v) => (v === null || v === undefined ? '' : String(v))

/** El docente registra N1, N2, N3, sustitutorio y aplazado de cada alumno, sube el acta firmada y la envía. */
export default function SalonNotas({ user }) {
  const { idSeccion } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [notas, setNotas] = useState({})
  const [cambios, setCambios] = useState(false)
  const [archivo, setArchivo] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const aplicar = (res) => {
    setData(res)
    setNotas(Object.fromEntries(res.alumnos.map((a) => [a.cod_alumno, Object.fromEntries(CAMPOS_NOTA.map(([k]) => [k, aTexto(a.notas[k])]))])))
    setCambios(false)
  }

  const cargar = useCallback(async () => {
    setError(null)
    try {
      aplicar(await notasApi.salon(idSeccion))
    } catch (err) {
      setError(err)
    }
  }, [idSeccion])
  useEffect(() => {
    cargar()
  }, [cargar])

  // Aviso al salir con notas sin guardar
  useEffect(() => {
    if (!cambios) return undefined
    const avisar = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [cambios])

  const editable = data && ['sin_acta', 'borrador', 'observada'].includes(data.acta.estado)
  const invalidas = useMemo(() => Object.values(notas).some((n) => Object.values(n).some((v) => !notaValida(v))), [notas])
  const calculadas = useMemo(() => Object.fromEntries(Object.entries(notas).map(([cod, n]) => [cod, calcularNota(n)])), [notas])
  const completas = Object.values(calculadas).filter((c) => c.final !== null).length

  const cambiar = (cod, campo, valor) => {
    if (valor !== '' && !/^\d{0,2}([.,]\d{0,2})?$/.test(valor)) return
    setNotas((prev) => ({ ...prev, [cod]: { ...prev[cod], [campo]: valor.replace(',', '.') } }))
    setCambios(true)
  }

  const payload = () =>
    Object.fromEntries(
      Object.entries(notas).map(([cod, n]) => [cod, Object.fromEntries(Object.entries(n).map(([k, v]) => [k, v === '' ? null : Number(v)]))])
    )

  const guardar = async () => {
    setBusy(true)
    setMsg(null)
    try {
      aplicar(await notasApi.guardar(idSeccion, payload()))
      setMsg({ ok: true, text: 'Notas guardadas como borrador. Aún no son oficiales: envía el acta al Director cuando termines.' })
    } catch (err) {
      setMsg({ ok: false, text: err.detail })
    } finally {
      setBusy(false)
    }
  }

  const enviar = async () => {
    setBusy(true)
    setMsg(null)
    try {
      if (cambios) await notasApi.guardar(idSeccion, payload())
      aplicar(await notasApi.enviar(idSeccion, archivo))
      setArchivo(null)
      setMsg({ ok: true, text: 'Acta enviada al Director de Escuela. Las notas pasarán al sistema cuando la apruebe.' })
    } catch (err) {
      setMsg({ ok: false, text: err.detail })
      await cargar().catch(() => {})
    } finally {
      setBusy(false)
    }
  }

  const imprimir = () => {
    const alumnos = data.alumnos.map((a) => {
      const n = payload()[a.cod_alumno] || {}
      const c = calculadas[a.cod_alumno] || {}
      return { ...a, notas: n, promedio: c.promedio, nota_final: c.final }
    })
    import('../../utils/generatePdf').then((m) =>
      m.descargarActaNotasPDF({
        seccion: data.seccion,
        periodo: data.periodo,
        alumnos,
        docente: `${user.apellidos || ''} ${user.nombres || ''}`.trim().toUpperCase(),
        notaMinima: data.nota_minima
      })
    )
  }

  if (error) return <ErrorState error={error} retry={cargar} />
  if (!data) return <Loading />
  const { seccion, acta } = data
  const puedeEnviar = editable && !invalidas && completas === data.alumnos.length && data.alumnos.length > 0 && (archivo || acta.tiene_pdf)

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <p className="eyebrow">
            <Link to="/docente/salones" className="hero-back">
              <ArrowLeft size={14} /> Mis salones
            </Link>{' '}
            · Período {data.periodo.cod_per_acad}
          </p>
          <h1>{seccion.curso.nombre_curso}</h1>
          <p className="muted">
            Ciclo {romano(seccion.curso.ciclo)} · Sección {seccion.cod_seccion} · {TURNOS[seccion.turno]} · {data.alumnos.length} alumnos
          </p>
        </div>
        <div className="hero-stats">
          <span>
            <b>{completas}</b>/{data.alumnos.length} con nota
          </span>
          <EstadoActa estado={acta.estado} />
        </div>
      </div>

      {acta.estado === 'observada' && acta.observacion && (
        <p className="form-error">
          <strong>El Director observó el acta:</strong> {acta.observacion}
        </p>
      )}
      {acta.estado === 'enviada' && <p className="form-notice">El acta está en revisión del Director de Escuela. No se puede editar mientras tanto.</p>}
      {acta.estado === 'aprobada' && <p className="form-success">Acta aprobada: estas notas ya son oficiales y los alumnos las ven en su historial.</p>}
      {msg && <p className={msg.ok ? 'form-success' : 'form-error'}>{msg.text}</p>}

      <article className="panel-card">
        <div className="table-scroll">
          <table className="data-table notas-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Alumno</th>
                {CAMPOS_NOTA.map(([k, label]) => (
                  <th key={k} className="center">
                    {label}
                  </th>
                ))}
                <th className="center">Prom.</th>
                <th className="center">Final</th>
              </tr>
            </thead>
            <tbody>
              {data.alumnos.map((a, i) => {
                const c = calculadas[a.cod_alumno] || {}
                const desaprobado = c.final !== null && c.final < data.nota_minima
                return (
                  <tr key={a.cod_alumno}>
                    <td>{i + 1}</td>
                    <td>
                      <strong>
                        {a.apellidos}, {a.nombres}
                      </strong>
                      <small className="muted block">{a.cod_alumno}</small>
                    </td>
                    {CAMPOS_NOTA.map(([k, label]) => {
                      const v = notas[a.cod_alumno]?.[k] ?? ''
                      return (
                        <td key={k} className="center">
                          <input
                            className={`nota-input ${notaValida(v) ? '' : 'invalida'}`}
                            inputMode="decimal"
                            value={v}
                            disabled={!editable || busy}
                            onChange={(e) => cambiar(a.cod_alumno, k, e.target.value)}
                            aria-label={`${label} de ${a.apellidos}, ${a.nombres}`}
                          />
                        </td>
                      )
                    })}
                    <td className="center">{c.promedio === null ? '—' : formatoNota(c.promedio)}</td>
                    <td className="center">
                      <span className={`nota-final ${c.final === null ? '' : desaprobado ? 'desaprobado' : 'aprobado'}`}>
                        {c.final === null ? '—' : formatoNota(c.final)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {invalidas && <p className="form-error">Las notas deben estar entre 0 y 20.</p>}
        <p className="muted small">
          Promedio de N1, N2 y N3 (el sustitutorio reemplaza a la nota más baja si es mayor); se redondea desde .5. Si hay aplazado, esa es la nota
          final. Nota mínima aprobatoria: {data.nota_minima}.
        </p>
      </article>

      <article className="panel-card acta-envio">
        <h3>
          <FileText size={18} /> Acta de notas
        </h3>
        <ol className="pasos-acta">
          <li>Guarda las notas y descarga el acta generada por el sistema.</li>
          <li>Imprímela, fírmala y escanéala en PDF (máx. 5 MB).</li>
          <li>Súbela y envíala: el Director de Escuela la revisará y aprobará.</li>
        </ol>
        <div className="toolbar wrap-sm">
          <button type="button" className="btn-secondary" onClick={guardar} disabled={!editable || busy || invalidas || !cambios}>
            <Save size={16} /> Guardar borrador
          </button>
          <button type="button" className="btn-secondary" onClick={imprimir} disabled={invalidas}>
            <FileDown size={16} /> Descargar acta para firmar
          </button>
          {acta.tiene_pdf && (
            <button type="button" className="btn-secondary" onClick={() => abrirPdfActa(acta.id).catch((e) => setMsg({ ok: false, text: e.detail }))}>
              <FileText size={16} /> Ver PDF subido
            </button>
          )}
        </div>
        {editable && (
          <div className="subir-acta">
            <label className="file-drop">
              <Upload size={18} />
              <span>{archivo ? archivo.name : acta.tiene_pdf ? `Reemplazar PDF (${acta.archivo_nombre})` : 'Seleccionar el acta firmada (PDF)'}</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null
                  if (f && f.size > 5 * 1024 * 1024) {
                    setMsg({ ok: false, text: 'El PDF no puede pesar más de 5 MB.' })
                    return
                  }
                  setArchivo(f)
                }}
              />
            </label>
            <button type="button" className="btn-primary" onClick={enviar} disabled={!puedeEnviar || busy}>
              <Send size={16} /> {busy ? 'Enviando…' : 'Enviar al Director de Escuela'}
            </button>
          </div>
        )}
        {editable && !puedeEnviar && (
          <p className="muted small">
            {completas < data.alumnos.length
              ? `Faltan notas de ${data.alumnos.length - completas} alumno(s) para poder enviar.`
              : !archivo && !acta.tiene_pdf
                ? 'Adjunta el acta firmada en PDF para poder enviarla.'
                : ''}
          </p>
        )}
      </article>
    </section>
  )
}
