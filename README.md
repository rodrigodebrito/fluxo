# Fluxo AI

Plataforma visual node-based para geracao de imagens e videos com IA. Inspirada no [Weavy.ai](https://app.weavy.ai), permite criar workflows conectando nos de prompt, imagens e modelos de IA em um canvas interativo.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **ReactFlow** (@xyflow/react v12) - canvas de nos
- **Supabase** (PostgreSQL + Auth + RLS) - banco de dados e autenticacao
- **Tailwind CSS 4** - estilizacao
- **Kie.ai API** - backend de IA (imagens e videos)
- **OpenAI API** - LLM (GPT-4o, GPT-4.1, GPT-5)
- **Render** - deploy de producao

## Setup

### Pre-requisitos

- Node.js 18+
- Conta na [Kie.ai](https://kie.ai) para API key
- Projeto no [Supabase](https://supabase.com) (PostgreSQL + Auth)
- API key da [OpenAI](https://platform.openai.com) para funcionalidades LLM

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
      generate-seedance/     # Seedance 2.0 (video - desabilitado)
      generate-video/        # Veo 3.1 (video)
      generate-llm/          # OpenAI GPT (text generation)
      status/                # Polling de status de tasks
      upload/                # Upload de arquivos (catbox.moe)
      workflows/             # CRUD de workflows
      templates/             # CRUD de system prompt templates
      credits/               # Saldo e historico de creditos
      admin/                 # Painel admin
      health/                # Health check
    editor/[id]/             # Pagina do editor (Canvas + App tabs)
    dashboard/               # Dashboard com workflows do usuario
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
      ModelNode.tsx          # No de modelo de IA (generico para todos os modelos)
      AnyLLMNode.tsx         # No de LLM (GPT-4o, GPT-4.1, GPT-5)
      RouterNode.tsx         # No roteador (split conexoes para multiplos destinos)
      PromptConcatNode.tsx   # No concatenador de prompts
      KlingElementNode.tsx   # No auxiliar para Kling Elements
      VideoConcatNode.tsx    # No de concatenacao de videos
      LastFrameNode.tsx      # No de last frame
      OutputNode.tsx         # No de saida
  lib/
    ai/kie.ts                # Funcoes de API para todos os modelos (Kie.ai)
    pipeline/executor.ts     # Orquestrador: extrai dados, faz upload, inicia geracao, polling
    auth-guard.ts            # Verificacao de auth e creditos nas API routes
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

### Videos

| Modelo | Tipo | Descricao |
|--------|------|-----------|
| **Veo 3.1** | Text/Image to Video | Google Veo 3, modos Lite/Fast/Quality |
| **Seedance 2.0** | Text/Image to Video | ByteDance (temporariamente desabilitado) |
| **Kling 3** | Text/Image to Video | Kling 3.0, suporta elements (@element1-3) |

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

### Persistencia
- Workflows salvos em PostgreSQL via Supabase
- System prompt templates salvos por usuario
- Auto-save de workflows

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
- **Landing page** — Hero com demo do editor + tabela de precos
- **Storage proprio** — Cloudflare R2 (substituir catbox.moe)
- **Rate limiting** — Evitar abuso no free tier

### Media prioridade
- **Templates de workflow** — workflows pre-montados para clonar
- **Historico de geracoes** — timeline com todos os resultados
- **Batch processing** — rodar workflow com diferentes inputs
- **Variaveis no prompt** — {{nome}}, {{produto}} para reusar workflows

### Futuro
- **Workflow marketplace** — publicar e vender templates
- **API publica** — expor workflows como endpoints REST
- **Integracao redes sociais** — publicar direto no Instagram/TikTok
- **Modo mobile** — interface responsiva para workflows simples
- **Webhooks** — conectar com Zapier/n8n/Make

---

## Licenca

Projeto privado.
