# Matrícula UNFV — Frontend

SPA React + Vite con seis roles; cada uno ve solo las pantallas de su función. El código está organizado por funcionalidades en `src/features` y todo acceso HTTP pasa por `src/api/client.js`.

- **Alumno** (`/matricula`, `/malla`, `/horario`, `/historial`, `/configuracion`): arma su matrícula por secciones A/B/C con un carrito (reserva de 10 minutos, cursos de su ciclo y de otros ciclos que repite), retira cursos, ve su horario semanal a colores, su historial con N1-N3 y descarga la ficha de matrícula y la boleta de notas en el formato UNFV.
- **Administrador** (`/admin`, `/admin/alumnos`, `/admin/notas`, `/configuracion`): registra alumnos con solo código, nombres, apellidos y plan (el correo `código@unfv.edu.pe` y la contraseña inicial = código se generan solos), edita, desactiva y restablece contraseñas; registra solo notas históricas (`/admin/notas`) y supervisa las actas de notas (`/admin/actas`). En `/admin/personal` crea las cuentas del personal con nombres y apellidos y les asigna el rol; en el panel crea los períodos académicos.
- **Jefe de Departamento** (`/programacion`, `/solicitudes`): fase 1, crea los horarios de cada curso (puede copiar un período anterior como base).
- **Director de Escuela** (`/programacion`, `/solicitudes`, `/actas`): fase 2, asigna los docentes; inicia los ajustes y cierra la matrícula; aprueba u observa las actas de notas. La matrícula se abre sola cuando todos los docentes confirman.
- **Asistente de Escuela** (`/programacion`, `/solicitudes`): fase 3, asigna pabellón, aula o laboratorio (a la sección o a cada sesión).
- **Docente** (`/docente`, `/docente/salones`, `/solicitudes`): fase 4, ve su horario semanal, confirma cada sección o reporta un problema. Desde la fase 5 registra las notas de cada salón, descarga el acta para firmar, sube el PDF firmado y lo envía al Director.

Jefe, director, asistente y docentes ven arriba una **barra de fases animada** con el período en proceso (se elige solo), la fase actual (se va pintando) y sus pendientes. El Jefe arma los horarios en bloques de 50 min desde las 08:00, con un contador de horas frente al plan de estudios. El administrador crea los períodos solo con la fecha de inicio (lunes de marzo a mayo); el fin y el período 2 se calculan solos. Los cambios fuera de la fase de cada rol se piden en **Solicitudes de cambio**, con un hilo de mensajes, y se aplican solo cuando el rol responsable los acepta. Los alumnos solo pueden matricularse cuando el proceso llega a la fase 5.

El inicio de sesión muestra arriba las **cuentas de prueba** de cada rol (toca una para completar usuario y contraseña). Son compartidas: su contraseña no se puede cambiar y el servidor la restablece en cada arranque.

Si Render está dormido (plan gratuito), el cliente reintenta solo mientras el servidor despierta y el login avisa que el primer ingreso puede tardar hasta un minuto. Un fallo de red al recargar ya no cierra la sesión; cerrar sesión en una pestaña la cierra en las demás.

Primer ingreso: el alumno entra con su código como usuario y contraseña, y el sistema le obliga a cambiarla. Si la olvida, usa "¿Olvidaste tu contraseña?" (`/recuperar`). La sesión se mantiene al recargar y se cierra tras 10 minutos de inactividad.

Íconos: `lucide-react`. Colores institucionales UNFV (negro y naranja del logo). Para usar una foto de fondo en el inicio de sesión, coloca `public/img/campus.jpg`; si no existe se usa el patrón gráfico.

## Desarrollo local

1. Instala Node.js 20.19 o superior.
2. Ejecuta `npm install`.
3. Copia `.env.example` a `.env.local` y establece `VITE_API_URL=http://localhost:5000/api`.
4. Inicia con `npm run dev`.
5. Inicia el backend, con `FRONTEND_ORIGIN=http://localhost:5173`.

Para una compilación de producción ejecuta `npm run build`; el resultado se genera en `dist/`.

## Variables de entorno

| Variable | Ejemplo |
| --- | --- |
| `VITE_API_URL` | `https://matricula-backend.onrender.com/api` |
| `VITE_MOSTRAR_CUENTAS_PRUEBA` | Opcional. Ponla en `false` para ocultar las cuentas de prueba del login cuando el sistema pase a uso real. |

No incluya una barra final. Vite incorpora esta variable durante la compilación, por lo que cambiarla en Vercel exige un nuevo despliegue.

## Despliegue en Vercel y conexión con Render

1. Publica este directorio como el repositorio independiente `matricula-frontend`.
2. En Vercel selecciona **Add New Project**, importa el repositorio y deja el preset de Vite. El build command es `npm run build` y el output directory es `dist`.
3. En **Settings → Environment Variables**, crea `VITE_API_URL` con la URL pública de Render terminada en `/api`. Agrégala a Production, Preview y Development según corresponda.
4. Despliega y copia la URL de Vercel.
5. En Render, actualiza `FRONTEND_ORIGIN` con esa URL exacta de Vercel y vuelve a desplegar el backend. Para previews, agrega sus orígenes explícitamente separados por coma o utiliza un dominio de preview estable.

`vercel.json` redirige rutas SPA a `index.html`, por lo que `/matricula`, `/horario` e `/historial` funcionan al recargar directamente.
