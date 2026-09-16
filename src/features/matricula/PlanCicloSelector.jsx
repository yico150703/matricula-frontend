import { useState } from 'react'

export default function PlanCicloSelector({
  alumno,
  periodos = [],
  selectedPeriodo,
  onSelectConfig,
  saving,
}) {
  // Periodos 2026-1 y 2026-2
  const [selectedPeriodoCod, setSelectedPeriodoCod] = useState(
    selectedPeriodo?.cod_per_acad || '2026-1'
  )
  const [selectedPlan, setSelectedPlan] = useState(alumno?.id_plan || 2)

  // Determinar ciclo inicial según el período (impar para 2026-1, par para 2026-2)
  const isPeriodoImpar = selectedPeriodoCod === '2026-1'
  const [selectedCiclo, setSelectedCiclo] = useState(isPeriodoImpar ? 1 : 2)

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
    {
      ano: '1° Año',
      ciclos: [
        { num: 1, label: 'Ciclo I', impar: true },
        { num: 2, label: 'Ciclo II', impar: false },
      ],
    },
    {
      ano: '2° Año',
      ciclos: [
        { num: 3, label: 'Ciclo III', impar: true },
        { num: 4, label: 'Ciclo IV', impar: false },
      ],
    },
    {
      ano: '3° Año',
      ciclos: [
        { num: 5, label: 'Ciclo V', impar: true },
        { num: 6, label: 'Ciclo VI', impar: false },
      ],
    },
    {
      ano: '4° Año',
      ciclos: [
        { num: 7, label: 'Ciclo VII', impar: true },
        { num: 8, label: 'Ciclo VIII', impar: false },
      ],
    },
    {
      ano: '5° Año',
      ciclos: [
        { num: 9, label: 'Ciclo IX', impar: true },
        { num: 10, label: 'Ciclo X', impar: false },
      ],
    },
  ]

  const handlePeriodoChange = (cod) => {
    setSelectedPeriodoCod(cod)
    if (cod === '2026-1') {
      setSelectedCiclo(1)
    } else {
      setSelectedCiclo(2)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSelectConfig(selectedPeriodoCod, selectedPlan, selectedCiclo)
  }

  return (
    <div className="selector-page-container">
      <div className="selector-card">
        <div className="selector-header">
          <span className="selector-badge">FIIS · Matrícula Vía Web</span>
          <h2>Configuración de Matrícula</h2>
          <p>
            Bienvenido(a), <strong>{alumno?.nombres} {alumno?.apellidos}</strong>. Selecciona el período académico, el plan curricular y el semestre correspondiente.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="selector-form">
          {/* 1. Selección del Período Académico (2026-1 o 2026-2) */}
          <div className="selector-section">
            <h3 className="section-subtitle">
              <span className="step-number">1</span> Selecciona el Período Académico
            </h3>
            <div className="periodos-grid-selector">
              <div
                className={`periodo-card ${selectedPeriodoCod === '2026-1' ? 'selected' : ''}`}
                onClick={() => handlePeriodoChange('2026-1')}
              >
                <div className="periodo-tag-badge">Semestre Impar</div>
                <h4>Período 2026 - 1</h4>
                <p>Ciclos correspondientes: <strong>1, 3, 5, 7, 9</strong> (Ciclos Impares)</p>
                <small>Marzo 2026 – Julio 2026</small>
              </div>

              <div
                className={`periodo-card ${selectedPeriodoCod === '2026-2' ? 'selected' : ''}`}
                onClick={() => handlePeriodoChange('2026-2')}
              >
                <div className="periodo-tag-badge">Semestre Par</div>
                <h4>Período 2026 - 2</h4>
                <p>Ciclos correspondientes: <strong>2, 4, 6, 8, 10</strong> (Ciclos Pares)</p>
                <small>Agosto 2026 – Diciembre 2026</small>
              </div>
            </div>
          </div>

          {/* 2. Selección del Plan Curricular */}
          <div className="selector-section">
            <h3 className="section-subtitle">
              <span className="step-number">2</span> Selecciona el Plan Curricular
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

          {/* 3. Selección de Semestre / Ciclo (1 al 10 - 5 Años) */}
          <div className="selector-section">
            <h3 className="section-subtitle">
              <span className="step-number">3</span> Selecciona tu Semestre / Ciclo Académico (5 Años · 10 Ciclos)
            </h3>
            <p className="ciclo-regla-note">
              {selectedPeriodoCod === '2026-1' ? (
                <>💡 En el período <strong>2026-1</strong> corresponden los <strong>ciclos impares (1, 3, 5, 7, 9)</strong>.</>
              ) : (
                <>💡 En el período <strong>2026-2</strong> corresponden los <strong>ciclos pares (2, 4, 6, 8, 10)</strong>.</>
              )}
            </p>

            <div className="ciclos-years-grid">
              {anos.map(({ ano, ciclos }) => (
                <div key={ano} className="ano-group">
                  <span className="ano-label">{ano}</span>
                  <div className="ano-buttons">
                    {ciclos.map(({ num, label, impar }) => {
                      const isCicloSelected = selectedCiclo === num
                      const isRecommended = selectedPeriodoCod === '2026-1' ? impar : !impar
                      return (
                        <button
                          key={num}
                          type="button"
                          className={`ciclo-btn ${isCicloSelected ? 'active' : ''} ${isRecommended ? 'recommended' : 'dimmed'}`}
                          onClick={() => setSelectedCiclo(num)}
                        >
                          <strong>{label}</strong>
                          <small>Semestre {num} {isRecommended ? '★' : ''}</small>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="ciclo-helper-text">
              Has seleccionado: <strong>Ciclo {selectedCiclo}</strong> ({Math.ceil(selectedCiclo / 2)}° Año de carrera) para el <strong>Período {selectedPeriodoCod}</strong>.
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
