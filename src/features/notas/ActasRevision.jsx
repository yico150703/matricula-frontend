import { CheckCircle2, Eye, FileText, RotateCcw, XCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { notasApi } from '../../api/client'
import { Empty, ErrorState, Loading } from '../../components/AsyncState'
import Modal from '../../components/Modal'
import { formatoNota, formatoParcial, romano, TURNOS } from '../../utils/academico'
import { PeriodoSelect, usePeriodoConsulta } from '../proceso/ProcesoContext'
import { abrirPdfActa, CAMPOS_NOTA, EstadoActa } from './comun'
import { Mensaje } from '../../components/Aviso'

const PESTANAS = [
  ['enviada', 'Por revisar'],
  ['observada', 'Observadas'],
  ['aprobada', 'Aprobadas'],
  ['pendientes', 'Sin enviar'],
  ['todas', 'Todas']
]
const fecha = (iso) => (iso ? new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : '—')

export default function ActasRevision({ soloLectura = false }) {
  const { periodoId, opciones, elegir, cargado } = usePeriodoConsulta()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState(soloLectura ? 'todas' : 'enviada')
  const [abierta, setAbierta] = useState(null)
  const [msg, setMsg] = useState(null)

  const cargar = useCallback(async () => {
    if (!periodoId) return
    setError(null)
    try {
      setData(await notasApi.actas(periodoId))
    } catch (err) {
      setError(err)
    }
  }, [periodoId])
  useEffect(() => {
    setData(null)
    cargar()
  }, [cargar])

  if (cargado && opciones.length === 0) return <Empty>Aún no hay períodos con horarios establecidos.</Empty>
  if (!cargado) return <Loading />
  if (error) return <ErrorState error={error} retry={cargar} />
  if (!data) return <Loading />

  const r = data.resumen
  const filtradas = data.actas.filter((a) =>
    tab === 'todas' ? true : tab === 'pendientes' ? ['sin_acta', 'borrador'].includes(a.acta.estado) : a.acta.estado === tab
  )
  const conteo = { enviada: r.enviada, observada: r.observada, aprobada: r.aprobada, pendientes: r.sin_acta + r.borrador, todas: data.actas.length }
  const conAlumnos = data.actas.length - (r.sin_alumnos || 0)
  const avance = conAlumnos ? Math.round((r.aprobada / conAlumnos) * 100) : 0

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <p className="eyebrow">Período {data.periodo.cod_per_acad} · {soloLectura ? 'Supervisión' : 'Dirección de Escuela'}</p>
          <h1>{soloLectura ? 'Seguimiento de notas' : 'Actas de notas'}</h1>
          <p className="muted">
            {soloLectura
              ? 'Avance de las actas de notas de cada salón: los docentes las registran y el Director de Escuela las aprueba.'
              : 'Revisa las actas que envían los docentes. Al aprobar, las notas pasan al registro académico de cada alumno.'}
          </p>
        </div>
        <div className="toolbar">
          <PeriodoSelect periodoId={periodoId} opciones={opciones} onChange={elegir} />
          <div className="hero-stats">
            <span className={r.enviada ? 'warn' : ''}>
              <b>{r.enviada}</b> por revisar
            </span>
            <span>
              <b>{avance}%</b> aprobadas
            </span>
          </div>
        </div>
      </div>

      <div className="avance-actas" role="img" aria-label={`${r.aprobada} aprobadas, ${r.enviada} por revisar, ${r.observada} observadas, ${r.sin_acta + r.borrador} sin enviar`}>
        {[
          ['aprobada', r.aprobada],
          ['enviada', r.enviada],
          ['observada', r.observada],
          ['pendiente', r.sin_acta + r.borrador]
        ].map(([k, n]) => (n ? <i key={k} className={`seg-${k}`} style={{ flex: n }} title={`${n}`} /> : null))}
      </div>

      <Mensaje msg={msg} />

      <div className="tabs">
        {PESTANAS.map(([k, label]) => (
          <button key={k} type="button" className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
            {label} <span className="tab-count">{conteo[k]}</span>
          </button>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <Empty>{tab === 'enviada' ? 'No hay actas por revisar. Aparecerán aquí cuando los docentes las envíen.' : 'No hay actas en este grupo.'}</Empty>
      ) : (
        <article className="panel-card">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Secc.</th>
                  <th>Docente</th>
                  <th className="center">Alumnos</th>
                  <th>Estado</th>
                  <th>Enviada</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtradas.map((a) => (
                  <tr key={a.id_seccion}>
                    <td>
                      <strong>{a.curso.nombre_curso}</strong>
                      <small className="muted block">
                        Ciclo {romano(a.curso.ciclo)} · {TURNOS[a.turno]}
                      </small>
                    </td>
                    <td>{a.cod_seccion}</td>
                    <td className="small">{a.docente}</td>
                    <td className="center">{a.alumnos}</td>
                    <td>
                      <EstadoActa estado={a.acta.estado} />
                    </td>
                    <td className="small">{fecha(a.acta.enviado_en)}</td>
                    <td className="right">
                      {a.acta.id && (
                        <button type="button" className={a.acta.estado === 'enviada' && !soloLectura ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'} onClick={() => setAbierta(a.acta.id)}>
                          <Eye size={14} /> {a.acta.estado === 'enviada' && !soloLectura ? 'Revisar' : 'Ver'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {abierta && (
        <ActaModal
          idActa={abierta}
          soloLectura={soloLectura}
          onClose={() => setAbierta(null)}
          onDone={(texto) => {
            setAbierta(null)
            setMsg({ ok: true, text: texto })
            cargar()
          }}
        />
      )}
    </section>
  )
}

function ActaModal({ idActa, soloLectura, onClose, onDone }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [obs, setObs] = useState('')
  const [modo, setModo] = useState(null) // observar | reabrir
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    notasApi.acta(idActa).then(setData).catch(setError)
  }, [idActa])

  const revisar = async (accion) => {
    setBusy(true)
    setError(null)
    try {
      await notasApi.revisar(idActa, accion, obs)
      onDone(
        accion === 'aprobar'
          ? 'Acta aprobada: las notas ya están en el registro de los alumnos.'
          : accion === 'observar'
            ? 'Acta devuelta al docente con tu observación.'
            : 'Acta reabierta: el docente puede corregir las notas y volver a enviarla.'
      )
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  const s = data?.seccion
  const estado = data?.acta.estado
  const footer = data && !soloLectura && (
    <>
      {estado === 'enviada' && !modo && (
        <>
          <button type="button" className="btn-secondary" onClick={() => setModo('observar')} disabled={busy}>
            <XCircle size={16} /> Observar
          </button>
          <button type="button" className="btn-primary" onClick={() => revisar('aprobar')} disabled={busy}>
            <CheckCircle2 size={16} /> Aprobar y pasar al sistema
          </button>
        </>
      )}
      {estado === 'aprobada' && !modo && (
        <button type="button" className="btn-secondary" onClick={() => setModo('reabrir')} disabled={busy}>
          <RotateCcw size={16} /> Reabrir para corregir
        </button>
      )}
      {modo && (
        <>
          <button type="button" className="btn-secondary" onClick={() => setModo(null)} disabled={busy}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={() => revisar(modo)} disabled={busy || obs.trim().length < 5}>
            {modo === 'observar' ? 'Devolver al docente' : 'Reabrir acta'}
          </button>
        </>
      )}
    </>
  )

  return (
    <Modal title={s ? `${s.curso.nombre_curso} · Sección ${s.cod_seccion}` : 'Acta de notas'} onClose={onClose} size="lg" footer={footer}>
      {error && <p className="form-error">{error.detail}</p>}
      {!data ? (
        !error && <Loading />
      ) : (
        <div className="acta-detalle">
          <div className="acta-meta">
            <span>
              Docente: <b>{s.docente}</b>
            </span>
            <span>
              Enviada: <b>{fecha(data.acta.enviado_en)}</b>
            </span>
            <EstadoActa estado={estado} />
            {data.acta.tiene_pdf && (
              <button type="button" className="btn-secondary btn-sm" onClick={() => abrirPdfActa(idActa).catch((e) => setError(e))}>
                <FileText size={14} /> Ver acta firmada (PDF)
              </button>
            )}
          </div>
          {data.acta.observacion && (
            <p className="form-notice">
              <strong>Última observación:</strong> {data.acta.observacion}
            </p>
          )}
          <div className="table-scroll">
            <table className="data-table notas-table">
              <thead>
                <tr>
                  <th>Alumno</th>
                  {CAMPOS_NOTA.map(([k, l]) => (
                    <th key={k} className="center">
                      {l}
                    </th>
                  ))}
                  <th className="center">Final</th>
                </tr>
              </thead>
              <tbody>
                {data.alumnos.map((a) => (
                  <tr key={a.cod_alumno}>
                    <td>
                      {a.apellidos}, {a.nombres}
                      <small className="muted block">{a.cod_alumno}</small>
                    </td>
                    {CAMPOS_NOTA.map(([k]) => (
                      <td key={k} className="center">
                        {formatoParcial(a.notas[k])}
                      </td>
                    ))}
                    <td className="center">
                      <span className={`nota-final ${a.nota_final === null ? '' : a.aprobado ? 'aprobado' : 'desaprobado'}`}>
                        {a.nota_final === null ? '—' : formatoNota(a.nota_final)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">
            {data.alumnos.filter((a) => a.aprobado).length} aprobados · {data.alumnos.filter((a) => a.nota_final !== null && !a.aprobado).length} desaprobados ·
            nota mínima {data.nota_minima}
          </p>
          {modo && (
            <label className="field">
              {modo === 'observar' ? '¿Qué debe corregir el docente?' : 'Motivo de la corrección'}
              <textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ej.: Revisar la N3 de los alumnos de la fila 4 y 7" />
            </label>
          )}
          {data.acta.historial?.length > 0 && (
            <details className="acta-historial">
              <summary>Historial ({data.acta.historial.length})</summary>
              <ul>
                {data.acta.historial
                  .slice()
                  .reverse()
                  .map((h, i) => (
                    <li key={i}>
                      <small>{fecha(h.fecha)}</small> · {h.usuario}: {h.accion}
                    </li>
                  ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </Modal>
  )
}
