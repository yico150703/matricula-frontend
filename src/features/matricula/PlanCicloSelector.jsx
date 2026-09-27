import { ArrowRight, CalendarRange, GraduationCap } from 'lucide-react'
import { useState } from 'react'
import { esPeriodoImpar, planPorId, romano } from '../../utils/academico'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const mesAnio = (iso) => {
  const [y, m] = String(iso || '').split('-')
  return y && m ? `${MESES[Number(m) - 1]} ${y}` : ''
}

export default function PlanCicloSelector({ alumno, periodos, periodo, ciclo, cicloActual, onConfirm }) {
  const [selPeriodo, setSelPeriodo] = useState(periodo)
  const [selCiclo, setSelCiclo] = useState(ciclo)
  const plan = planPorId(alumno?.id_plan)
  const impar = esPeriodoImpar(selPeriodo?.cod_per_acad)
  const ciclos = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((n) => (impar ? n % 2 === 1 : n % 2 === 0))

  const choosePeriodo = (p) => {
    if (!(p.matricula_abierta ?? p.estado === 'en_curso')) return
    setSelPeriodo(p)
    const nuevoImpar = esPeriodoImpar(p.cod_per_acad)
    setSelCiclo((prev) => {
      if (nuevoImpar === (prev % 2 === 1)) return prev
      return nuevoImpar ? Math.max(1, prev - 1) : Math.min(10, prev + 1)
    })
  }

  const submit = (e) => {
    e.preventDefault()
    if (selPeriodo) onConfirm(selPeriodo, selCiclo)
  }

  const hayAbiertos = periodos.some((p) => p.matricula_abierta ?? p.estado === 'en_curso')

  return (
    <div className="selector-page-container">
      <div className="selector-card">
        <div className="selector-header">
          <span className="selector-badge">FIIS · Matrícula vía web</span>
          <h2>Configuración de matrícula</h2>
          <p>
            Bienvenido(a), <strong>
              {alumno?.nombres} {alumno?.apellidos}
            </strong>
            . Selecciona el período académico y el ciclo en el que te matricularás.
          </p>
        </div>

        <form onSubmit={submit} className="selector-form">
          <div className="selector-section">
            <h3 className="section-subtitle">
              <span className="step-number">1</span> <CalendarRange size={18} /> Período académico
            </h3>
            {!hayAbiertos && <p className="form-error">No hay períodos abiertos para matrícula en este momento.</p>}
            <div className="periodos-grid-selector">
              {periodos.map((p) => {
                const imp = esPeriodoImpar(p.cod_per_acad)
                const cerrado = !(p.matricula_abierta ?? p.estado === 'en_curso')
                return (
                  <button
                    type="button"
                    key={p.id_periodo}
                    className={`periodo-card ${selPeriodo?.id_periodo === p.id_periodo ? 'selected' : ''} ${cerrado ? 'is-closed' : ''}`}
                    onClick={() => choosePeriodo(p)}
                    disabled={cerrado}
                  >
                    <div className="periodo-tag-badge">
                      {cerrado ? (p.estado === 'programacion' ? 'Horarios en programación' : 'Cerrado') : imp ? 'Semestre impar' : 'Semestre par'}
                    </div>
                    <h4>Período {p.cod_per_acad}</h4>
                    <p>
                      Ciclos: <strong>{imp ? 'I, III, V, VII, IX' : 'II, IV, VI, VIII, X'}</strong>
                    </p>
                    <small>
                      {mesAnio(p.fecha_inicio)} – {mesAnio(p.fecha_fin)}
                    </small>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="selector-section">
            <h3 className="section-subtitle">
              <span className="step-number">2</span> <GraduationCap size={18} /> Tu plan curricular
            </h3>
            <div className="plan-option-card selected plan-fixed">
              <div className="plan-card-top">
                <span className={`plan-tag ${plan.vigente ? 'tag-vigente' : 'tag-historico'}`}>{plan.vigente ? 'Vigente' : 'Plan anterior'}</span>
                <span className="small muted">Asignado por la Oficina de Matrícula</span>
              </div>
              <h4 className="plan-card-title">{plan.nombre}</h4>
              <p className="plan-card-res">{plan.resolucion}</p>
            </div>
          </div>

          <div className="selector-section">
            <h3 className="section-subtitle">
              <span className="step-number">3</span> Ciclo académico ({impar ? 'ciclos impares' : 'ciclos pares'})
            </h3>
            <div className="ciclo-chip-row">
              {ciclos.map((n) => (
                <button key={n} type="button" className={`ciclo-btn ${selCiclo === n ? 'active' : ''}`} onClick={() => setSelCiclo(n)}>
                  <strong>Ciclo {romano(n)}</strong>
                  <small>{n === cicloActual ? 'Tu nivel actual' : `${Math.ceil(n / 2)}.º año`}</small>
                </button>
              ))}
            </div>
            <p className="muted small">
              En el siguiente paso también podrás agregar cursos de otros ciclos (por ejemplo, los que necesitas volver a llevar).
            </p>
            <div className="ciclo-helper-text">
              Seleccionaste: <strong>Ciclo {romano(selCiclo)}</strong> para el <strong>período {selPeriodo?.cod_per_acad}</strong>.
            </div>
          </div>

          <div className="selector-actions">
            <button type="submit" className="btn-continue-matricula" disabled={!selPeriodo || !(selPeriodo.matricula_abierta ?? selPeriodo.estado === 'en_curso')}>
              Continuar <ArrowRight size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
