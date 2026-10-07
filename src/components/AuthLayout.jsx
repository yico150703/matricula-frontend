import { CalendarCheck2, ShieldCheck, ListChecks } from 'lucide-react'
import logo from '../assets/logo-unfv.png'

/** Diseño compartido de las pantallas públicas (login, recuperar y restablecer contraseña). */
export default function AuthLayout({ children }) {
  return (
    <div className="auth-page">
      <section className="auth-hero">
        <div className="auth-hero-inner">
          <p className="auth-eyebrow">Facultad de Ingeniería Industrial y de Sistemas</p>
          <h1>
            Sistema de Matrícula <span>UNFV</span>
          </h1>
          <ul className="auth-features">
            <li>
              <CalendarCheck2 size={18} /> Horarios oficiales con docentes y aulas
            </li>
            <li>
              <ListChecks size={18} /> Selección de cursos con vacante reservada
            </li>
            <li>
              <ShieldCheck size={18} /> Acceso seguro con tu código de alumno
            </li>
          </ul>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <img src={logo} alt="Universidad Nacional Federico Villarreal" className="auth-logo" />
          {children}
        </div>
        <p className="auth-footer">E.P. de Ingeniería de Sistemas · Oficina de Matrícula FIIS</p>
      </section>
    </div>
  )
}
