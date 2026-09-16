export function Loading() { return <div className="state loading">Cargando información…</div> }
export function ErrorState({ error, retry }) { return <div className="state error"><strong>No pudimos cargar esta vista.</strong><span>{error?.detail || error?.message}</span>{retry && <button onClick={retry}>Reintentar</button>}</div> }
export function Empty({ children }) { return <div className="state">{children}</div> }
