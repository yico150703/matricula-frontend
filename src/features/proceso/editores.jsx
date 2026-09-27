import { Plus, Send, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { procesoApi } from '../../api/client'
import Modal from '../../components/Modal'
import { DIAS_LARGOS, horarioCorto } from '../../utils/academico'

export const TIPOS = {
  horario: 'Horario (días y horas)',
  docente: 'Docente asignado',
  aula: 'Aula / laboratorio'
}
export const ROL_NOMBRE = {
  jefe: 'Jefe de Departamento',
  director: 'Director de Escuela',
  asistente: 'Asistente de Escuela',
  docente: 'Docente',
  admin: 'Administrador'
}

export const sesionesIniciales = (s) =>
  (s?.sesiones?.length ? s.sesiones : [{ dia: 1, hora_inicio: '08:00', hora_fin: '09:40' }]).map((x) => ({
    dia: x.dia,
    hora_inicio: x.hora_inicio,
    hora_fin: x.hora_fin
  }))

/** Editor de sesiones semanales (día + hora de inicio y fin). */
export function SesionesEditor({ value, onChange }) {
  const set = (i, k, v) => onChange(value.map((s, j) => (j === i ? { ...s, [k]: k === 'dia' ? Number(v) : v } : s)))
  return (
    <div className="sesiones-editor">
      {value.map((s, i) => (
        <div className="sesion-row" key={i}>
          <select value={s.dia} onChange={(e) => set(i, 'dia', e.target.value)} aria-label="Día">
            {[1, 2, 3, 4, 5, 6].map((d) => (
              <option key={d} value={d}>
                {DIAS_LARGOS[d]}
              </option>
            ))}
          </select>
          <input
            type="time"
            min="07:00"
            max="22:30"
            step="600"
            value={s.hora_inicio}
            onChange={(e) => set(i, 'hora_inicio', e.target.value)}
            aria-label="Inicio"
          />
          <span>a</span>
          <input type="time" min="07:00" max="22:30" step="600" value={s.hora_fin} onChange={(e) => set(i, 'hora_fin', e.target.value)} aria-label="Fin" />
          <button
            type="button"
            className="icon-btn"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            disabled={value.length === 1}
            aria-label="Quitar día"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      {value.length < 4 && (
        <button type="button" className="btn-secondary btn-sm" onClick={() => onChange([...value, { dia: 3, hora_inicio: '08:00', hora_fin: '09:40' }])}>
          <Plus size={14} /> Agregar día
        </button>
      )}
    </div>
  )
}

export function PropuestaEditor({ tipo, value, onChange, docentes = [], aulas = [] }) {
  if (tipo === 'horario') return <SesionesEditor value={value.sesiones} onChange={(sesiones) => onChange({ ...value, sesiones })} />
  if (tipo === 'docente')
    return (
      <select className="select-input" value={value.id_docente || ''} onChange={(e) => onChange({ ...value, id_docente: Number(e.target.value) })}>
        <option value="">— Elige el docente —</option>
        {docentes.map((d) => (
          <option key={d.id_admin} value={d.id_admin}>
            {d.nombre_docente} ({d.horas?.toFixed ? d.horas.toFixed(1) : 0} h asignadas)
          </option>
        ))}
      </select>
    )
  return <AulaSelect value={value.aula || ''} aulas={aulas} onChange={(aula) => onChange({ ...value, aula })} />
}

export function AulaSelect({ value, aulas, onChange, disabled, placeholder = '— Asignar aula —' }) {
  const opciones = [...new Set([...aulas, ...(value && value !== 'POR ASIGNAR' ? [value] : [])])]
  return (
    <select className="select-input aula-select" value={value === 'POR ASIGNAR' ? '' : value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      <option value="">{placeholder}</option>
      {opciones.map((a) => (
        <option key={a} value={a}>
          {a.startsWith('LAB') ? a.replace('LAB ', 'Laboratorio ') : `Pabellón ${a.split('-')[0]} · Aula ${a.split('-')[1]}`}
        </option>
      ))}
    </select>
  )
}

/** Pedido de cambio: el docente reporta un problema; jefe/director/asistente proponen cambios fuera de su fase. */
export function SolicitudModal({ rol, idPeriodo, seccion, docentes, aulas, onClose, onDone }) {
  const tipoFijo = { jefe: 'horario', director: 'docente', asistente: 'aula' }[rol]
  const [tipo, setTipo] = useState(tipoFijo || 'horario')
  const [descripcion, setDescripcion] = useState('')
  const [conPropuesta, setConPropuesta] = useState(Boolean(tipoFijo))
  const [propuesta, setPropuesta] = useState({
    sesiones: sesionesIniciales(seccion),
    id_docente: '',
    aula: ''
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const destino =
    rol === 'docente' ? { horario: 'jefe', docente: 'director', aula: 'asistente' }[tipo] : { jefe: 'director', director: 'jefe', asistente: 'director' }[rol]

  const enviar = async () => {
    setSaving(true)
    setError('')
    try {
      const prop = !conPropuesta
        ? null
        : tipo === 'horario'
          ? { sesiones: propuesta.sesiones }
          : tipo === 'docente'
            ? { id_docente: propuesta.id_docente }
            : { aula: propuesta.aula }
      await procesoApi.crearSolicitud(idPeriodo, {
        id_seccion: seccion.id_seccion,
        tipo,
        descripcion,
        propuesta: prop
      })
      onDone?.()
    } catch (err) {
      setError(err.detail)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={rol === 'docente' ? 'Reportar un problema con mi horario' : 'Solicitar cambio'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={enviar} disabled={saving}>
            <Send size={15} /> {saving ? 'Enviando…' : `Enviar a ${ROL_NOMBRE[destino]}`}
          </button>
        </>
      }
    >
      <div className="form-grid one">
        <div className="info-strip">
          {seccion.curso?.nombre_curso} · Sección {seccion.cod_seccion} · {horarioCorto(seccion)} · {seccion.docente} · {seccion.ubicacion?.texto}
        </div>
        {!tipoFijo && (
          <label className="field">
            ¿Qué necesitas cambiar?
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {Object.entries(TIPOS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          Motivo
          <textarea rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Explica el problema o el motivo del cambio" />
        </label>
        {!tipoFijo && (
          <label className="check-inline">
            <input type="checkbox" checked={conPropuesta} onChange={(e) => setConPropuesta(e.target.checked)} /> Proponer una alternativa
          </label>
        )}
        {conPropuesta && (
          <div className="field">
            Cambio propuesto
            <PropuestaEditor tipo={tipo} value={propuesta} onChange={setPropuesta} docentes={docentes} aulas={aulas} />
          </div>
        )}
        <p className="muted small">La solicitud llegará a: {ROL_NOMBRE[destino]}. El cambio se aplica solo cuando lo acepte.</p>
        {error && <p className="form-error">{error}</p>}
      </div>
    </Modal>
  )
}
