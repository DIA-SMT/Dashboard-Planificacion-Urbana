-- =====================================================================
-- Planificación Urbana - Schema completo
-- Correr en Supabase SQL Editor (proyecto "Planificacion-Urbana")
-- =====================================================================

-- Limpieza del schema anterior (clon de "Comuniquemos")
drop table if exists task_assignees cascade;
drop table if exists tasks cascade;
drop table if exists projects cascade;
drop table if exists members cascade;

-- =====================================================================
-- Tabla: eje_tematico
-- Tags creables por superadmin (Normativa/COP, Espacio Público, etc.)
-- =====================================================================
create table eje_tematico (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  color text,
  created_at timestamptz default now()
);

-- Seed inicial con los ejes mencionados en el Notion
insert into eje_tematico (nombre, color) values
  ('Normativa/COP',       '#3b82f6'),
  ('Espacio Público',     '#10b981'),
  ('Patrimonio Histórico','#f59e0b');

-- =====================================================================
-- Tabla: members
-- Pool de personas asignables como responsables
-- =====================================================================
create table members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  empresa text,
  created_at timestamptz default now()
);

-- =====================================================================
-- Tabla: projects
-- =====================================================================
create table projects (
  id uuid primary key default gen_random_uuid(),
  codigo text,
  nombre text not null,
  descripcion_tecnica text,
  eje_tematico_id uuid references eje_tematico(id) on delete set null,
  estado text not null default 'Pendiente'
    check (estado in ('Pendiente','En curso','En riesgo','Completado')),
  prioridad text
    check (prioridad in ('Baja','Media','Alta','Crítica')),
  fecha_inicio date,
  deadline date,
  monto numeric(14,2),
  n_expediente text,
  observaciones text,
  responsable_id uuid references members(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create index projects_estado_idx           on projects(estado);
create index projects_eje_tematico_id_idx  on projects(eje_tematico_id);
create index projects_responsable_id_idx   on projects(responsable_id);
create index projects_deadline_idx         on projects(deadline);

-- =====================================================================
-- Tabla: hitos
-- Reemplaza a "tasks". Define el avance del proyecto.
-- =====================================================================
create table hitos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  titulo text not null,
  estado text not null default 'Sin empezar'
    check (estado in ('Sin empezar','En desarrollo','Terminado')),
  notas text,
  link text,
  orden int default 0,
  es_critico boolean default false,
  created_at timestamptz default now()
);

create index hitos_project_id_idx on hitos(project_id);

-- =====================================================================
-- Vista: project_avance
-- Calcula avance % de cada proyecto a partir de sus hitos.
-- Reglas: Terminado=100, En desarrollo=50, Sin empezar=0.
-- =====================================================================
create or replace view project_avance as
select
  p.id as project_id,
  count(h.id)::int as total_hitos,
  count(h.id) filter (where h.estado = 'Terminado')::int    as hitos_terminados,
  count(h.id) filter (where h.estado = 'En desarrollo')::int as hitos_en_desarrollo,
  case
    when count(h.id) = 0 then 0
    else round(
      (sum(
        case h.estado
          when 'Terminado' then 100
          when 'En desarrollo' then 50
          else 0
        end
      )::numeric / count(h.id))
    )::int
  end as avance_pct
from projects p
left join hitos h on h.project_id = p.id
group by p.id;

-- =====================================================================
-- Profiles + roles
-- Mantenemos la tabla profiles existente, pero reescribimos el check
-- para los roles del nuevo dominio.
-- =====================================================================
drop table if exists profiles cascade;

create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamptz,
  full_name text,
  avatar_url text,
  role text not null default 'responsable'
    check (role in ('superadmin','responsable'))
);

alter table profiles enable row level security;

create policy "Profiles are viewable by everyone."
  on profiles for select using (true);

create policy "Users can insert their own profile."
  on profiles for insert with check ((select auth.uid()) = id);

create policy "Users can update own profile."
  on profiles for update using ((select auth.uid()) = id);

-- Trigger: crear profile al registrarse un usuario nuevo
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'responsable');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================================
-- RLS para tablas de dominio
-- v1: cualquier usuario autenticado puede leer/escribir.
-- Refinaremos cuando agreguemos lógica de "responsable" más adelante.
-- =====================================================================
alter table eje_tematico enable row level security;
alter table members      enable row level security;
alter table projects     enable row level security;
alter table hitos        enable row level security;

create policy "auth read eje"      on eje_tematico for select to authenticated using (true);
create policy "auth write eje"     on eje_tematico for all    to authenticated using (true) with check (true);

create policy "auth read members"  on members for select to authenticated using (true);
create policy "auth write members" on members for all    to authenticated using (true) with check (true);

create policy "auth read projects" on projects for select to authenticated using (true);
create policy "auth write projects" on projects for all   to authenticated using (true) with check (true);

create policy "auth read hitos"    on hitos for select to authenticated using (true);
create policy "auth write hitos"   on hitos for all    to authenticated using (true) with check (true);
