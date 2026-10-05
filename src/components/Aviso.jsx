import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'

const EVENTO = 'matricula:aviso'

/** Muestra un aviso discreto abajo de la pantalla (lo que acabas de hacer). */
export function avisar(texto) {
  if (texto) window.dispatchEvent(new CustomEvent(EVENTO, { detail: texto }))
}

/** Contenedor de avisos: una nubecita blanca con texto negro que sale por abajo y se va sola. */
export function Avisos() {
  const [lista, setLista] = useState([])
  useEffect(() => {
    let n = 0
    const timers = []
    const onAviso = (e) => {
      const id = ++n
      setLista((l) => [...l.slice(-2), { id, texto: e.detail }])
      timers.push(setTimeout(() => setLista((l) => l.filter((x) => x.id !== id)), 3800))
    }
    window.addEventListener(EVENTO, onAviso)
    return () => {
      window.removeEventListener(EVENTO, onAviso)
      timers.forEach(clearTimeout)
    }
  }, [])
  return (
    <div className="avisos" role="status" aria-live="polite">
      {lista.map((a) => (
        <div key={a.id} className="aviso">
          <CheckCircle2 size={15} /> {a.texto}
        </div>
      ))}
    </div>
  )
}

/** Mensaje de una pantalla: los de éxito salen como aviso abajo; los errores se quedan visibles en su lugar. */
export function Mensaje({ msg, className = 'form-error' }) {
  useEffect(() => {
    if (msg?.ok) avisar(msg.text)
  }, [msg])
  if (!msg || msg.ok) return null
  return <div className={className}>{msg.text}</div>
}
