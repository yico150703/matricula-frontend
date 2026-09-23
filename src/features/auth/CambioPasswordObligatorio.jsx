import unfvLogo from '../../assets/logo-unfv.png'
import PasswordForm from '../configuracion/PasswordForm'

export default function CambioPasswordObligatorio({ user, rol, onDone, onLogout }) {
  const isAlumno = rol === 'alumno'
  return (
    <div className="force-password-page">
      <div className="panel-card force-password-card">
        <img src={unfvLogo} alt="UNFV" className="login-card-mini-logo" />
        <h2>Crea tu nueva contraseña</h2>
        <p className="muted">
          Hola <strong>{user?.nombres}</strong>. {isAlumno ? (
            <>Ingresaste con la contraseña inicial (tu código <b>{user?.cod_alumno}</b>). </>
          ) : (
            <>Tu cuenta tiene una contraseña temporal. </>
          )}
          Por seguridad debes cambiarla antes de continuar.
        </p>
        {isAlumno && (
          <p className="info-strip">
            Tu correo institucional es <strong>{user?.email}</strong>.
          </p>
        )}
        <PasswordForm codigo={user?.cod_alumno} onChanged={(u) => onDone(u)} submitLabel="Guardar y continuar" />
        <button type="button" className="btn-link" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
