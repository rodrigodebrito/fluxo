# Fluxo AI

Plataforma visual node-based para criação de imagens, vídeos e automações com IA.

O projeto combina editor visual em canvas, workflows persistidos, biblioteca de templates, créditos/pagamentos, treinamento de modelos próprios e múltiplos providers de geração.

## Visão geral

Áreas principais do produto:
- landing pública
- dashboard de workflows
- editor visual com nós e pipeline
- histórico de gerações
- créditos, pricing e checkout
- modelos treinados / LoRAs
- painel administrativo
- apps auxiliares dentro do editor

Arquivos de referência:
- `src/app/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/editor/[id]/page.tsx`
- `src/app/history/page.tsx`
- `src/app/credits/page.tsx`
- `src/app/models/page.tsx`
- `src/app/admin/page.tsx`

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- `@xyflow/react` para o editor visual
- Supabase (Auth, Postgres, Storage, RLS)
- Kie.ai
- fal.ai
- Replicate
- OpenAI
- Mercado Pago
- Sentry

Arquivos:
- `package.json`
- `next.config.ts`
- `src/lib/supabase/*`
- `src/lib/ai/*`

## Principais áreas da aplicação

### Dashboard
Gerencia workflows do usuário, templates públicos e atalhos para histórico/modelos.

- `src/app/dashboard/page.tsx`
- `src/app/api/workflows/route.ts`
- `src/app/api/public-templates/route.ts`

### Editor visual
Canvas principal com execução de pipeline, autosave, painel de parâmetros, recuperação de tasks pendentes e aba de apps auxiliares.

- `src/app/editor/[id]/page.tsx`
- `src/components/Editor/FlowEditor.tsx`
- `src/components/Panel/NodePanel.tsx`
- `src/components/Sidebar/Sidebar.tsx`
- `src/lib/pipeline/executor.ts`

### Modelos treinados
Treino e uso de LoRAs/modelos próprios.

- `src/app/models/page.tsx`
- `src/app/api/training/create/route.ts`
- `src/app/api/training/create-zimage/route.ts`
- `src/app/api/training/status/route.ts`
- `src/app/api/training/list/route.ts`

### Créditos / checkout
Compra de créditos, histórico, cupons e reembolso.

- `src/app/pricing/page.tsx`
- `src/app/credits/page.tsx`
- `src/app/api/checkout/route.ts`
- `src/app/api/coupons/validate/route.ts`
- `src/app/api/credits/history/route.ts`
- `src/app/api/credits/refund/route.ts`
- `src/app/api/webhook/mercadopago/route.ts`

### Administração
Usuários, créditos, templates, cupons, estatísticas e saldos dos providers.

- `src/app/admin/page.tsx`
- `src/app/api/admin/*`

## Setup local

### Pré-requisitos
- Node.js 18+
- projeto Supabase configurado
- chaves dos providers usados
- ambiente com acesso a Mercado Pago, se for testar checkout
- `ffmpeg-static` é usado no fluxo de extração de áudio

### Scripts
```bash
npm run dev
npm run build
npm run start
npm run lint
```

### Observações de runtime
- o app valida variáveis de ambiente no boot do servidor
- o build usa `output: "standalone"`
- o editor e uploads trabalham com payloads relativamente grandes; há configuração de body size no Next

Arquivos:
- `package.json`
- `next.config.ts`
- `src/lib/env.ts`
- `src/instrumentation.ts`
- `src/app/api/extract-audio/route.ts`

## Variáveis de ambiente

### Obrigatórias
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `KIE_API_KEY`
- `OPENAI_API_KEY`
- `FAL_KEY`

### Opcionais / por integração
- `REPLICATE_API_TOKEN`
- `REPLICATE_USERNAME`
- `PIAPI_API_KEY`
- `MP_ACCESS_TOKEN`
- `MP_WEBHOOK_SECRET`
- `REPLICATE_WEBHOOK_SECRET`
- `FAL_ADMIN_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`
- `CI`

Arquivos:
- `src/lib/env.ts`
- `next.config.ts`
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `src/app/api/checkout/route.ts`
- `src/app/api/training/create/route.ts`

## Supabase / banco / storage

### Tabelas principais inferíveis pelo código
- `profiles`
- `credit_logs`
- `generations`
- `workflows`
- `trained_models`
- `coupons`
- `coupon_uses`
- `workflow_templates`
- `ugc_campaigns`
- `waitlist`

