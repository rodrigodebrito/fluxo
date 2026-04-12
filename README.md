# Fluxo AI

Plataforma visual node-based para geracao de imagens e videos com IA. Inspirada no [Weavy.ai](https://app.weavy.ai), permite criar workflows conectando nos de prompt, imagens e modelos de IA em um canvas interativo.

O diferencial nao e o modelo — e o fluxo. Nenhuma ferramenta gratis conecta imagem → LLM → video → extract audio → avatar num pipeline automatizado. O usuario monta o fluxo uma vez e depois so troca o input.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **ReactFlow** (@xyflow/react v12) - canvas de nos
- **Supabase** (PostgreSQL + Auth + RLS) - banco de dados e autenticacao
- **Tailwind CSS 4** - estilizacao
- **Kie.ai API** - backend de IA (imagens, videos, avatar, TTS, Seedance 2.0)
- **fal.ai** - Kling O3, Flux 2 Pro, BG Removal, Upscale, Z-Image Turbo
- **Replicate** - Fine-tune LoRA (modelos personalizados)
- **PiAPI** - Seedance 2.0 (fallback, codigo pronto)
- **OpenAI API** - LLM (GPT-4.1, GPT-5.4 family)
- **ElevenLabs** (via Kie.ai) - Text-to-Speech
- **Mercado Pago** - pagamentos (PIX, cartao)
- **Render** - deploy de producao

## Setup

### Pre-requisitos

- Node.js 18+
- Conta na [Kie.ai](https://kie.ai) para API key
- Projeto no [Supabase](https://supabase.com) (PostgreSQL + Auth)
- API key da [OpenAI](https://platform.openai.com) para funcionalidades LLM
- API key da [fal.ai](https://fal.ai) para Kling O3, Flux, BG Removal, Upscale, Z-Image
- API token do [Replicate](https://replicate.com) para modelos personalizados (LoRA)
- Conta no [Mercado Pago](https://www.mercadopago.com.br/developers) para pagamentos

### Instalacao

```bash
cd fluxo-ai
npm install

# Configurar variaveis de ambiente (.env.local)
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
KIE_API_KEY="sua-api-key-aqui"
OPENAI_API_KEY="sk-..."
FAL_KEY="sua-fal-key"
FAL_ADMIN_KEY="sua-fal-admin-key"  # Para consultar saldo no admin
REPLICATE_API_TOKEN="r8_..."
REPLICATE_USERNAME="seu-username"
MP_ACCESS_TOKEN="seu-mp-access-token"

# Opcionais
PIAPI_API_KEY="sua-piapi-key"  # Seedance 2.0 via PiAPI (fallback)
MP_WEBHOOK_SECRET="secret-do-mp"  # Verificacao de assinatura do webhook
REPLICATE_WEBHOOK_SECRET="secret-do-replicate"  # Verificacao de webhook de treino

# Rodar em desenvolvimento
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

### Migrations (Supabase SQL Editor)

Rodar no SQL Editor do Supabase antes de usar:

1. `supabase/migrations/create_trained_models.sql`
2. `supabase/migrations/create_coupons.sql`
3. `supabase/migrations/create_workflow_templates.sql`
4. `supabase/migrations/add_credit_history.sql`
5. `supabase/migrations/atomic_credit_debit.sql` — funcao atomica pra debitar creditos
6. `supabase/migrations/enable_rls_policies.sql` — RLS em todas as tabelas

### Build de producao

```bash
npm run build
npm start
```

---

## Arquitetura

```
src/
  app/
    api/
      generate/              # Nano Banana Pro (image)
      generate-gpt-image/    # GPT Image 1.5 (text-to-image e image-to-image)
      generate-kling/        # Kling 3.0 + Kling Motion (video)
      generate-seedance/     # Seedance 2.0 via Kie AI (default) ou PiAPI (fallback)
      generate-video/        # Veo 3.1 (video)
      generate-wan/          # Wan 2.7 (video)
      generate-grok/         # Grok Imagine I2V (video)
      generate-fal/          # fal.ai models (Kling O3, Flux, BG Removal, Upscale, Z-Image)
      generate-avatar/       # Kling Avatar TTS (talking head)
      generate-replicate/    # Modelos personalizados LoRA (image)
      generate-llm/          # OpenAI GPT (text generation)
      extract-audio/         # Extrair audio de video (ffmpeg)
      training/              # Treino de modelos LoRA (create/status/list)
      webhooks/replicate/    # Webhook do Replicate (treino completo)
      webhook/mercadopago/   # Webhook de pagamento Mercado Pago
      status/                # Polling de status (Kie AI)
      status-fal/            # Polling de status (fal.ai)
      status-piapi/          # Polling de status (PiAPI)
      upload/                # Upload de arquivos (Supabase Storage)
      workflows/             # CRUD de workflows
      templates/             # CRUD de system prompt templates
      credits/               # Saldo, historico e refund de creditos
      checkout/              # Checkout Mercado Pago
      admin/                 # Painel admin (usuarios, creditos, templates, saldos)
      health/                # Health check
    editor/[id]/             # Pagina do editor (Canvas + App tabs)
    dashboard/               # Dashboard estilo Weavy (templates + meus arquivos)
    models/                  # Pagina "Meus Modelos" (treino LoRA)
    history/                 # Historico de geracoes
    credits/                 # Historico de creditos do usuario
    admin/                   # Painel admin
    pricing/                 # Pagina de precos
    terms/                   # Termos de uso
    login/                   # Pagina de login
    register/                # Pagina de registro
  components/
    App/
      AppView.tsx            # Grade de apps (aba App do editor)
      SystemPromptGenerator.tsx  # Gerador de system prompt com IA (GPT-4.1)
      CloneFoto.tsx          # Gera prompt UGC a partir de foto de referencia (sem descrever pessoa)
      ResizeTool.tsx         # Redimensiona imagens grandes para input dos geradores
      SeedanceCinematic.tsx  # Gera prompts cinematograficos shot-by-shot para Seedance 2.0
    Editor/FlowEditor.tsx    # Canvas principal (ReactFlow, toolbar, context menu, undo/redo)
    Gallery/Gallery.tsx      # Galeria fullscreen de resultados
    Header/                  # Header com creditos e usuario
    Panel/NodePanel.tsx      # Painel lateral de parametros do modelo
    Sidebar/Sidebar.tsx      # Sidebar com categorias e cards de modelos
    nodes/
      PromptNode.tsx         # No de texto/prompt
      ImageInputNode.tsx     # No de upload de arquivos (imagens/videos)
      AudioInputNode.tsx     # No de upload de audio (MP3/WAV/AAC/OGG/M4A)
      ModelNode.tsx          # No de modelo de IA (generico para todos os modelos)
      AnyLLMNode.tsx         # No de LLM (GPT-4.1, GPT-5.4 family)
      RouterNode.tsx         # No roteador (split conexoes para multiplos destinos)
      PromptConcatNode.tsx   # No concatenador de prompts
      KlingElementNode.tsx   # No auxiliar para Kling Elements
      VideoConcatNode.tsx    # No de concatenacao de videos
      LastFrameNode.tsx      # No de last frame
      GroupNode.tsx           # No de grupo/secao (cores, notas, font size)
      OutputNode.tsx         # No de saida
  lib/
    ai/kie.ts                # Funcoes de API para todos os modelos (Kie.ai, Avatar, TTS)
    ai/fal.ts                # fal.ai models (Kling O3, Flux, BG Removal, Upscale, Z-Image)
    ai/replicate.ts          # Replicate API (treino LoRA + inferencia)
    pipeline/executor.ts     # Orquestrador: extrai dados, faz upload, inicia geracao, polling
    auth-guard.ts            # Verificacao de auth e creditos nas API routes
    content-filter.ts        # Filtro de seguranca (CSAM contextual)
    credits.ts               # Debit atomico, refund, calculo de custos por modelo
    rate-limit.ts            # Rate limiting por usuario e operacao
    mercadopago.ts           # Client Mercado Pago (checkout, pagamentos)
    supabase/                # Clients Supabase (browser e server)
  types/nodes.ts             # Definicoes de modelos, handles, parametros
```

### Fluxo de dados

1. Usuario monta workflow no canvas conectando nos
2. Clica "Run Model" em um no de modelo
3. `executor.ts` percorre as edges para coletar prompt, imagens, parametros
4. Se houver LLM chain (AnyLLM conectado ao modelo), roda o LLM primeiro
5. Faz upload de imagens locais para Supabase Storage
6. Chama a API route correspondente ao modelo
7. API route verifica creditos, cobra atomicamente, e chama a API do provider
8. Polling a cada 3s ate task completar (com refund automatico em caso de falha)
9. Tasks pendentes salvas em localStorage — recupera apos refresh da pagina
10. Resultado (URLs de imagens/videos) exibido no no do modelo

---

## Modelos disponiveis

### Imagens

| Modelo | Provider | Tipo | Descricao |
|--------|----------|------|-----------|
| **Nano Banana Pro** | Kie | Text/Image to Image | Geracao de imagens de alta qualidade (1K/2K/4K) |
| **GPT Image 1.5** | Kie | Text to Image | OpenAI GPT Image, suporta fundo transparente |
| **GPT Image 1.5 Edit** | Kie | Image to Image | Edicao de imagens com GPT, aceita ate 16 imagens |
| **Flux 2 Pro** | fal.ai | Text to Image | Imagens HD via fal.ai |
| **Flux 2 Edit** | fal.ai | Image to Image | Edicao de imagens com Flux |
| **Z-Image Turbo** | fal.ai | Text to Image | Imagem rapida e barata (6B params) |
| **Z-Image I2I** | fal.ai | Image to Image | Image to Image com Z-Image |
| **Z-Image LoRA** | fal.ai | Text to Image | Imagem com ate 3 LoRAs |
| **Z-Image I2I + LoRA** | fal.ai | Image to Image | I2I com ate 3 LoRAs |
| **Modelo Treinado (LoRA)** | Replicate | Text to Image | Modelos personalizados via fine-tune |

### Videos

| Modelo | Provider | Tipo | Descricao |
|--------|----------|------|-----------|
| **Veo 3.1** | Kie | Text/Image to Video | Google Veo 3, modos Lite/Fast/Quality |
| **Kling 3** | Kie | Text/Image to Video | Kling 3.0, suporta elements e multi-shot |
| **Kling Motion** | Kie | Motion Control | Kling 2.6/3.0, character + video de referencia |
| **Kling O3** | fal.ai | Image to Video | Kling O3 Pro, standard/pro com audio |
| **Kling O3 Edit** | fal.ai | Video to Video | Editar video existente com IA |
| **Kling O3 Ref** | fal.ai | Reference to Video | Video de referencia + imagens |
| **Seedance 2.0** | Kie | Text/Image to Video | ByteDance, modos Normal/Fast, refs de imagem/video/audio |
| **Wan 2.7** | Kie | Image to Video | Wan 2.7, 720p/1080p |
| **Grok Imagine** | Kie | Image to Video | I2V economico, 480p/720p |
| **Kling Avatar TTS** | Kie | Image+Audio to Video | Talking head — foto + texto/audio vira video falando |

### Audio/Ferramentas

| Ferramenta | Tipo | Descricao |
|------------|------|-----------|
| **Extract Audio** | Audio | Extrair audio de video (ffmpeg) |
| **BG Removal** | Imagem | Remover fundo (BiRefNet via fal.ai) |
| **Upscale** | Imagem | Aumentar resolucao (ESRGAN via fal.ai) |

### LLM (Text Generation)

| Modelo | Descricao |
|--------|-----------|
| **GPT-4.1** | Default, bom custo-beneficio, suporta vision |
| **GPT-5.4 Nano** | Mais barato da familia nova |
| **GPT-5.4 Mini** | Equilibrio custo/qualidade |
| **GPT-5.4** | Completo |
| **GPT-5.4 Pro** | Mais capaz (2 creditos) |

---

## Tabela de custos

> Consultar [models.md](models.md) para tabela completa com precos por provider.

### Custo base

| Creditos | USD | BRL |
|----------|-----|-----|
| 1 | $0.005 | R$0,03 |
| 10 | $0.05 | R$0,27 |
| 100 | $0.50 | R$2,67 |
| 1.000 | $5.00 | R$26,71 |

### Preco de venda (para o cliente)

| Pacote | Preco | Por credito | Margem |
|--------|-------|-------------|--------|
| 500 creditos | R$24,90 | R$0,050 | ~86% |
| 1.000 creditos | R$44,90 | R$0,045 | ~68% |
| 2.500 creditos | R$99,90 | R$0,040 | ~50% |

### Resumo de creditos por modelo

#### Imagens (fixo por geracao)

| Modelo | Creditos |
|--------|----------|
| Nano Banana Pro | 18 (24 em 4K) |
| GPT Image 1.5 | 4 low / 22 high |
| Flux 2 Pro | 6 (9 HD) |
| Z-Image Turbo | 2 |
| Z-Image I2I | 2 |
| Z-Image LoRA | 3 |
| BG Removal | 1 |
| Upscale | 2 |
| Custom LoRA | 10 |

#### Videos (por segundo)

| Modelo | Creditos/s |
|--------|-----------|
| Grok Imagine | 1.6/s (480p) / 3/s (720p) |
| Kling 3 Std | 14/s sem audio / 20/s com audio |
| Kling 3 Pro | 18/s sem audio / 27/s com audio |
| Kling O3 Std | 17/s sem audio / 23/s com audio |
| Kling O3 Pro | 23/s sem audio / 28/s com audio |
| Kling O3 Edit Std | 26/s |
| Kling O3 Edit Pro | 34/s |
| Kling Motion 2.6 | 6/s (720p) / 9/s (1080p) |
| Kling Motion 3.0 | 20/s (720p) / 27/s (1080p) |
| Kling Avatar Std | 8/s |
| Kling Avatar Pro | 16/s |
| Wan 2.7 | 16/s (720p) / 24/s (1080p) |
| Seedance 2.0 Std (Kie) | 41/s (720p, sem video input) |
| Seedance 2.0 Fast (Kie) | 33/s (720p, sem video input) |

#### Videos (fixo por geracao)

| Modelo | Creditos |
|--------|----------|
| Veo 3 Lite | 30 |
| Veo 3 Fast | 60 |
| Veo 3 Quality | 250 |

#### Outros

| Modelo | Creditos |
|--------|----------|
| LLM (todos exceto Pro) | 1 |
| LLM GPT-5.4 Pro | 2 |
| Extract Audio | 1 |

---

## Seguranca

### Implementado

- **Webhook Mercado Pago** — verificacao de assinatura HMAC-SHA256 (via `MP_WEBHOOK_SECRET`) + validacao do pagamento via API
- **Webhook Replicate** — verificacao de assinatura HMAC-SHA256 (via `REPLICATE_WEBHOOK_SECRET`)
- **Debit atomico de creditos** — funcao SQL `debit_credits` previne race condition em requests concorrentes
- **Refund protegido** — idempotencia (sem refund duplo), verificacao de debito existente, cap de valor maximo
- **RLS (Row Level Security)** — todas as tabelas protegidas a nivel de banco. Usuarios so acessam seus proprios dados
- **Upload com whitelist** — aceita apenas imagens, videos e audio. Bloqueia executaveis e scripts
- **Filtro de conteudo contextual** — termos inequivocos (loli, pedophilia, etc) sempre bloqueados; termos ambiguos (girl, boy, teen) so bloqueados quando combinados com conteudo sexual
- **Rate limiting** — por usuario e tipo de operacao (geracao, upload)
- **Auth em todas as rotas** — verificacao de sessao via Supabase Auth
- **Imagens persistentes** — imagens geradas via Replicate (LoRA) salvas no Supabase Storage (URLs do Replicate expiram em ~1h)

### Recuperacao de geracoes

Geracoes em andamento sao salvas em localStorage. Se o usuario recarregar a pagina ou fechar o browser acidentalmente, o polling retoma automaticamente ao reabrir o editor. Tasks com mais de 15 minutos sao descartadas.

---

## Providers de IA

### Seedance 2.0 — Kie AI (default)

O Seedance 2.0 foi migrado do PiAPI para o Kie AI como provider principal. Motivo: melhor suporte a rostos reais (PiAPI bloqueava com filtro de seguranca). O codigo do PiAPI continua pronto no app — basta passar `sdModel` com "piapi" para ativar.

**Precos Kie AI (720P, sem video input):**
- Standard: 41 cred/s ($0.205/s)
- Fast: 33 cred/s ($0.165/s)

### Monitoramento de saldo

O painel admin exibe saldo de todos os providers em tempo real:
- **fal.ai** — requer `FAL_ADMIN_KEY` (Admin API Key separada)
- **Kie AI** — via `/api/v1/chat/credit`
- **PiAPI** — via `/account/info`
- Alerta visual "SALDO BAIXO" quando saldo abaixo do threshold

---

## Historico de creditos

### Para o usuario
Pagina `/credits` mostra todas as transacoes: debitos, recargas, refunds, bonus. Com modelo, prompt, status e data.

### Para o admin
No painel admin, clicar em qualquer usuario abre modal com historico completo + estatisticas (total gasto, total adicionado, modelos mais usados).

---

## Funcionalidades implementadas

### Canvas e interacao
- Drag & drop de nos da sidebar para o canvas
- Menu de contexto (botao direito) com busca, categorias e scroll
- Multi-selecao com caixa de selecao (arrastar no canvas)
- Delete de nos/edges selecionados (Backspace/Delete)
- Undo/Redo (Ctrl+Z / Ctrl+Y) com historico de ate 50 snapshots
- Toolbar inferior: Select/Hand tools, Undo/Redo, Zoom dropdown
- Pan com botao direito do mouse
- Zoom com Ctrl + scroll

### Nos
- **Prompt**: campo de texto com suporte a variaveis
- **File Input**: upload de imagens e videos, preview inline, multiplos arquivos
- **Model**: no generico que se adapta ao modelo, exibe resultado com carousel
- **Any LLM**: no de LLM com suporte a vision, dropdown de modelos (GPT-4.1, GPT-5.4 family), temperatura
- **Router**: auto-expande outputs ao conectar (sem botoes)
- **Prompt Concat**: combina multiplos prompts com textarea adicional
- **Kling Element**: name/description, imagens conectadas, auto-detecta element number
- **Group**: cores customizaveis (8 opcoes), notas multi-linha, tamanho de fonte ajustavel
- **Gallery**: fullscreen com navegacao, download e copia de link

### Pipeline
- Upload automatico para Supabase Storage
- LLM chain: AnyLLM pre-processa prompt antes da geracao de imagem/video
- Router pass-through: resolucao recursiva para encontrar no de origem real
- Polling automatico com progresso
- Cancelar geracao em andamento (AbortController)
- Recuperacao automatica de geracoes apos refresh da pagina
- Suporte a multiplas runs por execucao
- Custo dinamico calculado em tempo real (por segundo para videos)
- Refund automatico quando geracao falha no provider

### Dashboard
- Layout estilo Weavy com carousel de templates no topo
- Secao "Meus arquivos" em grid compacto
- Templates com foto de capa (upload via admin)

### Autenticacao e creditos
- Supabase Auth (email/senha) com RLS em todas as tabelas
- Sistema de creditos com debit atomico (previne race condition)
- Verificacao de saldo antes de gerar
- Refund automatico em falha, com protecao contra refund duplicado
- Exibicao de creditos no header
- Historico de creditos com modelo, prompt e status
- Admin panel para gerenciar creditos, usuarios e templates
- Rate limiting por usuario

### Pagamento
- Checkout via Mercado Pago (PIX, cartao)
- Webhook com verificacao de assinatura HMAC-SHA256
- Idempotencia (nao processa pagamento duplicado)
- Bonus de 50 creditos na primeira compra
- Sistema de cupons de desconto

### Admin
- Painel com estatisticas (usuarios, geracoes, creditos gastos)
- Saldo dos providers em tempo real (fal.ai, Kie AI, PiAPI) com alerta de saldo baixo
- Gerenciamento de usuarios (creditos, historico)
- Clique em qualquer usuario para ver historico completo de geracoes
- CRUD de templates e cupons
- Gerenciamento de modelos treinados

### Seguranca
- Filtro de conteudo contextual em todas as rotas de geracao
- Webhooks com verificacao de assinatura
- Debit atomico de creditos
- RLS (Row Level Security) em todas as tabelas
- Upload com whitelist de tipos de arquivo
- Refund protegido com idempotencia e cap

### Modelos personalizados (LoRA)
- Upload de 5-30 fotos para treinar modelo personalizado
- Treino via Replicate (~2 min)
- Inferencia via flux-dev-lora com disable_safety_checker
- Imagens geradas persistidas no Supabase Storage (nao expiram)
- Pagina "Meus Modelos" para gerenciar modelos treinados
- Suporte a Extra LoRA (combinar 2+ modelos)

### Avatar TTS
- Kling Avatar (standard 720p / pro 1080p) via Kie AI
- ElevenLabs TTS multilingual v2 integrado (21 vozes)
- Fluxo: texto → TTS → audio → Avatar (automatico)
- Ou: audio externo → Avatar (via Audio Input node)
- Cobranca por segundo (8 cred/s standard, 16 cred/s pro)

### Persistencia
- Workflows salvos em PostgreSQL via Supabase
- System prompt templates salvos por usuario
- Auto-save de workflows
- Historico de geracoes com galeria
- Geracoes pendentes salvas em localStorage (recovery apos refresh)

---

## Features especificas por modelo

### Seedance 2.0 (Kie AI) - Referencia multimodal
1. Conecte imagens de referencia (File Input) ao Seedance 2.0
2. Conecte video de referencia (handle "Video Ref")
3. Conecte audio de referencia (handle "Audio")
4. Aceita ate 9 imagens, video e audio simultaneamente
5. Imagens de referencia sao registradas automaticamente na Asset Library do Kie AI antes de gerar (necessario para `@imageN` no prompt funcionar)
6. Se o Seedance Standard bloquear o prompt com erro "sensitive", a UI sugere tentar novamente no Seedance 2 Fast (filtro mais permissivo)

### App "Seedance 2 Cinematic" (aba Apps)
Gera prompts cinematograficos shot-by-shot prontos para colar no Seedance 2.0:
1. Brief criativo + ate 9 slots de imagem dinamicos, cada um com papel (character/scene/prop/style), descricao opcional e upload ou URL
2. Escolhe duracao (5/8/10/12/15s), aspect ratio e numero de shots
3. GPT-4.1 Vision analisa as imagens e monta um prompt estruturado com timecodes e movimentos de camera, usando `@image1`, `@image2`, etc.
4. Enforce do limite de 1536 caracteres do Seedance 2.0 com contador visual (verde/vermelho)

### Kling 3 - Elements + Multi-Shot
1. Adicione um no "Kling Element" ao canvas
2. Conecte 2-4 imagens de referencia (File Input) ao Kling Element
3. Conecte o Kling Element ao handle "Element 1/2/3" do Kling 3
4. No prompt, use `@element1`, `@element2`, etc.
5. Multi-shot: ate 3 shots de 5s cada = 15s de video em uma geracao

### GPT Image 1.5 - Background transparente
Disponivel apenas no modo text-to-image, selecione "Transparent" no parametro Background.

### Veo 3.1 - Image to Video
- Suporta First Frame + Last Frame (FIRST_AND_LAST_FRAMES_2_VIDEO)
- Quality mode funciona com imagem de referencia
- Audio gerado automaticamente

### Kling Avatar TTS - Talking Head
1. Adicione um no "Kling Avatar TTS" e conecte uma foto (File Input)
2. **Opcao A:** Escreva texto no painel → TTS gera audio → Avatar gera video
3. **Opcao B:** Conecte um no "Audio Input" com audio externo → Avatar gera video
4. Escolha entre 21 vozes do ElevenLabs, ajuste velocidade (0.5x - 2.0x)
5. Cobranca por segundo: Standard 8 cred/s, Pro 16 cred/s

### Modelo Treinado (LoRA) - Fine-tune personalizado
1. Va em "Meus Modelos" e clique "Treinar Novo Modelo"
2. Suba 5-30 fotos da mesma pessoa, escolha nome e trigger word
3. Aguarde ~2 min o treino no Replicate (50 creditos)
4. No editor, arraste "Modelo Treinado" e selecione seu modelo
5. Use a trigger word no prompt para gerar imagens com o rosto/corpo treinado
6. Imagens geradas sao salvas permanentemente no Supabase Storage

### Any LLM - Chain com modelos de imagem/video
1. Adicione um no Any LLM e conecte um Prompt ao input
2. Conecte a saida do Any LLM ao input "prompt" de um modelo de imagem/video
3. O LLM gera o texto primeiro, depois esse texto e usado como prompt para a geracao
4. Suporta vision: conecte imagens ao LLM para gerar prompts baseados em referencia

### Extract Audio
1. Conecte um video (de um Model node ou File Input) ao Extract Audio
2. Escolha formato MP3 ou WAV
3. O audio extraido pode ser conectado a outros nos (Kling Avatar, etc.)

---

## Deploy

O projeto esta em producao no **Render** com deploy automatico a partir do branch `master` no GitHub.

### Variaveis de ambiente (producao)

| Variavel | Servico | Obrigatoria |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Sim |
| `KIE_API_KEY` | Kie.ai | Sim |
| `OPENAI_API_KEY` | OpenAI | Sim |
| `FAL_KEY` | fal.ai | Sim |
| `FAL_ADMIN_KEY` | fal.ai | Recomendada (saldo no admin) |
| `REPLICATE_API_TOKEN` | Replicate | Sim (modelos LoRA) |
| `REPLICATE_USERNAME` | Replicate | Sim (modelos LoRA) |
| `MP_ACCESS_TOKEN` | Mercado Pago | Sim (pagamentos) |
| `MP_WEBHOOK_SECRET` | Mercado Pago | Recomendada (seguranca) |
| `REPLICATE_WEBHOOK_SECRET` | Replicate | Recomendada (seguranca) |
| `PIAPI_API_KEY` | PiAPI | Opcional (Seedance fallback) |

---

## Plano de negocio

### Modelo de monetizacao: Creditos avulsos

| Pacote | Preco | Por credito | Margem |
|--------|-------|-------------|--------|
| **500** | R$24,90 | R$0,050 | ~86% |
| **1.000** | R$44,90 | R$0,045 | ~68% |
| **2.500** | R$99,90 | R$0,040 | ~50% |

Creditos nao expiram. Pagamento via PIX, cartao ou Mercado Pago.

A margem esta na venda dos pacotes — o custo dos providers e repassado 1:1 em creditos para o usuario.

### Comparacao: Fluxo AI vs Weavy.ai

| | Weavy Starter | Fluxo 1.000 cred | Weavy Pro | Fluxo 2.500 cred |
|---|---|---|---|---|
| **Preco** | $24 (~R$137) | R$44,90 | $45 (~R$257) | R$99,90 |
| **Creditos** | 1.500 | 1.000 | 4.000 | 2.500 |
| **vs Weavy** | — | **67% mais barato** | — | **61% mais barato** |

### Vantagens competitivas

1. **Preco em BRL** — pagamento via PIX, sem cartao internacional
2. **Pipeline automatizado** — monte uma vez, troque o input e rode novamente
3. **Multi-provider** — Kie + fal.ai + Replicate + OpenAI na mesma plataforma
4. **Templates prontos** — workflows pre-montados para nichos (imobiliario, e-commerce, UGC)
5. **LLM integrado** — pre-processamento de prompts com GPT + vision
6. **Modelos de ponta** — Kling 3, Veo 3.1, GPT Image 1.5, Seedance 2.0

### Publico-alvo

| Quem | Uso no Fluxo AI |
|---|---|
| **Criador UGC** | Pipeline automatizado: gera 50 videos/semana sem pensar |
| **Lojista Shopee/ML** | Template "Video Produto" — troca foto, sai video pronto |
| **Corretor de imoveis** | Template "Tour FPV" — joga fotos novas de cada imovel |
| **Agencia pequena** | Workflow repetivel para multiplos clientes |
| **Social media** | Cria conteudo unico com IA em escala |

---

## Roadmap de melhorias

### Estado atual: 8/10

| Area | Nota | Status |
|------|------|--------|
| Arquitetura | 8/10 | Solida |
| UI/UX | 7.5/10 | Boa |
| Integracao IA | 8/10 | Forte |
| Features | 8/10 | Completa |
| Seguranca | 8/10 | Robusta |
| Producao | 7/10 | Funcional |
| Testes | 0/10 | Inexistente |

### O que falta para 10/10 em cada area

| Area | Atual | Para chegar a 10 |
|------|-------|-------------------|
| **Arquitetura** | 8 | Caching layer (SWR/React Query), validacao de env vars no startup, error boundary global, logging centralizado |
| **UI/UX** | 7.5 | Acessibilidade (ARIA labels, keyboard nav), dark/light mode, loading skeletons, toast notifications, responsivo mobile, i18n (PT/EN) |
| **Integracao IA** | 8 | Fallback automatico entre providers, retry com backoff exponencial, queue de geracoes, estimativa de tempo |
| **Features** | 8 | Pastas/organizacao de workflows, favoritos, compartilhar workflow, batch download, API publica |
| **Seguranca** | 8 | Rate limiting com Redis (Upstash), CSRF tokens, CSP headers, WAF, pen test, audit log de acoes admin |
| **Producao** | 7 | Monitoramento (Datadog/Grafana), alertas automaticos, CI/CD pipeline, staging environment, health checks detalhados |
| **Testes** | 0 | Testes unitarios (creditos, filtro, webhooks), testes de integracao, testes E2E (Playwright), coverage >80% |

---

## Licenca

Projeto privado.
