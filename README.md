# Matrícula UNFV — Frontend

SPA React + Vite con dos roles. El código está organizado por funcionalidades en `src/features` y todo acceso HTTP pasa por `src/api/client.js`.

- **Alumno** (`/matricula`, `/malla`, `/horario`, `/historial`, `/configuracion`): se matricula y retira cursos, consulta su avance, horario e historial (solo lectura), descarga su ficha PDF y cambia su contraseña.
- **Administrador** (`/admin`, `/admin/alumnos`, `/admin/notas`, `/configuracion`): registra alumnos con solo código, nombres, apellidos y plan (el correo `código@unfv.edu.pe` y la contraseña inicial = código se generan solos), edita, desactiva, restablece contraseñas, registra notas y abre o cierra períodos.

Primer ingreso: el alumno entra con su código como usuario y contraseña, y el sistema le obliga a cambiarla. El administrador entra con `admin` y la contraseña inicial configurada en el backend. La sesión se mantiene al recargar y se cierra tras 15 minutos de inactividad.

## Desarrollo local

1. Instala Node.js 20.19 o superior.
2. Ejecuta `npm install`.
3. Copia `.env.example` a `.env.local` y establece `VITE_API_URL=http://localhost:5000/api`.
4. Inicia con `npm run dev`.
5. Inicia el backend, con `FRONTEND_ORIGIN=http://localhost:5173`.

Para una compilación de producción ejecuta `npm run build`; el resultado se genera en `dist/`.

## Variable de entorno

| Variable | Ejemplo |
| --- | --- |
| `VITE_API_URL` | `https://matricula-backend.onrender.com/api` |

No incluya una barra final. Vite incorpora esta variable durante la compilación, por lo que cambiarla en Vercel exige un nuevo despliegue.

## Despliegue en Vercel y conexión con Render

1. Publica este directorio como el repositorio independiente `matricula-frontend`.
2. En Vercel selecciona **Add New Project**, importa el repositorio y deja el preset de Vite. El build command es `npm run build` y el output directory es `dist`.
3. En **Settings → Environment Variables**, crea `VITE_API_URL` con la URL pública de Render terminada en `/api`. Agrégala a Production, Preview y Development según corresponda.
4. Despliega y copia la URL de Vercel.
5. En Render, actualiza `FRONTEND_ORIGIN` con esa URL exacta de Vercel y vuelve a desplegar el backend. Para previews, agrega sus orígenes explícitamente separados por coma o utiliza un dominio de preview estable.

`vercel.json` redirige rutas SPA a `index.html`, por lo que `/matricula`, `/horario` e `/historial` funcionan al recargar directamente.
