-- Adicionar task_id ao historico de geracoes para reconciliar cobranca/refund por task
-- Permite vincular resultado persistido ao debito original no credit_logs

ALTER TABLE generations
  ADD COLUMN IF NOT EXISTS task_id TEXT;

CREATE INDEX IF NOT EXISTS idx_generations_user_task_id ON generations(user_id, task_id);
CREATE INDEX IF NOT EXISTS idx_generations_task_id ON generations(task_id);
