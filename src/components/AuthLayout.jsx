import { CalendarCheck2, ShieldCheck, ShoppingCart } from 'lucide-react'
import logo from '../assets/logo-unfv.png'

/** Diseño compartido de las pantallas públicas (login, recuperar y restablecer contraseña). */
export default function AuthLayout({ children, onOpenDiagramaER }) {
  return (
    <div className="auth-page">
      <section className="auth-hero">
        <div className="auth-hero-inner">
          <p className="auth-eyebrow">Facultad de Ingeniería Industrial y de Sistemas</p>
          <h1>
            Sistema de Matrícula <span>UNFV</span>
          </h1>
          <p className="auth-lead">
            Arma tu horario por secciones A, B o C, revisa tus prerrequisitos y matricúlate en minutos, también en los
            cursos que necesitas volver a llevar.
          </p>
          <ul className="auth-features">
            <li>
              <CalendarCheck2 size={18} /> Horarios oficiales con docentes y aulas
            </li>
            <li>
              <ShoppingCart size={18} /> Carrito con reserva de vacante por 10 minutos
            </li>
            <li>
              <ShieldCheck size={18} /> Acceso seguro con tu código de alumno
            </li>
          </ul>
          {onOpenDiagramaER && (
            <button type="button" className="btn-ghost-light" onClick={onOpenDiagramaER}>
              Ver modelo de datos (Diagrama E-R)
            </button>
          )}
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