### Storage
Bucket principal:
- `upload`

Usos principais:
- upload de imagens e arquivos do editor
- persistência de saídas do Replicate
- saída de extração de áudio
- treino de modelos

Arquivo:
- `src/app/api/upload/route.ts`

### Migrations relevantes
- `supabase/migrations/atomic_credit_debit.sql`
- `supabase/migrations/add_credit_history.sql`
- `supabase/migrations/add_generations_task_id.sql`
- `supabase/migrations/add_can_train_models.sql`
- `supabase/migrations/add_trained_models_provider.sql`
- `supabase/migrations/create_trained_models.sql`
- `supabase/migrations/create_coupons.sql`
- `supabase/migrations/create_ugc_campaigns.sql`
- `supabase/migrations/create_workflow_templates.sql`
- `supabase/migrations/enable_rls_policies.sql`

### RLS
O projeto usa RLS nas tabelas sensíveis, com políticas para leitura/escrita do próprio usuário nas entidades principais.

Arquivo:
- `supabase/migrations/enable_rls_policies.sql`

## Auth e middleware

- auth via Supabase
- rotas públicas incluem landing, login, registro, callback, reset de senha e pricing
- `/api/*` trata autenticação internamente
- middleware protege a navegação autenticada

Arquivos:
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/middleware.ts`
- `src/middleware.ts`

## Integrações externas

### Kie.ai
Provider principal para imagem, vídeo, avatar/TTS e parte dos fluxos de status.

- `src/lib/ai/kie.ts`
- `src/app/api/generate*.ts`
- `src/app/api/status/route.ts`

### fal.ai
Usado em modelos/fluxos específicos como Kling O3, Flux 2, BG Removal, Upscale e família Z-Image.

- `src/lib/ai/fal.ts`
- `src/app/api/generate-fal/route.ts`
- `src/app/api/status-fal/route.ts`

### Replicate
Treino de LoRA e inferência de modelos personalizados.

- `src/lib/ai/replicate.ts`
- `src/app/api/training/*`
- `src/app/api/generate-replicate/route.ts`
- `src/app/api/webhooks/replicate/route.ts`

### OpenAI
Usado para fluxos de texto/LLM e apps auxiliares.

- `src/app/api/generate-llm/route.ts`
- `src/app/api/chat/creative-director/route.ts`

### Mercado Pago
Checkout e confirmação de créditos via webhook.

- `src/app/api/checkout/route.ts`
- `src/app/api/webhook/mercadopago/route.ts`

## Pipeline e editor visual

Fluxo central:
1. usuário monta o workflow no canvas
2. `executor.ts` extrai prompt, imagens, vídeo, áudio e parâmetros
3. o sistema escolhe a rota/provider conforme o modelo
4. cria task assíncrona ou resolve geração síncrona
5. faz polling até sucesso/falha
6. salva histórico e gerencia refund quando aplicável

Recursos do editor visíveis no código:
- drag and drop de nós
- execução de nós selecionados
- autosave
- recuperação de tasks pendentes
- tabs `Canvas` e `App`
- composição de prompts
- roteamento entre nós
- concatenação de vídeo
- apps auxiliares embutidos

Arquivos:
- `src/lib/pipeline/executor.ts`
- `src/components/Editor/FlowEditor.tsx`
- `src/components/Panel/NodePanel.tsx`
- `src/types/nodes.ts`

## Modelos suportados

### Imagem
- Nano Banana Pro
- GPT Image 1.5
- GPT Image 1.5 Edit
- GPT Image 2
- Flux 2 Pro
- Flux 2 Edit
- Seedream 4.5 Edit
- Z-Image Turbo
- Z-Image I2I
- Z-Image LoRA
- Z-Image I2I + LoRA
- Background Removal
- Upscale
- Modelo treinado / LoRA

### Vídeo
- Veo 3.1
- Veo 3.1 Upscale 4K
- Seedance 2.0
- Kling 3
- Kling O3
- Kling O3 Edit
- Kling O3 Reference
- Kling Motion Control
- Wan 2.7
- Grok Imagine
- Kling Avatar TTS
- Happy Horse

### LLM / texto
- Any LLM no canvas
- GPT-4.1 / GPT-5.x nos fluxos de texto auxiliares

### Ferramentas
- Extract Audio
- Video Concat
- Last Frame
- Crop / Resize / utilitários do app

Fontes:
- `src/types/nodes.ts`
- `src/app/credits/page.tsx`
- `models.md`

## Créditos, cobrança e refund

Estado atual do fluxo:
- custo calculado no backend nas rotas críticas
- débito atômico via RPC `debit_credits`
- `credit_logs` registra `amount`, `reason`, `model`, `prompt`, `status`, `metadata`
- débito de tasks assíncronas salva `metadata.taskId`
- refund usa o débito persistido como fonte de verdade
- refund é idempotente por `taskId`
- `generations.task_id` passou a ser usado para reconciliação

### Compra de créditos
- checkout via Mercado Pago
- cupons opcionais
- bônus de primeira compra (`+50` créditos) no webhook

Arquivos:
- `src/lib/credits.ts`
- `src/lib/auth-guard.ts`
- `src/app/api/credits/refund/route.ts`
- `src/app/api/credits/history/route.ts`
- `src/app/api/checkout/route.ts`
- `src/app/api/webhook/mercadopago/route.ts`
- `src/app/api/generations/route.ts`

## Webhooks

### Mercado Pago
- valida assinatura se `MP_WEBHOOK_SECRET` estiver configurado
- processa pagamentos aprovados
- aplica idempotência por payment id
- registra compra e bônus de primeira compra

Arquivo:
- `src/app/api/webhook/mercadopago/route.ts`

### Replicate
- valida assinatura se `REPLICATE_WEBHOOK_SECRET` estiver configurado
- atualiza status de treino em `trained_models`

Arquivo:
- `src/app/api/webhooks/replicate/route.ts`

## Apps auxiliares dentro do editor

A aba `App` expõe ferramentas e fluxos prontos, por exemplo:
- Creative Director
- Clone Foto
- Crop Tool
- Resize Tool
- Seedance Cinematic
- System Prompt Generator
- UGC Campaign

Arquivos:
- `src/components/App/AppView.tsx`
- `src/components/App/*`

## Limitações e observações operacionais

- Se o upload no Supabase falhar, `/api/upload` faz fallback para `catbox.moe`
- Cancelar uma task em andamento não gera refund automático
- Extração de áudio depende de `ffmpeg-static`
- URLs do Replicate expiram; por isso o app tenta persistir resultados no Storage
- Alguns webhooks só validam assinatura se o secret estiver configurado
- `NEXT_PUBLIC_APP_URL` afeta callbacks e webhooks
- O projeto ainda possui warnings/erros de lint históricos fora do escopo funcional recente
- Treino de modelos depende de permissão explícita (`admin` ou `profiles.can_train_models = true`)

Arquivos:
- `src/app/api/upload/route.ts`
- `src/lib/pipeline/executor.ts`
- `src/app/api/extract-audio/route.ts`
- `src/app/api/generate-replicate/route.ts`
- `src/app/api/webhook/mercadopago/route.ts`
- `src/app/api/webhooks/replicate/route.ts`
- `src/lib/auth-guard.ts`

## Endpoints mais importantes

### Geração
- `/api/generate`
- `/api/generate-video`
- `/api/generate-gpt-image`
- `/api/generate-gpt-image-2`
- `/api/generate-kling`
- `/api/generate-seedance`
- `/api/generate-wan`
- `/api/generate-grok`
- `/api/generate-fal`
- `/api/generate-avatar`
- `/api/generate-seedream`
- `/api/generate-happyhorse`
- `/api/generate-replicate`
- `/api/generate-llm`
- `/api/extract-audio`
- `/api/upscale-veo-4k`

### Status / health
- `/api/status`
- `/api/status-fal`
- `/api/status-piapi`
- `/api/health`

### Workflows / templates
- `/api/workflows`
- `/api/templates`
- `/api/public-templates`

### Créditos / pagamentos
- `/api/credits/history`
- `/api/credits/refund`
- `/api/checkout`
- `/api/coupons/validate`
- `/api/webhook/mercadopago`

### Treino / webhooks
- `/api/training/create`
- `/api/training/create-zimage`
- `/api/training/status`
- `/api/training/list`
- `/api/webhooks/replicate`

## Estado atual da documentação

Este README foi escrito com base no código atual do projeto. Sempre que houver alteração relevante em:
- providers/modelos
- cobrança/refund
- migrations do Supabase
- webhooks
- apps auxiliares do editor

é recomendável atualizar este arquivo em conjunto.
