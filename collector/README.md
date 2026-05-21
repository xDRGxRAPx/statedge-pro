# StatEdge Coletor — Double da Blaze → Supabase

Coleta dados em tempo real do jogo Double da Blaze e salva na tabela `double_results` do Supabase.

## Como rodar

```bash
cd collector
npm install
npm start
```

## Variáveis de ambiente obrigatórias

| Variável | Descrição |
|----------|-----------|
| `SUPABASE_URL` | URL do projeto Supabase (ex: `https://xyz.supabase.co`) |
| `SUPABASE_KEY` | service_role key do Supabase |

## Tabela no Supabase

Execute este SQL no Supabase → SQL Editor:

```sql
create table if not exists double_results (
  id text primary key,
  color text not null,
  number integer,
  created_at timestamptz default now()
);

-- Índice para consultas por cor e data
create index if not exists idx_double_color on double_results(color);
create index if not exists idx_double_created on double_results(created_at desc);
```

## Arquitetura

O coletor usa duas estratégias em paralelo:

1. **WebSocket (Socket.io)** — recebe eventos em tempo real da Blaze
2. **HTTP polling** — fallback a cada 12 segundos

## Aviso sobre bloqueio geográfico (HTTP 451)

A API HTTP da Blaze bloqueia IPs fora do Brasil (erro 451).

**Solução para produção:** faça deploy no Railway com região South America:

```
railway.app → New Project → Deploy from GitHub
→ Configurar: SUPABASE_URL e SUPABASE_KEY
→ Região: South America (São Paulo)
→ Start command: node collector/index.js
```

O WebSocket não sofre o mesmo bloqueio e funcionará mesmo em IPs internacionais.

## Estrutura dos dados salvos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | text | ID único da rodada |
| `color` | text | `red`, `black` ou `white` |
| `number` | integer | Número sorteado |
| `created_at` | timestamptz | Data/hora da rodada |
