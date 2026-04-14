-- Adicionar coluna provider e weights_url para suportar Z-Image Turbo LoRA (fal.ai)
-- provider: 'replicate' (default, Flux LoRA) ou 'fal-zimage' (Z-Image Turbo LoRA)
-- weights_url: URL dos pesos do LoRA treinado (usado por ambos providers)

ALTER TABLE trained_models
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'replicate',
  ADD COLUMN IF NOT EXISTS weights_url TEXT;
