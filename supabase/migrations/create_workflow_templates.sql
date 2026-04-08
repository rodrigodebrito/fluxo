CREATE TABLE workflow_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'geral',
  thumbnail TEXT,
  data JSONB NOT NULL, -- { nodes: [], edges: [] }
  is_published BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_templates_published ON workflow_templates(is_published);
CREATE INDEX idx_workflow_templates_category ON workflow_templates(category);
