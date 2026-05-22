-- Execute este SQL no Supabase → SQL Editor antes de rodar o coletor
-- Tabela unificada para Double e Crash

CREATE TABLE IF NOT EXISTS history (
  id          TEXT        PRIMARY KEY,
  game_type   TEXT        NOT NULL CHECK (game_type IN ('double', 'crash')),
  color       TEXT        CHECK (color IN ('red', 'black', 'white')),
  multiplier  FLOAT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_history_game_type ON history(game_type);
CREATE INDEX IF NOT EXISTS idx_history_created    ON history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_color      ON history(color);

-- Habilitar Row Level Security
ALTER TABLE history ENABLE ROW LEVEL SECURITY;

-- Leitura pública (frontend acessa sem autenticação)
CREATE POLICY "Leitura pública" ON history
  FOR SELECT USING (true);

-- Inserção apenas via service_role (coletor backend)
CREATE POLICY "Inserção via service_role" ON history
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Manter tabela antiga double_results (dados legados)
CREATE TABLE IF NOT EXISTS double_results (
  id         TEXT        PRIMARY KEY,
  color      TEXT        NOT NULL CHECK (color IN ('red', 'black', 'white')),
  number     INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_double_color   ON double_results(color);
CREATE INDEX IF NOT EXISTS idx_double_created ON double_results(created_at DESC);
ALTER TABLE double_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública dr" ON double_results
  FOR SELECT USING (true);

CREATE POLICY "Inserção via service_role dr" ON double_results
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
