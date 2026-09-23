import { useEffect, useState } from 'react'

export default function InfoMatricula({ periodo, onIniciar, onCambiarConfig }) {
  // Reloj en tiempo real para "Fecha del Sistema" (formato YYYY-MM-DD HH:MM:SS)
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatDate = (date) => {
    const pad = (n) => String(n).padStart(2, '0')
    const y = date.getFullYear()
    const m = pad(date.getMonth() + 1)
    const d = pad(date.getDate())
    const h = pad(date.getHours())
    const min = pad(date.getMinutes())
    const s = pad(date.getSeconds())
    return `${y}-${m}-${d} ${h}:${min}:${s}`
  }

  const codPeriodo = periodo?.cod_per_acad || '—'
  const fmt = (iso) => (iso ? iso.split('-').reverse().join('/') : '—')
  const abierto = periodo?.estado === 'en_curso'

  return (
    <div className="info-matricula-container">
      <h1 className="page-main-title">Información de Matrícula</h1>

      <div className="info-matricula-grid">
        {/* Columna Izquierda: Información Importante */}
        <div className="info-card-left">
          <h2 className="info-card-title">
            Información importante acerca del módulo de Matrícula Vía Web
          </h2>

          <div className="info-item">
            <h3>1. Control de Cronograma de Matrícula</h3>
            <p>
              Verificación de Fechas de Inicio y Fin de Matrícula del Período Vigente (<strong>{codPeriodo}</strong>) y de Acceso al Módulo de Matrícula de la FIIS.
            </p>
          </div>

          <div className="info-item">
            <h3>2. Control de Acceso de Facultad</h3>
            <p>
              Verificación de la Programación Interna establecida por la Oficina de Matrícula de la <strong>Facultad de Ingeniería Industrial y de Sistemas (FIIS)</strong>.
            </p>
          </div>

          <div className="info-item">
            <h3>3. Control de Pre-Matrícula</h3>
            <p>
              Verificación del Registro de Pre-Matrícula el cual debe haber sido procesado por la Dirección de Escuela de Ingeniería de Sistemas.
            </p>
          </div>

          {onCambiarConfig && (
            <button type="button" className="btn-secondary-link" onClick={onCambiarConfig}>
              ← Cambiar Período ({codPeriodo}), Plan o Ciclo
            </button>
          )}
        </div>

        {/* Columna Derecha: Estado de Matrícula y Acceso */}
        <div className="info-card-right">
          <div className={abierto ? 'status-banner-enabled' : 'status-banner-disabled'}>
            {abierto ? 'MATRÍCULA POR INTERNET HABILITADA · FIIS' : 'MATRÍCULA CERRADA PARA ESTE PERÍODO'}
          </div>

          <div className="status-grid-boxes">
            <div className="info-box">
              <span className="box-label">Periodo Académico</span>
              <strong className="box-value">{codPeriodo}</strong>
            </div>

            <div className="info-box">
              <span className="box-label">Fecha del Sistema</span>
              <strong className="box-value">{formatDate(currentDate)}</strong>
            </div>

            <div className="info-box">
              <span className="box-label">Inicio del período</span>
              <strong className="box-value">{fmt(periodo?.fecha_inicio)}</strong>
            </div>

            <div className="info-box">
              <span className="box-label">Fin del período</span>
              <strong className="box-value">{fmt(periodo?.fecha_fin)}</strong>
            </div>
          </div>

          <div className="info-action-container">
            <button
              type="button"
              className="btn-start-matricula"
              onClick={onIniciar}
              disabled={!abierto}
            >
              Iniciar Matrícula
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
