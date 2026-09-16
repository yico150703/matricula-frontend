# Matrícula UNFV — Frontend

SPA React + Vite para el alumno: inicio de sesión, avance de malla, matrícula, horario e historial. El código está organizado por funcionalidades en `src/features` y todo acceso HTTP pasa por `src/api/client.js`.

## Desarrollo local

1. Instala Node.js 20 o superior.
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
