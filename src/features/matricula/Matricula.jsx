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
  const [periodos, setPeriodos] = useState([])
  const [selectedPeriodo, setSelectedPeriodo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingPlan, setSavingPlan] = useState(false)

  // Cargar periodos académicos (2026-1 y 2026-2)
  useEffect(() => {
    let mounted = true
    matriculaApi
      .periodos()
      .then((data) => {
        if (!mounted) return
        const pList = data.periodos || []
        setPeriodos(pList)
        // Por defecto seleccionar 2026-1 si existe, o el primero
        const p2026_1 = pList.find((p) => p.cod_per_acad === '2026-1') || pList[0] || {
          id_periodo: 1,
          cod_per_acad: '2026-1',
          estado: 'en_curso',
        }
        setSelectedPeriodo(p2026_1)
      })
      .catch(() => {
        if (mounted) {
          const fallback = { id_periodo: 1, cod_per_acad: '2026-1', estado: 'en_curso' }
          setPeriodos([fallback, { id_periodo: 2, cod_per_acad: '2026-2', estado: 'en_curso' }])
          setSelectedPeriodo(fallback)
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  // Paso 1: Configuración seleccionada (Período 2026-1/2, Plan 2010/2019, Ciclo 1..10)
  const handleSelectConfig = async (periodoCod, planId, cicloId) => {
    // Buscar objeto del período seleccionado
    const foundPeriodo = periodos.find((p) => p.cod_per_acad === periodoCod) || {
      id_periodo: periodoCod === '2026-2' ? 2 : 1,
      cod_per_acad: periodoCod,
      estado: 'en_curso',
    }
    setSelectedPeriodo(foundPeriodo)
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

    // Avanzar al paso 2: Información de Matrícula (Imagen 2)
    setStep('info')
  }

  // Paso 2: Avanzar al paso 3 (Registro de Matrícula - Imágenes 1, 3 y 4)
  const handleIniciarMatricula = () => {
    setStep('registro')
  }

  if (loading) return <Loading />

  return (
    <div className="matricula-flow-wrapper">
      {step === 'select-plan-ciclo' && (
        <PlanCicloSelector
          alumno={alumno}
          periodos={periodos}
          selectedPeriodo={selectedPeriodo}
          onSelectConfig={handleSelectConfig}
          saving={savingPlan}
        />
      )}

      {step === 'info' && (
        <InfoMatricula
          periodo={selectedPeriodo}
          onIniciar={handleIniciarMatricula}
          onCambiarConfig={() => setStep('select-plan-ciclo')}
        />
      )}

      {step === 'registro' && (
        <RegistroMatricula
          alumno={alumno}
          periodo={selectedPeriodo}
          selectedPlanId={selectedPlanId}
          selectedCicloId={selectedCicloId}
          onCambiarPlanCiclo={() => setStep('select-plan-ciclo')}
        />
      )}
    </div>
  )
}
