import React, { useState } from 'react'

export default function DiagramaERModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('diagrama') // 'diagrama' | 'diccionario' | 'verbos'
  const [subsystem, setSubsystem] = useState('todos') // 'todos' | 'horarios' | 'academico' | 'matricula'
  const [zoom, setZoom] = useState(1)

  if (!isOpen) return null

  // Definición de tablas del modelo relacional oficial
  const tables = [
    {
      id: 'horario_cab',
      name: 'Horario Cab',
      subsystem: 'horarios',
      color: '#c7e2c9',
      borderColor: '#4ade80',
      headerTextColor: '#14532d',
      x: 30,
      y: 30,
      fields: [
        { isPk: true, isFk: false, name: 'IdHorario', type: 'BIGINT' },
        { isPk: false, isFk: true, name: 'CodPerAcad', type: 'VARCHAR(20)' },
        { isPk: false, isFk: true, name: 'CodMalla / CorrPE', type: 'SMALLINT' },
        { isPk: false, isFk: false, name: 'FecInicio', type: 'DATE' },
      ],
    },
    {
      id: 'periodo_academico',
      name: 'PeriodoAcademico',
      subsystem: 'horarios',
      color: '#f1f5f9',
      borderColor: '#94a3b8',
      headerTextColor: '#1e293b',
      x: 370,
      y: 30,
      fields: [
        { isPk: true, isFk: false, name: 'UniqueID', type: 'BIGINT' },
        { isPk: false, isFk: false, name: 'CodPerAcad', type: 'VARCHAR(20)' },
        { isPk: false, isFk: false, name: 'Fec_Inicio', type: 'DATE' },
        { isPk: false, isFk: false, name: 'Fec_Fin', type: 'DATE' },
        { isPk: false, isFk: false, name: 'Estado', type: 'VARCHAR(12)' },
      ],
    },
    {
      id: 'plan_estudio',
      name: 'PlanEstudio (MallaCurricular)',
      subsystem: 'academico',
      color: '#ede9fe',
      borderColor: '#a855f7',
      headerTextColor: '#581c87',
      x: 370,
      y: 220,
      fields: [
        { isPk: true, isFk: true, name: 'CodFac', type: 'SMALLINT' },
        { isPk: true, isFk: true, name: 'CodEsc', type: 'SMALLINT' },
        { isPk: true, isFk: false, name: 'CorrPE (CodMalla)', type: 'SMALLINT' },
        { isPk: false, isFk: false, name: 'AnioPE', type: 'VARCHAR(50)' },
        { isPk: false, isFk: false, name: 'Vigente', type: 'BOOLEAN' },
      ],
    },
    {
      id: 'horario_det',
      name: 'Horario Det',
      subsystem: 'horarios',
      color: '#bfe0f7',
      borderColor: '#38bdf8',
      headerTextColor: '#0369a1',
      x: 30,
      y: 250,
      fields: [
        { isPk: true, isFk: true, name: 'IdHorario', type: 'BIGINT' },
        { isPk: true, isFk: false, name: 'SemestreCorr', type: 'SMALLINT (1..10)' },
        { isPk: false, isFk: false, name: 'Semestre Desc', type: 'VARCHAR(50)' },
      ],
    },
    {
      id: 'horario_d_curso',
      name: 'HorarioDCurso',
      subsystem: 'horarios',
      color: '#fef08a',
      borderColor: '#eab308',
      headerTextColor: '#854d0e',
      x: 30,
      y: 450,
      fields: [
        { isPk: true, isFk: true, name: 'IdHorario', type: 'BIGINT' },
        { isPk: true, isFk: true, name: 'SemestreCorr', type: 'SMALLINT' },
        { isPk: true, isFk: true, name: 'CodCurso', type: 'INTEGER' },
        { isPk: false, isFk: false, name: 'NroSecc', type: 'SMALLINT' },
      ],
    },
    {
      id: 'horario_d_c_seccion',
      name: 'HorarioDCSeccion',
      subsystem: 'horarios',
      color: '#fed7aa',
      borderColor: '#f97316',
      headerTextColor: '#9a3412',
      x: 370,
      y: 450,
      fields: [
        { isPk: true, isFk: true, name: 'IdHorario', type: 'BIGINT' },
        { isPk: true, isFk: true, name: 'SemestreCorr', type: 'SMALLINT' },
        { isPk: true, isFk: true, name: 'CodCurso', type: 'INTEGER' },
        { isPk: true, isFk: false, name: 'CodSeccion', type: 'VARCHAR(10)' },
        { isPk: false, isFk: false, name: 'DiaTeoria', type: 'SMALLINT (1..6)' },
        { isPk: false, isFk: false, name: 'HoraInicio / HoraFin', type: 'TIME' },
        { isPk: false, isFk: false, name: 'Aula / Docente', type: 'VARCHAR' },
        { isPk: false, isFk: false, name: 'CupoMax / Disponible', type: 'SMALLINT' },
      ],
    },
    {
      id: 'facultad',
      name: 'Facultad',
      subsystem: 'academico',
      color: '#e0e7ff',
      borderColor: '#6366f1',
      headerTextColor: '#312e81',
      x: 720,
      y: 30,
      fields: [
        { isPk: true, isFk: false, name: 'CodFac', type: 'SMALLINT' },
        { isPk: false, isFk: false, name: 'DenFac', type: 'VARCHAR(100)' },
      ],
    },
    {
      id: 'escuela',
      name: 'Escuela',
      subsystem: 'academico',
      color: '#e0e7ff',
      borderColor: '#6366f1',
      headerTextColor: '#312e81',
      x: 720,
      y: 190,
      fields: [
        { isPk: true, isFk: true, name: 'CodFac', type: 'SMALLINT' },
        { isPk: true, isFk: false, name: 'CodEsc', type: 'SMALLINT' },
        { isPk: false, isFk: false, name: 'DenEscuela', type: 'VARCHAR(120)' },
      ],
    },
    {
      id: 'curso',
      name: 'Curso',
      subsystem: 'academico',
      color: '#f3e8ff',
      borderColor: '#9333ea',
      headerTextColor: '#581c87',
      x: 720,
      y: 370,
      fields: [
        { isPk: true, isFk: true, name: 'CodFac', type: 'SMALLINT' },
        { isPk: true, isFk: true, name: 'CodEsc', type: 'SMALLINT' },
        { isPk: true, isFk: true, name: 'CorrPE', type: 'SMALLINT' },
        { isPk: true, isFk: false, name: 'CodCurso', type: 'INTEGER' },
        { isPk: false, isFk: false, name: 'CodigoAsignatura', type: 'VARCHAR(20)' },
        { isPk: false, isFk: false, name: 'DenCurso', type: 'VARCHAR(200)' },
        { isPk: false, isFk: false, name: 'Semestre (1..10)', type: 'SMALLINT' },
        { isPk: false, isFk: false, name: 'Cred / HT / HP', type: 'NUMERIC' },
        { isPk: false, isFk: false, name: 'Prereq (S/N)', type: 'CHAR(1)' },
      ],
    },
    {
      id: 'mezcla_curso',
      name: 'MezclaCurso (Prerrequisitos)',
      subsystem: 'academico',
      color: '#fae8ff',
      borderColor: '#d946ef',
      headerTextColor: '#701a75',
      x: 720,
      y: 690,
      fields: [
        { isPk: true, isFk: true, name: 'CodFac', type: 'SMALLINT' },
        { isPk: true, isFk: true, name: 'CodEsc', type: 'SMALLINT' },
        { isPk: true, isFk: true, name: 'CorrPE', type: 'SMALLINT' },
        { isPk: true, isFk: true, name: 'CodCurso', type: 'INTEGER' },
        { isPk: true, isFk: true, name: 'CodCursoPrerequisito', type: 'INTEGER' },
      ],
    },
    {
      id: 'alumno',
      name: 'Alumno',
      subsystem: 'matricula',
      color: '#d1fae5',
      borderColor: '#10b981',
      headerTextColor: '#064e3b',
      x: 1070,
      y: 30,
      fields: [
        { isPk: true, isFk: false, name: 'CodAlumno', type: 'VARCHAR(20)' },
        { isPk: false, isFk: false, name: 'Nombres / Apellidos', type: 'VARCHAR(120)' },
        { isPk: false, isFk: false, name: 'Email / PasswordHash', type: 'VARCHAR' },
        { isPk: false, isFk: true, name: 'CodFac / CodEsc / CorrPE', type: 'SMALLINT' },
        { isPk: false, isFk: false, name: 'Estado / FechaIngreso', type: 'VARCHAR / DATE' },
      ],
    },
    {
      id: 'matricula',
      name: 'Matricula',
      subsystem: 'matricula',
      color: '#ccfbf1',
      borderColor: '#14b8a6',
      headerTextColor: '#134e4a',
      x: 1070,
      y: 280,
      fields: [
        { isPk: true, isFk: false, name: 'NroMatricula', type: 'BIGINT (IDENTITY)' },
        { isPk: false, isFk: true, name: 'CodAlumno', type: 'VARCHAR(20)' },
        { isPk: false, isFk: true, name: 'IdPeriodo', type: 'BIGINT' },
        { isPk: false, isFk: false, name: 'FechaMatricula', type: 'TIMESTAMP' },
        { isPk: false, isFk: false, name: 'Estado / MontoPagado', type: 'VARCHAR / NUMERIC' },
      ],
    },
    {
      id: 'matricula_detalle',
      name: 'MatriculaDetalle',
      subsystem: 'matricula',
      color: '#ccfbf1',
      borderColor: '#14b8a6',
      headerTextColor: '#134e4a',
      x: 1070,
      y: 530,
      fields: [
        { isPk: true, isFk: false, name: 'Id', type: 'BIGINT (IDENTITY)' },
        { isPk: false, isFk: true, name: 'NroMatricula', type: 'BIGINT' },
        { isPk: false, isFk: true, name: 'IdSeccion', type: 'BIGINT' },
        { isPk: false, isFk: false, name: 'Estado', type: 'VARCHAR(12)' },
        { isPk: false, isFk: false, name: 'NotaFinal', type: 'NUMERIC(4,2)' },
      ],
    },
  ]

  // Relaciones con verbos oficiales y cardinalidades
  const relations = [
    { from: 'horario_cab', to: 'periodo_academico', verb: 'programa en', card: 'N : 1' },
    { from: 'horario_cab', to: 'plan_estudio', verb: 'aplica para', card: 'N : 1' },
    { from: 'horario_cab', to: 'horario_det', verb: 'contiene ciclos', card: '1 : N' },
    { from: 'horario_det', to: 'horario_d_curso', verb: 'desglosa por ciclo a', card: '1 : N' },
    { from: 'horario_d_curso', to: 'horario_d_c_seccion', verb: 'asigna secciones a', card: '1 : N' },
    { from: 'facultad', to: 'escuela', verb: 'administra', card: '1 : N' },
    { from: 'escuela', to: 'plan_estudio', verb: 'ofrece', card: '1 : N' },
    { from: 'plan_estudio', to: 'curso', verb: 'estructura malla de', card: '1 : N' },
    { from: 'curso', to: 'mezcla_curso', verb: 'exige prerrequisito en', card: '1 : N' },
    { from: 'alumno', to: 'plan_estudio', verb: 'cursa plan de', card: 'N : 1' },
    { from: 'alumno', to: 'matricula', verb: 'realiza', card: '1 : N' },
    { from: 'matricula', to: 'matricula_detalle', verb: 'inscribe detalle en', card: '1 : N' },
    { from: 'matricula_detalle', to: 'horario_d_c_seccion', verb: 'reserva vacante en', card: 'N : 1' },
  ]

  const filteredTables = subsystem === 'todos' ? tables : tables.filter((t) => t.subsystem === subsystem)

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-card er-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '96vw',
          maxWidth: '1440px',
          height: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          background: '#f8fafc',
          borderRadius: '14px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        }}
      >
        {/* Top Header Bar */}
        <div
          className="modal-header"
          style={{
            padding: '1rem 1.75rem',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
            borderRadius: '14px 14px 0 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <span style={{ fontSize: '1.75rem' }}>📊</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
                Diagrama Entidad-Relación (DER) — Base de Datos Oficial
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                Facultad FIIS • Escuela Profesional de Ingeniería de Sistemas • Estructura Relacional Rigurosa
              </p>
            </div>
          </div>

          {/* Action buttons & Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.2rem' }}>
              <button
                style={{ background: 'none', border: 'none', color: '#fff', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.9rem' }}
                onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
                title="Alejar"
              >
                🔍 -
              </button>
              <span style={{ fontSize: '0.75rem', color: '#cbd5e1', padding: '0 0.4rem', fontWeight: 600 }}>
                {Math.round(zoom * 100)}%
              </span>
              <button
                style={{ background: 'none', border: 'none', color: '#fff', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.9rem' }}
                onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
                title="Acercar"
              >
                🔍 +
              </button>
              <button
                style={{ background: 'none', border: 'none', color: '#38bdf8', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                onClick={() => setZoom(1)}
              >
                Reset
              </button>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#fff',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Subheader Controls & Tabs */}
        <div
          style={{
            padding: '0.65rem 1.75rem',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          {/* Main View Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={`cycle-tab-btn ${activeTab === 'diagrama' ? 'active' : ''}`}
              onClick={() => setActiveTab('diagrama')}
              style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', fontWeight: 600 }}
            >
              🖼️ Diagrama Visual (Foto Modelo)
            </button>
            <button
              className={`cycle-tab-btn ${activeTab === 'verbos' ? 'active' : ''}`}
              onClick={() => setActiveTab('verbos')}
              style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', fontWeight: 600 }}
            >
              🔗 Matriz de Relaciones y Verbos ({relations.length})
            </button>
            <button
              className={`cycle-tab-btn ${activeTab === 'diccionario' ? 'active' : ''}`}
              onClick={() => setActiveTab('diccionario')}
              style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', fontWeight: 600 }}
            >
              📑 Diccionario de Datos ({tables.length} Tablas)
            </button>
          </div>

          {/* Subsystem Filter */}
          {activeTab === 'diagrama' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <span style={{ fontWeight: 600, color: '#475569' }}>Filtrar Módulo:</span>
              <select
                value={subsystem}
                onChange={(e) => setSubsystem(e.target.value)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                }}
              >
                <option value="todos">Todos los Módulos (12 Tablas)</option>
                <option value="horarios">Módulo de Horarios (Foto ER)</option>
                <option value="academico">Módulo Académico (Facultad, Escuela, Planes, Cursos)</option>
                <option value="matricula">Módulo de Matrícula (Alumno, Matrícula, Detalle)</option>
              </select>
            </div>
          )}
        </div>

        {/* Modal Body Container */}
        <div style={{ flex: 1, overflow: 'auto', position: 'relative', background: '#f8fafc' }}>
          {activeTab === 'diagrama' && (
            <div
              style={{
                padding: '2.5rem',
                minWidth: '1420px',
                minHeight: '880px',
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                transition: 'transform 0.15s ease-out',
                position: 'relative',
              }}
            >
              {/* Cuadrícula de fondo técnico tipo hoja milimetrada de diseño de software */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                  opacity: 0.6,
                  pointerEvents: 'none',
                }}
              />

              {/* Conectores con Verbos de Relación */}
              <div style={{ position: 'relative', zIndex: 5, marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span>📌 Leyenda de Verbos:</span>
                  <span style={{ color: '#0284c7', background: '#e0f2fe', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>[Verbo] = Acción Relacional</span>
                  <span style={{ color: '#059669', background: '#ecfdf5', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>PK = Primary Key (Subrayada)</span>
                  <span style={{ color: '#d97706', background: '#fef3c7', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>FK = Foreign Key</span>
                </div>
              </div>

              {/* Renderizado de las Tarjetas de Tablas (Estilo Foto) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 320px)',
                  gap: '2.5rem',
                  position: 'relative',
                  zIndex: 10,
                }}
              >
                {filteredTables.map((tbl) => (
                  <div
                    key={tbl.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '8px',
                      border: `2px solid ${tbl.borderColor}`,
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Header de la Tarjeta estilo ER Diagram Foto */}
                    <div
                      style={{
                        background: tbl.color,
                        borderBottom: `2px solid ${tbl.borderColor}`,
                        padding: '0.65rem 0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>⊟</span>
                        <strong style={{ fontSize: '0.95rem', color: tbl.headerTextColor, letterSpacing: '-0.01em' }}>
                          {tbl.name}
                        </strong>
                      </div>
                      <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(0,0,0,0.08)', fontWeight: 600, color: tbl.headerTextColor }}>
                        {tbl.subsystem.toUpperCase()}
                      </span>
                    </div>

                    {/* Contenido de Campos: Columna PK/FK + Nombre del Campo */}
                    <div style={{ background: '#ffffff', padding: '0' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <tbody>
                          {tbl.fields.map((f, fIdx) => (
                            <tr
                              key={fIdx}
                              style={{
                                borderBottom: fIdx === tbl.fields.length - 1 ? 'none' : '1px solid #f1f5f9',
                                background: f.isPk ? 'rgba(241, 245, 249, 0.6)' : 'transparent',
                              }}
                            >
                              {/* Columna PK / FK */}
                              <td
                                style={{
                                  width: '44px',
                                  padding: '0.45rem 0.5rem',
                                  fontWeight: 800,
                                  fontSize: '0.75rem',
                                  color: f.isPk ? '#0284c7' : f.isFk ? '#eab308' : '#cbd5e1',
                                  borderRight: '1px solid #e2e8f0',
                                  textAlign: 'center',
                                  letterSpacing: '0.05em',
                                }}
                              >
                                {f.isPk ? 'PK' : f.isFk ? 'FK' : ''}
                              </td>

                              {/* Nombre del Campo con subrayado si es PK (idéntico a la foto) */}
                              <td style={{ padding: '0.45rem 0.75rem', color: '#1e293b' }}>
                                <span
                                  style={{
                                    textDecoration: f.isPk ? 'underline' : 'none',
                                    textDecorationColor: '#0284c7',
                                    textUnderlineOffset: '2px',
                                    fontWeight: f.isPk ? 700 : 500,
                                  }}
                                >
                                  {f.name}
                                </span>
                              </td>

                              {/* Tipo de dato */}
                              <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', color: '#64748b', fontSize: '0.72rem', fontFamily: 'monospace' }}>
                                {f.type}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tarjetas de Relaciones con Verbos Explícitos */}
              <div style={{ marginTop: '3rem', zIndex: 10, position: 'relative' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🔗 Conexiones Relacionales con sus Verbos de Asociación
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                  {relations.map((rel, rIdx) => (
                    <div
                      key={rIdx}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{rel.from}</span>
                        <span
                          style={{
                            background: '#dbeafe',
                            color: '#1e40af',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '12px',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            fontStyle: 'italic',
                          }}
                        >
                          ── {rel.verb} ──▶
                        </span>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{rel.to}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                        {rel.card}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab Matriz de Relaciones */}
          {activeTab === 'verbos' && (
            <div style={{ padding: '2rem' }}>
              <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '0.85rem 1.25rem', textAlign: 'left', color: '#475569' }}>Entidad Origen</th>
                      <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center', color: '#1e40af' }}>Verbo / Predicado Relacional</th>
                      <th style={{ padding: '0.85rem 1.25rem', textAlign: 'left', color: '#475569' }}>Entidad Destino</th>
                      <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center', color: '#475569' }}>Cardinalidad</th>
                      <th style={{ padding: '0.85rem 1.25rem', textAlign: 'left', color: '#475569' }}>Descripción de la Regla de Negocio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relations.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.85rem 1.25rem', fontWeight: 700, color: '#0f172a' }}>{r.from}</td>
                        <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                          <span style={{ background: '#dbeafe', color: '#1e40af', padding: '0.25rem 0.75rem', borderRadius: '20px', fontWeight: 700, fontSize: '0.82rem' }}>
                            {r.verb}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem', fontWeight: 700, color: '#0f172a' }}>{r.to}</td>
                        <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: '#0284c7' }}>
                          {r.card}
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontSize: '0.85rem' }}>
                          {r.from === 'horario_cab' && r.to === 'periodo_academico' && 'Una cabecera de horario pertenece a un período específico (2026-1 o 2026-2).'}
                          {r.from === 'horario_cab' && r.to === 'plan_estudio' && 'Aplica al catálogo curricular vigente (Plan 2019) o anterior (Plan 2010).'}
                          {r.from === 'horario_cab' && r.to === 'horario_det' && 'Se subdivide en los 10 ciclos académicos (SemestreCorr 1..10).'}
                          {r.from === 'horario_det' && r.to === 'horario_d_curso' && 'Registra cada curso programado dentro de dicho ciclo con su cupo.'}
                          {r.from === 'horario_d_curso' && r.to === 'horario_d_c_seccion' && 'Desglosa las secciones (01, 02) con docentes, aulas y horarios asignados.'}
                          {r.from === 'facultad' && r.to === 'escuela' && 'FIIS agrupa a Ing. de Sistemas, Industrial y Transportes.'}
                          {r.from === 'escuela' && r.to === 'plan_estudio' && 'Ing. de Sistemas ofrece los Planes Curriculares 2010 y 2019.'}
                          {r.from === 'plan_estudio' && r.to === 'curso' && 'Cada plan contiene su catálogo de asignaturas con créditos y horas.'}
                          {r.from === 'curso' && r.to === 'mezcla_curso' && 'Cada curso define sus asignaturas prerrequisito obligatorias.'}
                          {r.from === 'alumno' && r.to === 'plan_estudio' && 'Cada estudiante pertenece a un plan activo.'}
                          {r.from === 'alumno' && r.to === 'matricula' && 'El alumno formaliza su matrícula por período.'}
                          {r.from === 'matricula' && r.to === 'matricula_detalle' && 'Inscribe las asignaturas elegidas.'}
                          {r.from === 'matricula_detalle' && r.to === 'horario_d_c_seccion' && 'Reserva y descuenta atómicamente el cupo disponible de la sección.'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab Diccionario de Datos */}
          {activeTab === 'diccionario' && (
            <div style={{ padding: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
                {tables.map((t) => (
                  <div key={t.id} style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{t.name}</strong>
                      <code style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{t.id}</code>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#334155', lineHeight: '1.6' }}>
                      {t.fields.map((f, i) => (
                        <li key={i}>
                          <span style={{ fontWeight: f.isPk ? 700 : 500, color: f.isPk ? '#0284c7' : '#1e293b' }}>
                            {f.name}
                          </span>
                          {' '}(<code>{f.type}</code>)
                          {f.isPk && <span style={{ color: '#0284c7', fontWeight: 700, marginLeft: '0.3rem' }}>[PK]</span>}
                          {f.isFk && <span style={{ color: '#d97706', fontWeight: 700, marginLeft: '0.3rem' }}>[FK]</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div
          style={{
            padding: '0.75rem 1.75rem',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            borderRadius: '0 0 14px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: '#64748b',
          }}
        >
          <span>
            Diseño fiel al esquema institucional FIIS • 12 Tablas relacionales con llaves compuestas e integridad referencial.
          </span>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}>
            Cerrar Visor
          </button>
        </div>
      </div>
    </div>
  )
}
