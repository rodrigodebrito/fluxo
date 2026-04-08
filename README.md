# Fluxo AI

Plataforma visual node-based para geracao de imagens e videos com IA. Inspirada no [Weavy.ai](https://app.weavy.ai), permite criar workflows conectando nos de prompt, imagens e modelos de IA em um canvas interativo.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **ReactFlow** (@xyflow/react v12) - canvas de nos
- **Supabase** (PostgreSQL + Auth + RLS) - banco de dados e autenticacao
- **Tailwind CSS 4** - estilizacao
- **Kie.ai API** - backend de IA (imagens, videos, avatar, TTS)
- **PiAPI** - Seedance 2.0 (video)
- **Replicate** - Fine-tune LoRA (modelos personalizados)
- **OpenAI API** - LLM (GPT-4o, GPT-4.1, GPT-5)
- **ElevenLabs** (via Kie.ai) - Text-to-Speech
- **Render** - deploy de producao

## Setup

### Pre-requisitos

- Node.js 18+
- Conta na [Kie.ai](https://kie.ai) para API key
- Projeto no [Supabase](https://supabase.com) (PostgreSQL + Auth)
- API key da [OpenAI](https://platform.openai.com) para funcionalidades LLM
- API key da [PiAPI](https://piapi.ai) para Seedance 2.0
- API token do [Replicate](https://replicate.com) para modelos personalizados (LoRA)

### Instalacao

```bash
cd fluxo-ai
npm install

# Configurar variaveis de ambiente (.env)
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
KIE_API_KEY="sua-api-key-aqui"
OPENAI_API_KEY="sk-..."
PIAPI_API_KEY="sua-piapi-key"
REPLICATE_API_TOKEN="r8_..."
REPLICATE_USERNAME="seu-username"

# Rodar em desenvolvimento
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

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
      generate-kling/        # Kling 3.0 (video)
      generate-seedance/     # Seedance 2.0 via PiAPI (video)
      generate-video/        # Veo 3.1 (video)
      generate-wan/          # Wan 2.1 (video)
      generate-fal/          # Fal.ai models (video/image)
      generate-avatar/       # Kling Avatar TTS (talking head)
      generate-replicate/    # Modelos personalizados LoRA (image)
      generate-llm/          # OpenAI GPT (text generation)
      training/              # Treino de modelos LoRA (create/status/list)
      webhooks/replicate/    # Webhook do Replicate (treino completo)
      status/                # Polling de status de tasks
      upload/                # Upload de arquivos (catbox.moe)
      workflows/             # CRUD de workflows
      templates/             # CRUD de system prompt templates
      credits/               # Saldo e historico de creditos
      admin/                 # Painel admin
      health/                # Health check
    editor/[id]/             # Pagina do editor (Canvas + App tabs)
    dashboard/               # Dashboard com workflows do usuario
    models/                  # Pagina "Meus Modelos" (treino LoRA)
    history/                 # Historico de geracoes
    terms/                   # Termos de uso
    login/                   # Pagina de login
    register/                # Pagina de registro
  components/
    App/
      AppView.tsx            # Grade de apps (aba App do editor)
      SystemPromptGenerator.tsx  # Gerador de system prompt com IA
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
      AnyLLMNode.tsx         # No de LLM (GPT-4o, GPT-4.1, GPT-5)
      RouterNode.tsx         # No roteador (split conexoes para multiplos destinos)
      PromptConcatNode.tsx   # No concatenador de prompts
      KlingElementNode.tsx   # No auxiliar para Kling Elements
      VideoConcatNode.tsx    # No de concatenacao de videos
      LastFrameNode.tsx      # No de last frame
      OutputNode.tsx         # No de saida
  lib/
    ai/kie.ts                # Funcoes de API para todos os modelos (Kie.ai, Avatar, TTS)
    ai/replicate.ts          # Replicate API (treino LoRA + inferencia)
    pipeline/executor.ts     # Orquestrador: extrai dados, faz upload, inicia geracao, polling
    auth-guard.ts            # Verificacao de auth e creditos nas API routes
    content-filter.ts        # Filtro de seguranca (blocklist CSAM)
    credits.ts               # Calculo de custos por modelo
    supabase/                # Clients Supabase (browser e server)
  types/nodes.ts             # Definicoes de modelos, handles, parametros
```

### Fluxo de dados

1. Usuario monta workflow no canvas conectando nos
2. Clica "Run Model" em um no de modelo
3. `executor.ts` percorre as edges para coletar prompt, imagens, parametros
4. Se houver LLM chain (AnyLLM conectado ao modelo), roda o LLM primeiro
5. Faz upload de imagens locais para catbox.moe (URLs permanentes)
6. Chama a API route correspondente ao modelo
7. API route verifica creditos, cobra, e chama a Kie.ai API
8. Polling a cada 3s ate task completar (com refund em caso de falha)
9. Resultado (URLs de imagens/videos) exibido no no do modelo

---

## Modelos disponiveis

### Imagens

| Modelo | Tipo | Descricao |
|--------|------|-----------|
| **Nano Banana Pro** | Text/Image to Image | Geracao de imagens de alta qualidade (1K/2K/4K) |
| **GPT Image 1.5** | Text to Image | OpenAI GPT Image, suporta fundo transparente |
| **GPT Image 1.5 Edit** | Image to Image | Edicao de imagens com GPT, aceita ate 16 imagens |
| **Modelo Treinado (LoRA)** | Text to Image | Modelos personalizados via Replicate fine-tune |

### Videos

| Modelo | Tipo | Descricao |
|--------|------|-----------|
| **Veo 3.1** | Text/Image to Video | Google Veo 3, modos Lite/Fast/Quality |
| **Seedance 2.0** | Text/Image to Video | ByteDance via PiAPI, modos Normal/Fast (preview) |
| **Kling 3** | Text/Image to Video | Kling 3.0, suporta elements (@element1-3) |
| **Kling Avatar TTS** | Image+Audio to Video | Talking head — foto + texto/audio vira video falando |

### Audio

| Modelo | Tipo | Descricao |
|--------|------|-----------|
| **ElevenLabs TTS** | Text to Speech | 21 vozes, multilingual v2 via Kie AI (integrado no Avatar) |

### LLM (Text Generation)

| Modelo | Descricao |
|--------|-----------|
| **GPT-4o** | Modelo rapido e eficiente da OpenAI |
| **GPT-4.1** | Modelo de ultima geracao da OpenAI |
| **GPT-5** | Modelo mais avancado da OpenAI |

---

## Ferramentas (Tools)

| Ferramenta | Descricao |
|------------|-----------|
| **Prompt** | Campo de texto para escrever prompts |
| **File Input** | Upload de imagens e videos com preview |
| **Audio Input** | Upload de audio (MP3/WAV/AAC/OGG/M4A) com player inline |
| **Any LLM** | No de LLM com suporte a vision (imagens), gera texto para usar como prompt |
| **Router** | Divide conexoes para multiplos destinos (auto-expande ao conectar) |
| **Prompt Concat** | Combina multiplos prompts em um so |
| **Video Concat** | Concatenacao de videos |
| **Last Frame** | Extrai ultimo frame de video |
| **Kling Element** | No auxiliar para Kling Elements (ate 3 elements com 2-4 imagens cada) |

---

## Aba App

O editor possui duas abas: **Canvas** (editor de workflow) e **App** (grade de aplicativos).

### Apps disponiveis

- **Gerador de System Prompt**: Preencha 7 campos e gere um system prompt profissional usando GPT-4o (1 credito). Suporta salvar e carregar templates.

---

## Tabela de custos

> Base: R$ 26,76 por 1.000 creditos (1 credito = R$ 0,02676)

### Imagens

| Modelo | Config | Creditos | Valor (R$) |
|--------|--------|----------|------------|
| Nano Banana Pro | 1K/2K | 18 | R$ 0,48 |
| Nano Banana Pro | 4K | 24 | R$ 0,64 |
| GPT Image 1.5 | Medium | 4 | R$ 0,11 |
| GPT Image 1.5 | High | 22 | R$ 0,59 |
| GPT Image 1.5 Edit | Medium | 4 | R$ 0,11 |
| GPT Image 1.5 Edit | High | 22 | R$ 0,59 |

### Veo 3.1

| Modo | Creditos | Valor (R$) |
|------|----------|------------|
| Lite | 30 | R$ 0,80 |
| Fast | 60 | R$ 1,61 |
| Quality | 250 | R$ 6,69 |

### Kling 3 (custo por segundo x duracao)

| Modo | 5s | 8s | 10s | 15s |
|------|----|----|-----|-----|
| Std sem audio | R$ 1,87 | R$ 3,00 | R$ 3,74 | R$ 5,62 |
| Std com audio | R$ 2,68 | R$ 4,28 | R$ 5,35 | R$ 8,03 |
| Pro sem audio | R$ 2,41 | R$ 3,85 | R$ 4,82 | R$ 7,22 |
| Pro com audio | R$ 3,61 | R$ 5,78 | R$ 7,22 | R$ 10,83 |

### Seedance 2.0 (via PiAPI)

| Modo | Creditos | Valor (R$) |
|------|----------|------------|
| Normal (preview) | 50 | R$ 1,34 |
| Fast (preview) | 30 | R$ 0,80 |

### Kling Avatar TTS

| Modo | Creditos | Valor (R$) |
|------|----------|------------|
| Standard (720p) | 40 | R$ 1,07 |
| Pro (1080p) | 80 | R$ 2,14 |

### Modelo Treinado (LoRA)

| Acao | Creditos | Valor (R$) |
|------|----------|------------|
| Treinar modelo | 50 | R$ 1,34 |
| Gerar 1 imagem | 10 | R$ 0,27 |

### LLM

| Modelo | Creditos | Valor (R$) |
|--------|----------|------------|
| Any LLM (qualquer) | 1 | R$ 0,03 |

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
- **Any LLM**: no de LLM com suporte a vision, dropdown de modelos, temperatura
- **Router**: auto-expande outputs ao conectar (sem botoes)
- **Prompt Concat**: combina multiplos prompts com textarea adicional
- **Kling Element**: name/description, imagens conectadas, auto-detecta element number
- **Gallery**: fullscreen com navegacao, download e copia de link

### Pipeline
- Upload automatico para catbox.moe
- LLM chain: AnyLLM pre-processa prompt antes da geracao de imagem/video
- Router pass-through: resolucao recursiva para encontrar no de origem real
- Polling automatico com progresso
- Cancelar geracao em andamento (AbortController)
- Suporte a multiplas runs por execucao
- Custo dinamico calculado em tempo real

### Autenticacao e creditos
- Supabase Auth (email/senha) com RLS
- Sistema de creditos com charge-then-refund
- Verificacao de saldo antes de gerar
- Exibicao de creditos no header
- Admin panel para gerenciar creditos
- Rate limiting por usuario

### Seguranca
- Filtro de conteudo (blocklist CSAM) em todas as rotas de geracao
- Termos de uso com politica NSFW e tolerancia zero para CSAM
- Content filter com deteccao contextual (combinacao de keywords)

### Modelos personalizados (LoRA)
- Upload de 5-30 fotos para treinar modelo personalizado
- Treino via Replicate (~2 min)
- Inferencia via flux-dev-lora com disable_safety_checker
- Pagina "Meus Modelos" para gerenciar modelos treinados
- Suporte a Extra LoRA (combinar 2 modelos)

### Avatar TTS
- Kling Avatar (standard 720p / pro 1080p) via Kie AI
- ElevenLabs TTS multilingual v2 integrado (21 vozes)
- Fluxo: texto → TTS → audio → Avatar (automatico)
- Ou: audio externo → Avatar (via Audio Input node)

### Persistencia
- Workflows salvos em PostgreSQL via Supabase
- System prompt templates salvos por usuario
- Auto-save de workflows
- Historico de geracoes com galeria

### App
- Aba App no editor com grade de aplicativos
- Gerador de System Prompt (7 campos, GPT-4o, salvar/carregar templates)

---

## Features especificas por modelo

### Kling 3 - Elements
1. Adicione um no "Kling Element" ao canvas
2. Conecte 2-4 imagens de referencia (File Input) ao Kling Element
3. Conecte o Kling Element ao handle "Element 1/2/3" do Kling 3
4. No prompt, use `@element1`, `@element2`, etc.

### GPT Image 1.5 - Background transparente
Disponivel apenas no modo text-to-image, selecione "Transparent" no parametro Background.

### Seedance 2.0 - Referencia de imagem
1. Conecte imagens de referencia (File Input) ao Seedance 2.0
2. O sistema auto-injeta `@image1`, `@image2` no prompt
3. Usa modo `omni_reference` automaticamente quando ha imagens/video/audio
4. Sempre usa versao preview (aceita rostos reais sem bloqueio)

### Kling Avatar TTS - Talking Head
1. Adicione um no "Kling Avatar TTS" e conecte uma foto (File Input)
2. **Opcao A:** Escreva texto no painel → TTS gera audio → Avatar gera video
3. **Opcao B:** Conecte um no "Audio Input" com audio externo → Avatar gera video
4. Escolha entre 21 vozes do ElevenLabs, ajuste velocidade (0.5x - 2.0x)
5. Qualidade: Standard (720p, 40 cred) ou Pro (1080p, 80 cred)

### Modelo Treinado (LoRA) - Fine-tune personalizado
1. Va em "Meus Modelos" e clique "Treinar Novo Modelo"
2. Suba 5-30 fotos da mesma pessoa, escolha nome e trigger word
3. Aguarde ~2 min o treino no Replicate (50 creditos)
4. No editor, arraste "Modelo Treinado" e selecione seu modelo
5. Use a trigger word no prompt para gerar imagens com o rosto/corpo treinado

### Any LLM - Chain com modelos de imagem/video
1. Adicione um no Any LLM e conecte um Prompt ao input
2. Conecte a saida do Any LLM ao input "prompt" de um modelo de imagem/video
3. O LLM gera o texto primeiro, depois esse texto e usado como prompt para a geracao

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
| `PIAPI_API_KEY` | PiAPI | Sim (Seedance 2.0) |
| `REPLICATE_API_TOKEN` | Replicate | Sim (modelos LoRA) |
| `REPLICATE_USERNAME` | Replicate | Sim (modelos LoRA) |

---

## Plano de negocio

### Modelo de monetizacao: Assinatura + Creditos avulsos

#### Planos mensais

> Precos incluem custo de infraestrutura.

**Preco promocional (primeiros 100 usuarios) — 30% de desconto:**

| Plano | Promo (100 primeiros) | Preco regular | Creditos | Margem promo | Margem regular |
|-------|----------------------|---------------|----------|-------------|----------------|
| **Free** | R$ 0 | R$ 0 | 50 | Aquisicao | Aquisicao |
| **Starter** | **R$ 34,90/mes** | R$ 49,90/mes | 700 | **31%** | **51%** |
| **Creator** | **R$ 79,90/mes** | R$ 114,90/mes | 1.700 | **32%** | **53%** |
| **Pro** | **R$ 179,90/mes** | R$ 249,90/mes | 4.000 | **34%** | **52%** |

> Creditos do plano expiram no final do mes. Os 100 primeiros usuarios mantem o preco promocional enquanto a assinatura estiver ativa.

#### Creditos avulsos

| Pacote | Preco | Creditos | Margem |
|--------|-------|----------|--------|
| **500** | R$ 24,90 | 500 | **33%** |
| **1.000** | R$ 44,90 | 1.000 | **30%** |
| **2.500** | R$ 99,90 | 2.500 | **33%** |

Creditos avulsos nao expiram.

---

## Comparacao: Fluxo AI vs Weavy.ai

| | Weavy Starter | Fluxo Creator (promo) | Weavy Pro | Fluxo Pro (promo) |
|---|---|---|---|---|
| **Preco** | $24 (~R$ 137) | R$ 79,90 | $45 (~R$ 257) | R$ 179,90 |
| **Creditos** | 1.500 | 1.700 | 4.000 | 4.000 |
| **vs Weavy** | — | **42% mais barato** | — | **30% mais barato** |

### Vantagens competitivas

1. **Preco em BRL** — pagamento via PIX, sem cartao internacional
2. **Custo por credito** — 50-60% menor que o Weavy
3. **Custo por geracao** — 20-25% menos creditos por geracao nos mesmos modelos
4. **Imagem + Video** — mesma plataforma para ambos
5. **Modelos de ponta** — Kling 3, Veo 3.1, GPT Image 1.5
6. **LLM integrado** — pre-processamento de prompts com GPT

---

## Estrategia de lancamento

### Publico-alvo

| Quem | Uso no Fluxo AI |
|---|---|
| **Criador UGC** | Gera videos de produto sozinho |
| **Lojista Shopee/ML** | Gera fotos profissionais com IA |
| **Social media** | Cria conteudo unico com IA |
| **Agencia pequena** | Workflow automatizado |
| **Afiliado digital** | Gera criativos ilimitados |

### Modelo: Ensina e Vende

O mercado brasileiro de IA criativa nao tem ninguem. Quem educa o mercado, domina o mercado.

```
Conteudo gratuito (atrai)          →    Produto pago (converte)
─────────────────────────────────────────────────────────────
Reels/TikTok mostrando resultado   →    "Fiz isso no Fluxo AI"
Tutorial "como fazer X com IA"     →    "Link na bio, 50 creditos gratis"
Live montando workflow ao vivo     →    "Assina o Creator por R$ 79,90"
```

---

## Proximos passos

### Alta prioridade
- **Pagamento** — Stripe com PIX, cartao e boleto
- **Storage proprio** — Cloudflare R2 (substituir catbox.moe)

### Media prioridade
- **Templates de workflow** — workflows pre-montados para clonar
- **Batch processing** — rodar workflow com diferentes inputs
- **Variaveis no prompt** — {{nome}}, {{produto}} para reusar workflows

### Futuro
- **Wan 2.1 I2V** — video NSFW a partir de imagem (apos estabilizar gerador)
- **Workflow marketplace** — publicar e vender templates
- **API publica** — expor workflows como endpoints REST
- **Integracao redes sociais** — publicar direto no Instagram/TikTok
- **Modo mobile** — interface responsiva para workflows simples
- **Webhooks** — conectar com Zapier/n8n/Make

---

## Licenca

Projeto privado.
