import { useState } from 'react'

export default function PlanCicloSelector({ alumno, onSelectPlanCiclo, saving }) {
  const [selectedPlan, setSelectedPlan] = useState(alumno?.id_plan || 2)
  const [selectedCiclo, setSelectedCiclo] = useState(1)

  const planes = [
    {
      id: 2,
      nombre: 'Malla Curricular Vigente 2019',
      codigo: 'Plan 2019',
      resolucion: 'Resolución R. N° 6245-2019-CU-UNFV',
      descripcion: 'Plan de estudios vigente por competencias con 82 asignaturas.',
      vigente: true,
    },
    {
      id: 1,
      nombre: 'Plan Curricular 2010',
      codigo: 'Plan 2010',
      resolucion: 'Resolución R. N° 4512-2010-CU-UNFV',
      descripcion: 'Plan tradicional de Ingeniería de Sistemas con 62 asignaturas.',
      vigente: false,
    },
  ]

  const anos = [
    { ano: '1° Año', ciclos: [{ num: 1, label: 'Ciclo I' }, { num: 2, label: 'Ciclo II' }] },
    { ano: '2° Año', ciclos: [{ num: 3, label: 'Ciclo III' }, { num: 4, label: 'Ciclo IV' }] },
    { ano: '3° Año', ciclos: [{ num: 5, label: 'Ciclo V' }, { num: 6, label: 'Ciclo VI' }] },
    { ano: '4° Año', ciclos: [{ num: 7, label: 'Ciclo VII' }, { num: 8, label: 'Ciclo VIII' }] },
    { ano: '5° Año', ciclos: [{ num: 9, label: 'Ciclo IX' }, { num: 10, label: 'Ciclo X' }] },
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    onSelectPlanCiclo(selectedPlan, selectedCiclo)
  }

  return (
    <div className="selector-page-container">
      <div className="selector-card">
        <div className="selector-header">
          <span className="selector-badge">Módulo de Matrícula Vía Web</span>
          <h2>Configuración de Matrícula</h2>
          <p>
            Bienvenido(a), <strong>{alumno?.nombres} {alumno?.apellidos}</strong>. Por favor, selecciona el plan curricular y el semestre académico en el que vas a realizar tu matrícula.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="selector-form">
          {/* 1. Selección del Plan Curricular */}
          <div className="selector-section">
            <h3 className="section-subtitle">
              <span className="step-number">1</span> Selecciona el Plan Curricular
            </h3>
            <div className="plan-options-grid">
              {planes.map((plan) => {
                const isSelected = selectedPlan === plan.id
                return (
                  <div
                    key={plan.id}
                    className={`plan-option-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    <div className="plan-card-top">
                      <span className={`plan-tag ${plan.vigente ? 'tag-vigente' : 'tag-historico'}`}>
                        {plan.vigente ? 'Vigente' : 'Plan Anterior'}
                      </span>
                      <input
                        type="radio"
                        name="plan"
                        value={plan.id}
                        checked={isSelected}
                        onChange={() => setSelectedPlan(plan.id)}
                      />
                    </div>
                    <h4 className="plan-card-title">{plan.nombre}</h4>
                    <p className="plan-card-res">{plan.resolucion}</p>
                    <p className="plan-card-desc">{plan.descripcion}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 2. Selección de Semestre / Ciclo (1 al 10 - 5 Años) */}
          <div className="selector-section">
            <h3 className="section-subtitle">
              <span className="step-number">2</span> Selecciona tu Semestre / Ciclo Académico (5 Años · 10 Ciclos)
            </h3>
            <div className="ciclos-years-grid">
              {anos.map(({ ano, ciclos }) => (
                <div key={ano} className="ano-group">
                  <span className="ano-label">{ano}</span>
                  <div className="ano-buttons">
                    {ciclos.map(({ num, label }) => {
                      const isCicloSelected = selectedCiclo === num
                      return (
                        <button
                          key={num}
                          type="button"
                          className={`ciclo-btn ${isCicloSelected ? 'active' : ''}`}
                          onClick={() => setSelectedCiclo(num)}
                        >
                          <strong>{label}</strong>
                          <small>Semestre {num}</small>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="ciclo-helper-text">
              Has seleccionado: <strong>Ciclo {selectedCiclo}</strong> ({Math.ceil(selectedCiclo / 2)}° Año de carrera). Podrás ver asignaturas de este ciclo y cursos habilitados.
            </div>
          </div>

          {/* Botón de acción */}
          <div className="selector-actions">
            <button type="submit" className="btn-continue-matricula" disabled={saving}>
              {saving ? 'Cargando plan…' : 'Continuar a Información de Matrícula ➔'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
