// En celular las tablas de datos se muestran como tarjetas (ver .data-table en styles.css, ≤640px).
// Cada celda necesita el nombre de su columna: se toma del encabezado y se guarda en data-label.
// Un observador lo aplica a todas las tablas, también a las que aparecen o cambian después.
function etiquetar(tabla) {
  const encabezados = [...tabla.querySelectorAll('thead th')].map((th) => th.textContent.trim())
  if (!encabezados.length) return
  for (const fila of tabla.querySelectorAll('tbody tr')) {
    ;[...fila.children].forEach((celda, i) => {
      const etiqueta = encabezados[i] || ''
      if (celda.getAttribute('data-label') !== etiqueta) celda.setAttribute('data-label', etiqueta)
    })
  }
}

export function activarTablasMoviles() {
  if (typeof MutationObserver === 'undefined') return
  let pendiente = false
  const recorrer = () => {
    pendiente = false
    document.querySelectorAll('table.data-table').forEach(etiquetar)
  }
  new MutationObserver(() => {
    if (!pendiente) {
      pendiente = true
      requestAnimationFrame(recorrer)
    }
  }).observe(document.body, { childList: true, subtree: true })
  recorrer()
}
