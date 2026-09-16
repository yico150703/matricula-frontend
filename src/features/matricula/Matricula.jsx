import { useEffect, useState } from 'react'
import { alumnosApi, matriculaApi } from '../../api/client'
import { Loading } from '../../components/AsyncState'
import InfoMatricula from './InfoMatricula'
import PlanCicloSelector from './PlanCicloSelector'
import RegistroMatricula from './RegistroMatricula'

export default function Matricula({ alumno, onAlumnoUpdated }) {
  // Pasos: 'select-plan-ciclo' -> 'info' -> 'registro'
  const [step, setStep] = useState('select-plan-ciclo')
  const [selectedPlanId, setSelectedPlanId] = useState(alumno?.id_plan || 2)
  const [selectedCicloId, setSelectedCicloId] = useState(1)
  const [periodo, setPeriodo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingPlan, setSavingPlan] = useState(false)

  // Cargar el periodo académico activo (ej. 2024-2)
  useEffect(() => {
    let mounted = true
    matriculaApi
      .periodos()
      .then((data) => {
        if (!mounted) return
        const active =
          data.periodos?.find((p) => p.estado === 'en_curso') ||
          data.periodos?.[0] || {
            id_periodo: 1,
            cod_per_acad: '2024-2',
            estado: 'en_curso',
          }
        setPeriodo(active)
      })
      .catch(() => {
        if (mounted) {
          setPeriodo({ id_periodo: 1, cod_per_acad: '2024-2', estado: 'en_curso' })
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  // Paso 1: Cuando el usuario selecciona Plan (2010 / 2019) y Ciclo (1..10)
  const handleSelectPlanCiclo = async (planId, cicloId) => {
    setSelectedPlanId(planId)
    setSelectedCicloId(cicloId)

    // Actualizar el plan en el backend si difiere del actual
    if (alumno?.cod_alumno && alumno?.id_plan !== planId) {
      setSavingPlan(true)
      try {
        const res = await alumnosApi.cambiarPlan(alumno.cod_alumno, planId)
        if (onAlumnoUpdated) {
          onAlumnoUpdated(res.alumno)
        }
      } catch (err) {
        console.warn('No se pudo actualizar plan en backend:', err)
      } finally {
        setSavingPlan(false)
      }
    }

    // Avanzar a la pantalla de Información de Matrícula (Imagen 2)
    setStep('info')
  }

  // Paso 2: Desde Información de Matrícula (Imagen 2), hacer clic en "Iniciar Matrícula"
  const handleIniciarMatricula = () => {
    setStep('registro')
  }

  if (loading) return <Loading />

  return (
    <div className="matricula-flow-wrapper">
      {step === 'select-plan-ciclo' && (
        <PlanCicloSelector
          alumno={alumno}
          onSelectPlanCiclo={handleSelectPlanCiclo}
          saving={savingPlan}
        />
      )}

      {step === 'info' && (
        <InfoMatricula
          periodo={periodo}
          onIniciar={handleIniciarMatricula}
          onCambiarConfig={() => setStep('select-plan-ciclo')}
        />
      )}

      {step === 'registro' && (
        <RegistroMatricula
          alumno={alumno}
          periodo={periodo}
          selectedPlanId={selectedPlanId}
          selectedCicloId={selectedCicloId}
          onCambiarPlanCiclo={() => setStep('select-plan-ciclo')}
        />
      )}
    </div>
  )
}
