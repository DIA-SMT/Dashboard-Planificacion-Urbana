-- =====================================================================
-- Migración 001: Separar Responsable (persona, texto) de Empresas (N:N)
-- =====================================================================

-- 1. Nuevo campo: responsable como texto libre (nombre de persona)
alter table projects add column if not exists responsable_nombre text;

-- 2. Join table para empresas a cargo de cada proyecto
create table if not exists project_empresas (
    project_id uuid not null references projects(id) on delete cascade,
    member_id  uuid not null references members(id) on delete cascade,
    created_at timestamptz default now(),
    primary key (project_id, member_id)
);

create index if not exists project_empresas_member_idx on project_empresas(member_id);

alter table project_empresas enable row level security;

drop policy if exists "auth read project_empresas"  on project_empresas;
drop policy if exists "auth write project_empresas" on project_empresas;

create policy "auth read project_empresas"
    on project_empresas for select to authenticated using (true);
create policy "auth write project_empresas"
    on project_empresas for all to authenticated using (true) with check (true);

-- 3. Migrar el responsable_id viejo al nuevo modelo:
--    cada proyecto con responsable_id pasa esa empresa a project_empresas
insert into project_empresas (project_id, member_id)
select id, responsable_id
from projects
where responsable_id is not null
on conflict do nothing;

-- 4. Eliminar la columna vieja (ya migrada a project_empresas)
alter table projects drop column if exists responsable_id;
