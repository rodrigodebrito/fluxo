-- Adicionar campos detalhados ao credit_logs para historico completo
-- model: modelo usado (ex: "zimage-lora", "flux-2-pro")
-- prompt: prompt usado (truncado a 500 chars)
-- status: resultado da geracao ("success", "fail", "refund", "cancel", "purchase", "admin")
-- metadata: JSON com dados extras (result_urls, error, etc)

ALTER TABLE credit_logs
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS prompt TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_credit_logs_user_created ON credit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_logs_status ON credit_logs(status);
