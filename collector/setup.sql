-- Execute este SQL no Supabase → SQL Editor antes de rodar o coletor

create table if not exists double_results (
  id         text        primary key,
  color      text        not null check (color in ('red', 'black', 'white')),
  number     integer,
  created_at timestamptz default now()
);

-- Índices para consultas rápidas
create index if not exists idx_double_color   on double_results(color);
create index if not exists idx_double_created on double_results(created_at desc);

-- Habilitar Row Level Security (opcional mas recomendado)
alter table double_results enable row level security;

-- Política pública de leitura (o frontend pode ler sem autenticação)
create policy "Leitura pública" on double_results
  for select using (true);

-- Somente service_role pode inserir/atualizar
create policy "Inserção via service_role" on double_results
  for insert using (auth.role() = 'service_role');
