import { useCallback, useEffect, useState } from 'react'
import { matriculaApi } from '../../api/client'
import { ErrorState, Loading } from '../../components/AsyncState'
import { esPeriodoImpar } from '../../utils/academico'
import InfoMatricula from './InfoMatricula'
import PlanCicloSelector from './PlanCicloSelector'
import RegistroMatricula from './RegistroMatricula'

export default function Matricula({ alumno }) {
  // Pasos: 'select' -> 'info' -> 'registro'
  const [step, setStep] = useState('select')
  const [periodos, setPeriodos] = useState(null)
  const [error, setError] = useState(null)
  const [periodo, setPeriodo] = useState(null)
  const [ciclo, setCiclo] = useState(1)

  const [cicloActual, setCicloActual] = useState(1)

  const load = useCallback(() => {
    setError(null)
    Promise.all([matriculaApi.periodos(), matriculaApi.malla(alumno.cod_alumno)])
      .then(([data, malla]) => {
        const list = data.periodos || []
        setPeriodos(list)
        const actual = malla.ciclo_actual || 1
        setCicloActual(actual)
        const abierto = list.find((p) => p.matricula_abierta ?? p.estado === 'en_curso') || list[0] || null
        setPeriodo(abierto)
        if (abierto) {
          // Ciclo sugerido: el nivel del alumno, ajustado a la paridad del período
          const impar = esPeriodoImpar(abierto.cod_per_acad)
          setCiclo(impar === (actual % 2 === 1) ? actual : Math.min(10, actual + 1))
        }
      })
      .catch(setError)
  }, [alumno.cod_alumno])
  useEffect(load, [load])

  if (error) return <ErrorState error={error} retry={load} />
  if (!periodos) return <Loading />
  if (periodos.length === 0) return <div className="state">No hay períodos académicos configurados.</div>

  return (
    <div className="matricula-flow-wrapper">
      {step === 'select' && (
        <PlanCicloSelector
          alumno={alumno}
          periodos={periodos}
          periodo={periodo}
          ciclo={ciclo}
          cicloActual={cicloActual}
          onConfirm={(p, c) => {
            setPeriodo(p)
            setCiclo(c)
            setStep('info')
          }}
        />
      )}
      {step === 'info' && <InfoMatricula periodo={periodo} onIniciar={() => setStep('registro')} onCambiarConfig={() => setStep('select')} />}
      {step === 'registro' && (
        <RegistroMatricula alumno={alumno} periodo={periodo} ciclo={ciclo} onCambiarCiclo={() => setStep('select')} />
      )}
    </div>
  )
}
