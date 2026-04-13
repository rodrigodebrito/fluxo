-- Tabela pra persistir campanhas geradas no app UGC Campaign.
-- O JSONB `data` guarda o briefing completo + o resultado da campanha (scenes + caption)
-- pra que ao reabrir o app o usuario reidrate exatamente o estado de quando salvou.

CREATE TABLE IF NOT EXISTS ugc_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'untitled',
  product_thumbnail TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ugc_campaigns_user ON ugc_campaigns(user_id, updated_at DESC);

ALTER TABLE ugc_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own ugc_campaigns"
  ON ugc_campaigns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own ugc_campaigns"
  ON ugc_campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own ugc_campaigns"
  ON ugc_campaigns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users delete own ugc_campaigns"
  ON ugc_campaigns FOR DELETE
  USING (auth.uid() = user_id);
