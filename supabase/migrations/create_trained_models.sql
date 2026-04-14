-- Tabela de modelos treinados (LoRA) via Replicate
CREATE TABLE IF NOT EXISTS trained_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  trigger_word TEXT NOT NULL,
  replicate_model_id TEXT,
  replicate_version TEXT,
  training_id TEXT,
  status TEXT DEFAULT 'uploading' CHECK (status IN ('uploading', 'training', 'ready', 'failed')),
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_trained_models_user ON trained_models(user_id);
CREATE INDEX IF NOT EXISTS idx_trained_models_status ON trained_models(status);
