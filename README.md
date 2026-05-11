# Dashboard Planificación Urbana

Tablero de gestión de proyectos para la Dirección de Planificación Urbana
de la Municipalidad de San Miguel de Tucumán.

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 ·
shadcn/ui · Supabase (auth + Postgres).

## Funcionalidades

- **Proyectos** con código, eje temático, estado, prioridad, fechas, monto,
  expediente, responsable y empresas a cargo (N:N).
- **Hitos** por proyecto. El avance % se calcula automáticamente
  (`Terminado=100, En desarrollo=50, Sin empezar=0`, promediado).
- **3 vistas**:
  - **Tabla** (`/`) — listado completo con filtros y búsqueda.
  - **Kanban** (`/kanban`) — por estado, con drag & drop.
  - **Cronograma** (`/cronograma`) — Gantt con escala día/semana/mes y línea
    de "hoy".
- **Administración**: ABM de empresas/responsables (`/members`) y de ejes
  temáticos (`/ejes`).
- **Roles**: `superadmin` (acceso total) · `responsable` (preparado para
  fases futuras).

## Setup

### 1. Variables de entorno

Crear `.env.local` en la raíz:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # solo para scripts locales
```

### 2. Base de datos

Correr en **Supabase → SQL Editor**, en orden:

1. [`supabase_schema_pu.sql`](./supabase_schema_pu.sql) — schema base
   (proyectos, hitos, ejes, empresas, RLS, seed de ejes).
2. [`supabase_migration_001_responsable.sql`](./supabase_migration_001_responsable.sql) —
   separa responsable (texto) de empresas (N:N).

### 3. Primer usuario superadmin

1. Crear usuario en **Supabase → Authentication → Add user**.
2. En SQL Editor:
   ```sql
   update profiles
   set role = 'superadmin'
   where id = (select id from auth.users where email = 'TU_EMAIL');
   ```

### 4. Desarrollo

```bash
npm install
npm run dev
```

App en `http://localhost:3000`. El middleware redirige a `/login` si no hay
sesión.

## Scripts útiles

- `node scripts/seed-initial-data.mjs` — carga proyectos y empresas de
  ejemplo (Plaza Urquiza, Mercado del Norte). Usa el `SERVICE_ROLE_KEY`.
- `node scripts/check-state.mjs` — imprime el estado actual de la base
  (usuarios, profiles, proyectos).

## Estructura

```
app/
  page.tsx              → vista tabla
  kanban/               → vista kanban
  cronograma/           → vista gantt
  projects/[id]/        → detalle de proyecto
  members/              → ABM empresas/responsables
  ejes/                 → ABM ejes temáticos
  login/                → autenticación
components/
  projects-list-view.tsx
  kanban-view.tsx
  gantt-view.tsx
  project-detail-view.tsx
  project-form.tsx
  hito-form.tsx
  navbar.tsx
  ui/                   → primitivas shadcn
lib/
  supabase.ts           → cliente browser
  supabase/             → clientes ssr/middleware
  project-ui.ts         → colores y formateadores
  use-refresh-on-focus.ts
context/
  AuthContext.tsx
types/
  index.ts              → dominio
  supabase.ts           → schema tipado
```
