import React, { useEffect, useState } from 'react'
import { alumnosApi } from '../../api/client'

export default function RegistroAlumnoModal({ isOpen, onClose, onLoginAs }) {
  const [activeTab, setActiveTab] = useState('nuevo') // 'nuevo' | 'lista'
  const [alumnos, setAlumnos] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [createdStudent, setCreatedStudent] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    cod_alumno: '',
    nombres: '',
    apellidos: '',
    email: '',
    password: '',
    id_plan: 1,
  })

  const fetchAlumnos = async () => {
    setLoadingList(true)
    try {
      const res = await alumnosApi.list()
      const list = res.alumnos || []
      setAlumnos(list)
      // Sugerir código correlativo tipo 2026000X
      const nextNum = list.length + 1
      const suggestedCode = `2026${String(nextNum).padStart(4, '0')}`
      setFormData((prev) => ({
        ...prev,
        cod_alumno: prev.cod_alumno || suggestedCode,
        email: prev.email || `alumno${nextNum}@unfv.edu.pe`,
      }))
    } catch (err) {
      console.warn('Error al listar alumnos:', err)
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('')
      setSuccessMsg('')
      setCreatedStudent(null)
      fetchAlumnos()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'id_plan' ? Number(value) : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setSubmitting(true)

    try {
      const res = await alumnosApi.crear(formData)
      const alumnoCreado = res.alumno
      setCreatedStudent({
        ...alumnoCreado,
        token: res.access_token,
      })
      setSuccessMsg(`¡Alumno ${alumnoCreado.nombres} ${alumnoCreado.apellidos} (${alumnoCreado.cod_alumno}) registrado con éxito en PostgreSQL!`)
      // Refresh list
      fetchAlumnos()
    } catch (err) {
      setErrorMsg(err.detail || err.message || 'Error al registrar el alumno.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSwitchUser = (alumno) => {
    if (onLoginAs) {
      onLoginAs(alumno)
      onClose()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card er-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px' }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <span className="info-badge" style={{ background: '#0284c7', color: '#fff', marginBottom: '0.35rem' }}>
              FIIS — Escuela Profesional de Ingeniería de Sistemas
            </span>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>
              👥 Gestión y Registro de Alumnos en Base de Datos
            </h3>
          </div>
          <button className="btn-close-modal" onClick={onClose} title="Cerrar ventana">
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="plan-cycle-tabs" style={{ padding: '0.75rem 1.5rem 0', display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <button
            className={`cycle-tab-btn ${activeTab === 'nuevo' ? 'active' : ''}`}
            onClick={() => setActiveTab('nuevo')}
            style={{ borderRadius: '8px 8px 0 0', padding: '0.6rem 1.2rem', fontWeight: 600 }}
          >
            ➕ Registrar Nuevo Alumno
          </button>
          <button
            className={`cycle-tab-btn ${activeTab === 'lista' ? 'active' : ''}`}
            onClick={() => setActiveTab('lista')}
            style={{ borderRadius: '8px 8px 0 0', padding: '0.6rem 1.2rem', fontWeight: 600 }}
          >
            📋 Alumnos Registrados ({alumnos.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '1.5rem' }}>
          {activeTab === 'nuevo' ? (
            <div>
              {errorMsg && (
                <div className="auth-alert" style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: '#fee2e2', border: '1px solid #ef4444', color: '#991b1b', borderRadius: '8px' }}>
                  ⚠️ {errorMsg}
                </div>
              )}

              {successMsg && (
                <div style={{ marginBottom: '1.25rem', padding: '1rem', background: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>✅ {successMsg}</div>
                  <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem' }}>
                    El alumno ya fue insertado en la tabla <code>alumno</code> con contraseña hasheada y asignado a la <strong>Facultad FIIS</strong> y <strong>E.P. Ingeniería de Sistemas</strong>.
                  </p>
                  {createdStudent && onLoginAs && (
                    <button
                      className="btn-primary"
                      onClick={() => handleSwitchUser(createdStudent)}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                    >
                      🚀 Iniciar sesión y matricularse ahora con {createdStudent.nombres}
                    </button>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem', color: '#334155' }}>
                    Código de Alumno *
                  </label>
                  <input
                    type="text"
                    name="cod_alumno"
                    required
                    value={formData.cod_alumno}
                    onChange={handleChange}
                    placeholder="Ej. 20260002"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem' }}
                  />
                  <small style={{ color: '#64748b', fontSize: '0.75rem' }}>Identificador único de 8 dígitos.</small>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem', color: '#334155' }}>
                    Correo Institucional *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="alumno@unfv.edu.pe"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem' }}
                  />
                  <small style={{ color: '#64748b', fontSize: '0.75rem' }}>Usado para autenticación en la plataforma.</small>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem', color: '#334155' }}>
                    Nombres *
                  </label>
                  <input
                    type="text"
                    name="nombres"
                    required
                    value={formData.nombres}
                    onChange={handleChange}
                    placeholder="Ej. Carlos Eduardo"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem', color: '#334155' }}>
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    name="apellidos"
                    required
                    value={formData.apellidos}
                    onChange={handleChange}
                    placeholder="Ej. Gómez Vega"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem', color: '#334155' }}>
                    Contraseña de Acceso *
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Mínimo 6 caracteres"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem' }}
                  />
                  <small style={{ color: '#64748b', fontSize: '0.75rem' }}>Se almacenará de forma segura en PostgreSQL con hash.</small>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem', color: '#334155' }}>
                    Plan Curricular Asignado *
                  </label>
                  <select
                    name="id_plan"
                    value={formData.id_plan}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', background: '#fff' }}
                  >
                    <option value={1}>Plan 2019 — Malla Curricular Vigente</option>
                    <option value={2}>Plan 2010 — Plan Curricular Anterior</option>
                  </select>
                  <small style={{ color: '#64748b', fontSize: '0.75rem' }}>El estudiante podrá también alternar entre planes en el panel.</small>
                </div>

                <div style={{ gridColumn: '1 / -1', marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" className="btn-secondary" onClick={onClose}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? 'Guardando en PostgreSQL...' : '💾 Registrar Alumno en BD'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
                  Estudiantes registrados en la tabla <code>alumno</code> de PostgreSQL habilitados para matricularse.
                </p>
                <button
                  className="btn-secondary"
                  onClick={fetchAlumnos}
                  disabled={loadingList}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                >
                  🔄 Actualizar
                </button>
              </div>

              {loadingList ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Cargando lista de alumnos...</div>
              ) : alumnos.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No hay alumnos registrados aún.</div>
              ) : (
                <div className="table-responsive" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table className="courses-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Código</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Estudiante</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Correo Institucional</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Plan</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alumnos.map((al) => (
                        <tr key={al.cod_alumno} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#1e293b' }}>
                            {al.cod_alumno}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                            {al.nombres} {al.apellidos}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                            {al.email}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span className="seccion-pill" style={{ background: al.corr_pe === 1 ? '#dbeafe' : '#fef3c7', color: al.corr_pe === 1 ? '#1e40af' : '#92400e' }}>
                              {al.corr_pe === 1 ? 'Plan 2019' : 'Plan 2010'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            <button
                              className="btn-primary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                              onClick={() => handleSwitchUser(al)}
                              title="Conectar sesión con este estudiante"
                            >
                              Conectar 👤
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
