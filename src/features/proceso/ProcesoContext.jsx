import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { procesoApi } from '../../api/client'
import { Empty, ErrorState, Loading } from '../../components/AsyncState'

const Ctx = createContext(null)

/** Período seleccionado y estado del proceso de horarios, compartido por las pantallas del personal. */
export function ProcesoProvider({ children, rol }) {
  const [procesos, setProcesos] = useState(null)
  const [aulas, setAulas] = useState([])
  const [periodoId, setPeriodoId] = useState(() => {
    try {
      return Number(sessionStorage.getItem('proceso_periodo')) || null
    } catch {
      return null
    }
  })
  const [error, setError] = useState(null)

  const recargar = useCallback(async () => {
    try {
      const res = await procesoApi.periodos()
      setProcesos(res.procesos)
      setAulas(res.aulas || [])
      setError(null)
      setPeriodoId((actual) => {
        if (actual && res.procesos.some((p) => p.id_periodo === actual)) return actual
        // Por defecto: el período que se está programando (fases 1-4), luego matrícula/ajustes (5-6).
        // El docente ve primero donde ya tiene horario publicado (fases 4-6).
        const orden = rol === 'docente' ? (p) => (p.fase >= 4 && p.fase <= 6 ? 0 : p.fase === 7 ? 1 : 2) : (p) => (p.fase <= 4 ? 0 : p.fase <= 6 ? 1 : 2)
        const elegido = [...res.procesos].sort((a, b) => orden(a) - orden(b) || b.id_periodo - a.id_periodo)[0]
        return elegido?.id_periodo ?? null
      })
    } catch (err) {
      setError(err)
    }
  }, [rol])

  useEffect(() => {
    recargar()
  }, [recargar])

  const elegir = useCallback((id) => {
    setPeriodoId(id)
    try {
      sessionStorage.setItem('proceso_periodo', String(id))
    } catch {
      /* noop */
    }
  }, [])

  const value = useMemo(
    () => ({
      procesos,
      aulas,
      error,
      periodoId,
      proceso: procesos?.find((p) => p.id_periodo === periodoId) || null,
      elegir,
      recargar
    }),
    [procesos, aulas, error, periodoId, elegir, recargar]
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useProceso = () => useContext(Ctx)

/** Muestra las pantallas del personal solo cuando ya se conocen los períodos (o un error con Reintentar). */
export function ProcesoGate({ children }) {
  const ctx = useProceso()
  if (!ctx) return children
  if (ctx.error && !ctx.procesos) return <ErrorState error={ctx.error} retry={ctx.recargar} />
  if (!ctx.procesos) return <Loading />
  if (ctx.procesos.length === 0) return <Empty>Aún no hay períodos académicos. El administrador debe crear uno para iniciar el proceso de horarios.</Empty>
  return children
}
