import React, { useEffect, useState, useMemo } from 'react'
import { alumnosApi } from '../../api/client'

export default function RegistroAlumnoModal({ isOpen, onClose, onLoginAs }) {
  const [activeTab, setActiveTab] = useState('nuevo') // 'nuevo' | 'lista'
  const [alumnos, setAlumnos] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [createdStudent, setCreatedStudent] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    cod_alumno: '',
    nombres: '',
    apellidos: '',
    email: '',
    password: '',
    id_plan: 2, // 2 = Malla 2019 (vigente)
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
      setSearchQuery('')
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
      setSuccessMsg(
        `¡Alumno ${alumnoCreado.nombres} ${alumnoCreado.apellidos} (${alumnoCreado.cod_alumno}) registrado con éxito en PostgreSQL!`
      )
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

  const filteredAlumnos = alumnos.filter((al) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      al.cod_alumno?.toLowerCase().includes(q) ||
      al.nombres?.toLowerCase().includes(q) ||
      al.apellidos?.toLowerCase().includes(q) ||
      al.email?.toLowerCase().includes(q)
    )
  })

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 1200,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '95vw',
          maxWidth: '860px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #cbd5e1',
        }}
      >
        {/* Header Institucional */}
        <div
          style={{
            padding: '1.2rem 1.75rem',
            background: 'linear-gradient(135deg, #0a2540 0%, #0f3b60 100%)',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#93c5fd',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: '0.3rem',
              }}
            >
              <span>🏛️ FIIS · UNFV</span>
              <span>•</span>
              <span>Escuela Profesional de Ingeniería de Sistemas</span>
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '-0.01em',
              }}
            >
              👥 Gestión y Registro de Alumnos en Base de Datos
            </h3>
          </div>
          <button
            onClick={onClose}
            title="Cerrar ventana"
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: '#ffffff',
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.85)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher con Alto Contraste */}
        <div
          style={{
            background: '#f8fafc',
            padding: '0.75rem 1.5rem 0',
            display: 'flex',
            gap: '0.6rem',
            borderBottom: '2px solid #e2e8f0',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('nuevo')}
            style={{
              padding: '0.7rem 1.4rem',
              fontSize: '0.92rem',
              fontWeight: 700,
              borderRadius: '8px 8px 0 0',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              background: activeTab === 'nuevo' ? '#0f3b60' : '#e2e8f0',
              color: activeTab === 'nuevo' ? '#ffffff' : '#334155',
              boxShadow: activeTab === 'nuevo' ? '0 -2px 8px rgba(15, 59, 96, 0.2)' : 'none',
            }}
          >
            ➕ Registrar Nuevo Alumno
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('lista')}
            style={{
              padding: '0.7rem 1.4rem',
              fontSize: '0.92rem',
              fontWeight: 700,
              borderRadius: '8px 8px 0 0',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              background: activeTab === 'lista' ? '#0f3b60' : '#e2e8f0',
              color: activeTab === 'lista' ? '#ffffff' : '#334155',
              boxShadow: activeTab === 'lista' ? '0 -2px 8px rgba(15, 59, 96, 0.2)' : 'none',
            }}
          >
            📋 Alumnos Registrados ({alumnos.length})
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            maxHeight: '74vh',
            overflowY: 'auto',
            padding: '1.75rem',
            background: '#ffffff',
          }}
        >
          {activeTab === 'nuevo' ? (
            <div>
              {/* Alerta de Error */}
              {errorMsg && (
                <div
                  style={{
                    marginBottom: '1.25rem',
                    padding: '0.85rem 1.1rem',
                    background: '#fef2f2',
                    border: '1.5px solid #ef4444',
                    color: '#991b1b',
                    borderRadius: '10px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                  }}
                >
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* Alerta de Éxito con botón para matricularse directo */}
              {successMsg && (
                <div
                  style={{
                    marginBottom: '1.5rem',
                    padding: '1.2rem',
                    background: '#f0fdf4',
                    border: '1.5px solid #16a34a',
                    borderRadius: '10px',
                    color: '#166534',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.4rem' }}>
                    ✅ {successMsg}
                  </div>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#15803d' }}>
                    El alumno fue guardado en la base de datos PostgreSQL de la FIIS con su contraseña hasheada y asignado al programa de <strong>Ingeniería de Sistemas</strong>.
                  </p>
                  {createdStudent && onLoginAs && (
                    <button
                      type="button"
                      onClick={() => handleSwitchUser(createdStudent)}
                      style={{
                        background: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        padding: '0.65rem 1.25rem',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                      }}
                    >
                      🚀 Iniciar sesión y matricularse ahora como {createdStudent.nombres} {createdStudent.apellidos}
                    </button>
                  )}
                </div>
              )}

              {/* Banner Informativo */}
              <div
                style={{
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '10px',
                  padding: '0.85rem 1.1rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>ℹ️</span>
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#0369a1', lineHeight: 1.4 }}>
                  Los datos ingresados se insertarán directamente en la tabla <strong>alumno</strong> de PostgreSQL. La contraseña se encripta con hash seguro y el estudiante podrá iniciar sesión inmediatamente.
                </p>
              </div>

              {/* Formulario de Registro con Alto Contraste */}
              <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.4rem', color: '#0f172a' }}>
                    Código de Alumno *
                  </label>
                  <input
                    type="text"
                    name="cod_alumno"
                    required
                    value={formData.cod_alumno}
                    onChange={handleChange}
                    placeholder="Ej. 20260005"
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.9rem',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      color: '#0f172a',
                      background: '#ffffff',
                      fontWeight: 600,
                    }}
                  />
                  <small style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    Código numérico único institucional.
                  </small>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.4rem', color: '#0f172a' }}>
                    Correo Institucional (@unfv.edu.pe) *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="usuario@unfv.edu.pe"
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.9rem',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      color: '#0f172a',
                      background: '#ffffff',
                      fontWeight: 500,
                    }}
                  />
                  <small style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    Usado para autenticación y notificaciones.
                  </small>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.4rem', color: '#0f172a' }}>
                    Nombres del Estudiante *
                  </label>
                  <input
                    type="text"
                    name="nombres"
                    required
                    value={formData.nombres}
                    onChange={handleChange}
                    placeholder="Ej. Renzo Paolo"
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.9rem',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      color: '#0f172a',
                      background: '#ffffff',
                      fontWeight: 500,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.4rem', color: '#0f172a' }}>
                    Apellidos Completos *
                  </label>
                  <input
                    type="text"
                    name="apellidos"
                    required
                    value={formData.apellidos}
                    onChange={handleChange}
                    placeholder="Ej. Navarro Salazar"
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.9rem',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      color: '#0f172a',
                      background: '#ffffff',
                      fontWeight: 500,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.4rem', color: '#0f172a' }}>
                    Contraseña de Acceso *
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Mínimo 6 caracteres"
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.9rem',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      color: '#0f172a',
                      background: '#ffffff',
                    }}
                  />
                  <small style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    Se guardará con cifrado seguro en PostgreSQL.
                  </small>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.4rem', color: '#0f172a' }}>
                    Plan Curricular Asignado *
                  </label>
                  <select
                    name="id_plan"
                    value={formData.id_plan}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.9rem',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      color: '#0f172a',
                      background: '#ffffff',
                      fontWeight: 600,
                    }}
                  >
                    <option value={2}>Malla Curricular Vigente 2019 (Recomendado)</option>
                    <option value={1}>Plan Curricular 2010 (Histórico)</option>
                  </select>
                  <small style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    Malla curricular asignada para el registro de asignaturas.
                  </small>
                </div>

                {/* Acciones */}
                <div
                  style={{
                    gridColumn: '1 / -1',
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '0.85rem',
                  }}
                >
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      background: '#f1f5f9',
                      color: '#334155',
                      border: '1.5px solid #cbd5e1',
                      padding: '0.75rem 1.4rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.92rem',
                    }}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      background: '#0f3b60',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.75rem 1.8rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      fontSize: '0.95rem',
                      boxShadow: '0 4px 12px rgba(15, 59, 96, 0.25)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    {submitting ? 'Guardando en Base de Datos...' : '💾 Registrar Alumno en BD'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* TAB 2: ALUMNOS REGISTRADOS */
            <div>
              {/* Barra de Filtro / Búsqueda */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.25rem',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1', minWidth: '260px' }}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="🔍 Buscar por código, apellidos, nombres o correo..."
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.9rem',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      color: '#0f172a',
                      background: '#ffffff',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#0f3b60',
                      background: '#e0f2fe',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                    }}
                  >
                    {filteredAlumnos.length} Alumnos Encontrados
                  </span>
                  <button
                    type="button"
                    onClick={fetchAlumnos}
                    disabled={loadingList}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      color: '#334155',
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.85rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    🔄 Recargar
                  </button>
                </div>
              </div>

              {loadingList ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#475569', fontSize: '1rem' }}>
                  Cargando alumnos desde la base de datos PostgreSQL...
                </div>
              ) : filteredAlumnos.length === 0 ? (
                <div
                  style={{
                    padding: '3rem',
                    textAlign: 'center',
                    color: '#64748b',
                    background: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px dashed #cbd5e1',
                  }}
                >
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                    {searchQuery ? 'No se encontraron alumnos con ese criterio de búsqueda.' : 'No hay alumnos registrados aún en la base de datos.'}
                  </p>
                </div>
              ) : (
                <div style={{ border: '1.5px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                      <tr>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#0f172a', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>
                          Código
                        </th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#0f172a', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>
                          Estudiante
                        </th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#0f172a', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>
                          Correo Institucional
                        </th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#0f172a', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>
                          Plan Curricular
                        </th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#0f172a', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>
                          Acción
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAlumnos.map((al, idx) => (
                        <tr
                          key={al.cod_alumno}
                          style={{
                            background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                            borderBottom: '1px solid #e2e8f0',
                            transition: 'background 0.15s',
                          }}
                        >
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span
                              style={{
                                background: '#0f3b60',
                                color: '#ffffff',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontFamily: 'monospace',
                                fontSize: '0.85rem',
                              }}
                            >
                              {al.cod_alumno}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: '#0f172a', fontWeight: 600 }}>
                            {al.nombres} {al.apellidos}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                            {al.email}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span
                              style={{
                                background: al.corr_pe === 1 || al.id_plan === 1 ? '#fef3c7' : '#dbeafe',
                                color: al.corr_pe === 1 || al.id_plan === 1 ? '#92400e' : '#1e40af',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '999px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                              }}
                            >
                              {al.corr_pe === 1 || al.id_plan === 1 ? 'Plan 2010' : 'Malla 2019'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleSwitchUser(al)}
                              style={{
                                background: '#0f3b60',
                                color: '#ffffff',
                                border: 'none',
                                padding: '0.45rem 0.85rem',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'background 0.2s',
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.background = '#0284c7')}
                              onMouseOut={(e) => (e.currentTarget.style.background = '#0f3b60')}
                              title={`Conectar sesión con ${al.nombres}`}
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
