-- ============================================
-- Row Level Security (RLS) para todas as tabelas
-- Protege dados de usuarios mesmo se houver bug no app
-- ============================================

-- 1. PROFILES
-- Usuarios podem ler e atualizar apenas seu proprio perfil
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Service role (usado pelo backend) ignora RLS automaticamente


-- 2. WORKFLOWS
-- Usuarios podem CRUD apenas seus proprios workflows
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own workflows" ON workflows;
CREATE POLICY "Users can read own workflows" ON workflows
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own workflows" ON workflows;
CREATE POLICY "Users can create own workflows" ON workflows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own workflows" ON workflows;
CREATE POLICY "Users can update own workflows" ON workflows
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own workflows" ON workflows;
CREATE POLICY "Users can delete own workflows" ON workflows
  FOR DELETE USING (auth.uid() = user_id);


-- 3. GENERATIONS
-- Usuarios podem ler e inserir apenas suas proprias geracoes
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own generations" ON generations;
CREATE POLICY "Users can read own generations" ON generations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own generations" ON generations;
CREATE POLICY "Users can insert own generations" ON generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 4. CREDIT_LOGS
-- Usuarios podem ler apenas seus proprios logs de credito
ALTER TABLE credit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own credit logs" ON credit_logs;
CREATE POLICY "Users can read own credit logs" ON credit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Insert feito via service role (backend), nao precisa policy de insert pra anon


-- 5. TRAINED_MODELS
-- Usuarios podem CRUD apenas seus proprios modelos treinados
ALTER TABLE trained_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own models" ON trained_models;
CREATE POLICY "Users can read own models" ON trained_models
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own models" ON trained_models;
CREATE POLICY "Users can create own models" ON trained_models
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own models" ON trained_models;
CREATE POLICY "Users can update own models" ON trained_models
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own models" ON trained_models;
CREATE POLICY "Users can delete own models" ON trained_models
  FOR DELETE USING (auth.uid() = user_id);


-- 6. COUPONS
-- Somente leitura publica (pra validacao), escrita via service role (admin)
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active coupons" ON coupons;
CREATE POLICY "Anyone can read active coupons" ON coupons
  FOR SELECT USING (active = true);


-- 7. COUPON_USES
-- Usuarios podem ler apenas seus proprios usos
ALTER TABLE coupon_uses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own coupon uses" ON coupon_uses;
CREATE POLICY "Users can read own coupon uses" ON coupon_uses
  FOR SELECT USING (auth.uid() = user_id);


-- 8. WORKFLOW_TEMPLATES
-- Leitura publica (templates sao publicos), escrita via service role (admin)
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read templates" ON workflow_templates;
CREATE POLICY "Anyone can read templates" ON workflow_templates
  FOR SELECT USING (true);


-- 9. SYSTEM_PROMPT_TEMPLATES (se existir)
-- Leitura publica
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'system_prompt_templates') THEN
    EXECUTE 'ALTER TABLE system_prompt_templates ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can read system prompts" ON system_prompt_templates';
    EXECUTE 'CREATE POLICY "Anyone can read system prompts" ON system_prompt_templates FOR SELECT USING (true)';
  END IF;
END $$;


-- 10. WAITLIST
-- Qualquer um pode inserir (signup), leitura via service role (admin)
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can join waitlist" ON waitlist;
CREATE POLICY "Anyone can join waitlist" ON waitlist
  FOR INSERT WITH CHECK (true);
