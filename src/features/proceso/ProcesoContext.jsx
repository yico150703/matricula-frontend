import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { procesoApi } from '../../api/client'
import { Empty, ErrorState, Loading } from '../../components/AsyncState'

const Ctx = createContext(null)

/** Período en proceso: el que se está programando (fases 1-4); si no hay, el de matrícula/ajustes (5-6);
 *  si no, el más reciente. Se elige solo: nadie cambia de período ni de fase a mano. */
const periodoEnProceso = (procesos) => {
  const orden = (p) => (p.fase <= 4 ? 0 : p.fase <= 6 ? 1 : 2)
  return [...procesos].sort((a, b) => orden(a) - orden(b) || (orden(a) === 0 ? a.id_periodo - b.id_periodo : b.id_periodo - a.id_periodo))[0]
}

/** Estado del proceso de horarios compartido por las pantallas del personal. */
export function ProcesoProvider({ children }) {
  const [procesos, setProcesos] = useState(null)
  const [aulas, setAulas] = useState([])
  const [error, setError] = useState(null)

  const recargar = useCallback(async () => {
    try {
      const res = await procesoApi.periodos()
      setProcesos(res.procesos)
      setAulas(res.aulas || [])
      setError(null)
    } catch (err) {
      setError(err)
    }
  }, [])

  useEffect(() => {
    recargar()
  }, [recargar])

  const value = useMemo(() => {
    const proceso = procesos?.length ? periodoEnProceso(procesos) : null
    return { procesos, aulas, error, periodoId: proceso?.id_periodo ?? null, proceso, recargar }
  }, [procesos, aulas, error, recargar])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useProceso = () => useContext(Ctx)

/** Para consultar otros períodos (horario del docente, salones y actas de notas): solo los que ya tienen
 *  horarios publicados (desde `minFase`). Por defecto el que el usuario más probablemente necesita. */
export function usePeriodoConsulta({ minFase = 5, preferir = [5, 6, 4, 7] } = {}) {
  const ctx = useProceso()
  const [propios, setPropios] = useState(null)
  const [elegido, setElegido] = useState(null)
  useEffect(() => {
    if (ctx) return
    procesoApi
      .periodos()
      .then((r) => setPropios(r.procesos))
      .catch(() => setPropios([]))
  }, [ctx])
  const lista = ctx ? ctx.procesos : propios
  const opciones = useMemo(() => (lista || []).filter((p) => p.fase >= minFase).sort((a, b) => b.id_periodo - a.id_periodo), [lista, minFase])
  const porDefecto = preferir.map((f) => opciones.find((p) => p.fase === f)).find(Boolean) || opciones[0]
  const periodoId = opciones.some((p) => p.id_periodo === elegido) ? elegido : (porDefecto?.id_periodo ?? null)
  return { periodoId, elegir: setElegido, opciones, cargado: lista != null, proceso: opciones.find((p) => p.id_periodo === periodoId) || null }
}

export function PeriodoSelect({ periodoId, opciones, onChange }) {
  if (!opciones || opciones.length < 2) return null
  return (
    <select className="select-input" value={periodoId ?? ''} onChange={(e) => onChange(Number(e.target.value))} aria-label="Período">
      {opciones.map((p) => (
        <option key={p.id_periodo} value={p.id_periodo}>
          Período {p.periodo.cod_per_acad}
        </option>
      ))}
    </select>
  )
}

/** Muestra las pantallas del personal solo cuando ya se conocen los períodos (o un error con Reintentar). */
export function ProcesoGate({ children }) {
  const ctx = useProceso()
  if (!ctx) return children
  if (ctx.error && !ctx.procesos) return <ErrorState error={ctx.error} retry={ctx.recargar} />
  if (!ctx.procesos) return <Loading />
  if (ctx.procesos.length === 0) return <Empty>Aún no hay períodos académicos. El administrador debe crear uno para iniciar el proceso de horarios.</Empty>
  return children
}
