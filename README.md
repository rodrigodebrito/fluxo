# Fluxo AI

Plataforma visual node-based para geracoes de imagens e videos com IA. Inspirada no [Weavy.ai](https://app.weavy.ai), permite criar workflows conectando nos de prompt, imagens e modelos de IA em um canvas interativo.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **ReactFlow** (@xyflow/react v12) - canvas de nos
- **Prisma** + SQLite - persistencia de workflows
- **Tailwind CSS 4** - estilizacao
- **Kie.ai API** - backend de IA (imagens e videos)

## Setup

### Pre-requisitos

- Node.js 18+
- Conta na [Kie.ai](https://kie.ai) para API key

### Instalacao

```bash
# Clonar e instalar dependencias
cd fluxo-ai
npm install

# Configurar banco de dados
npx prisma db push

# Configurar variaveis de ambiente
# Criar arquivo .env na raiz:
echo 'DATABASE_URL="file:./dev.db"' > .env
echo 'KIE_API_KEY="sua-api-key-aqui"' >> .env

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
      generate-seedance/     # Seedance 2.0 (video)
      generate-video/        # Veo 3.1 (video)
      status/                # Polling de status de tasks
      upload/                # Upload de arquivos (catbox.moe)
      workflows/             # CRUD de workflows (Prisma)
    editor/[id]/             # Pagina do editor
  components/
    Editor/FlowEditor.tsx    # Canvas principal (ReactFlow, toolbar, context menu, undo/redo)
    Gallery/Gallery.tsx      # Galeria fullscreen de resultados
    Panel/NodePanel.tsx      # Painel lateral de parametros do modelo
    Sidebar/Sidebar.tsx      # Sidebar com categorias e cards de modelos
    nodes/
      PromptNode.tsx         # No de texto/prompt
      ImageInputNode.tsx     # No de upload de arquivos (imagens/videos)
      ModelNode.tsx          # No de modelo de IA (generico para todos os modelos)
      KlingElementNode.tsx   # No auxiliar para Kling Elements
      OutputNode.tsx         # No de saida
  lib/
    ai/kie.ts                # Funcoes de API para todos os modelos (Kie.ai)
    pipeline/executor.ts     # Orquestrador: extrai dados, faz upload, inicia geracao, polling
  types/nodes.ts             # Definicoes de modelos, handles, parametros
```

### Fluxo de dados

1. Usuario monta workflow no canvas conectando nos
2. Clica "Run Model" em um no de modelo
3. `executor.ts` percorre as edges para coletar prompt, imagens, parametros
4. Faz upload de imagens locais para catbox.moe (URLs permanentes)
5. Chama a API route correspondente ao modelo
6. API route chama a Kie.ai API para criar a task
7. Polling a cada 3s ate task completar
8. Resultado (URLs de imagens/videos) exibido no no do modelo

---

## Modelos disponíveis

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
| **Seedance 2.0** | Text/Image to Video | ByteDance, suporta reference images (@Image1-9) |
| **Kling 3** | Text/Image to Video | Kling 3.0, suporta elements (@element1-3) |

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

### Seedance 2.0 / Fast (sem video input, custo por segundo x duracao)

| Modelo | Res | 4s | 8s | 12s | 15s |
|--------|-----|----|----|-----|-----|
| 2.0 | 480p | R$ 2,03 | R$ 4,07 | R$ 6,10 | R$ 7,63 |
| 2.0 | 720p | R$ 4,39 | R$ 8,78 | R$ 13,17 | R$ 16,46 |
| Fast | 480p | R$ 1,66 | R$ 3,32 | R$ 4,97 | R$ 6,22 |
| Fast | 720p | R$ 3,53 | R$ 7,07 | R$ 10,60 | R$ 13,25 |

> Com video input (first frame conectado) os custos sao menores. Valores acima sao para text-to-video (sem frame de entrada).

---

## Funcionalidades implementadas

### Canvas e interacao
- Drag & drop de nos da sidebar para o canvas
- Menu de contexto (botao direito) com busca e categorias (Tools, Image models, Video models)
- Multi-selecao com caixa de selecao (arrastar no canvas)
- Delete de nos/edges selecionados (Backspace/Delete)
- Undo/Redo (Ctrl+Z / Ctrl+Y) com historico de ate 50 snapshots
- Toolbar inferior: Select/Hand tools, Undo/Redo, Zoom dropdown (zoom in/out, fit, 100%)
- Pan com botao direito do mouse (cursor muda para grabbing)
- Zoom com Ctrl + scroll
- Cursores contextuais: seta padrao no canvas, pointer nos nos, grabbing ao arrastar

### Nos
- **Prompt**: campo de texto com suporte a variaveis
- **File Input**: upload de imagens e videos, preview inline, aceita multiplos arquivos
- **Model**: no generico que se adapta ao modelo selecionado, exibe resultado com carousel
- **Kling Element**: no auxiliar com name/description, mostra imagens conectadas, auto-detecta numero do element
- **Gallery**: fullscreen com navegacao, download e copia de link

### Pipeline
- Upload automatico para catbox.moe (URLs permanentes que persistem ao recarregar)
- Polling automatico com progresso
- Botao de cancelar geracao em andamento (AbortController)
- Suporte a multiplas runs por execucao
- Custo dinamico calculado em tempo real baseado nos parametros

### Persistencia
- Workflows salvos em SQLite via Prisma
- Imagens com URLs permanentes (nao se perdem ao recarregar)

---

## Features especificas por modelo

### Kling 3 - Elements
Para usar elements no Kling 3:
1. Adicione um no "Kling Element" ao canvas
2. Conecte 2-4 imagens de referencia (File Input) ao Kling Element
3. Conecte o Kling Element ao handle "Element 1/2/3" do Kling 3
4. No prompt, use `@element1`, `@element2`, etc.
5. O badge no header do no mostra automaticamente qual `@elementN` usar

### Seedance 2.0 - Reference Images
Para usar imagens de referencia no Seedance:
1. Clique "+ Add reference" no no do Seedance (ate 9)
2. Conecte File Inputs aos handles `@Image1`, `@Image2`, etc.
3. No prompt, use `@Image1`, `@Image2`, etc.

### GPT Image 1.5 - Background transparente
Disponivel apenas no modo text-to-image, selecione "Transparent" no parametro Background do painel lateral.

---

## Plano de negocio

### Modelo de monetizacao: Assinatura + Creditos avulsos

#### Planos mensais

> Precos incluem custo de infraestrutura (Vercel, Supabase, Cloudflare R2, Stripe ~4%, dominio).

**Preco promocional (primeiros 100 usuarios) — 30% de desconto:**

| Plano | Promo (100 primeiros) | Preco regular | Creditos | Custo total* | Lucro promo | Margem promo | Lucro regular | Margem regular |
|-------|----------------------|---------------|----------|-------------|-------------|-------------|---------------|----------------|
| **Free** | R$ 0 | R$ 0 | 50 | ~R$ 3,34 | -R$ 3,34 | Aquisicao | -R$ 3,34 | Aquisicao |
| **Starter** | **R$ 34,90/mes** | R$ 49,90/mes | 700 | ~R$ 24,23 | R$ 10,67 | **31%** | R$ 25,67 | **51%** |
| **Creator** | **R$ 79,90/mes** | R$ 114,90/mes | 1.700 | ~R$ 53,99 | R$ 25,91 | **32%** | R$ 60,91 | **53%** |
| **Pro** | **R$ 179,90/mes** | R$ 249,90/mes | 4.000 | ~R$ 119,04 | R$ 60,86 | **34%** | R$ 130,86 | **52%** |

> \* Custo total = Kie.ai + infra estimada por usuario.
> Creditos do plano **expiram no final do mes**. Na pratica o usuario medio usa 70-80%, elevando a margem real.
> Os 100 primeiros usuarios **mantem o preco promocional enquanto a assinatura estiver ativa** (fideliza early adopters).

#### Creditos avulsos (compra quando os do plano acabarem)

| Pacote | Preco | Creditos | Custo/credito | Margem |
|--------|-------|----------|---------------|--------|
| **500** | R$ 24,90 | 500 | R$ 0,0498 | **33%** |
| **1.000** | R$ 44,90 | 1.000 | R$ 0,0449 | **30%** |
| **2.500** | R$ 99,90 | 2.500 | R$ 0,0400 | **33%** |

- Minimo de compra: 500 creditos
- Pode comprar a qualquer momento quando os creditos do plano acabarem
- Creditos avulsos **nao expiram** (diferente do plano) — justifica preco maior e incentiva compra

#### Logica de preco (avulso mais caro que plano)

| Forma | Custo por credito (promo) | Custo por credito (regular) |
|-------|--------------------------|---------------------------|
| Avulso 500 | R$ 0,0498 | R$ 0,0498 (nao muda) |
| Starter | R$ 0,0499 | R$ 0,0713 |
| Creator | R$ 0,0470 | R$ 0,0676 |
| Pro | R$ 0,0450 | R$ 0,0625 |

> No preco regular, avulso e a opcao mais barata por credito — mas assinatura garante creditos todo mes automaticamente.
> No preco promo, avulso e quase igual ao Starter — incentiva assinar logo enquanto esta barato.

#### Free tier

50 creditos gratis = ~12 imagens GPT medium ou 1 video Veo Lite. Suficiente para testar a plataforma.

#### Custo base (Kie.ai)

- R$ 26,76 por 1.000 creditos (1 credito = R$ 0,02676)
- Margem alvo: 31-34% nos planos (ja incluindo infra), 30-33% no avulso
- Com escala (200+ usuarios), negociar desconto por volume com Kie.ai para aumentar margem

#### Custo de infraestrutura estimado (200 usuarios pagantes)

| Servico | Custo mensal | Observacao |
|---------|-------------|------------|
| **Vercel** (deploy) | ~R$ 115 ($20) | Gratis ate ~100 users |
| **Supabase** (DB + Auth) | ~R$ 145 ($25) | Gratis ate 500MB |
| **Cloudflare R2** (storage) | ~R$ 57 ($10) | Gratis ate 10GB |
| **Stripe** (~4% receita) | ~R$ 495 | 3,99% + R$ 0,39/transacao |
| **Dominio + outros** | ~R$ 10 | Dominio, email, etc |
| **Total infra** | **~R$ 822/mes** | ~6,6% da receita |

> Com 200 users pagantes (receita ~R$ 12.380/mes), infra custa ~R$ 822 (6,6%). Custo de infra **dilui com escala** — Vercel/Supabase nao escalam linearmente.

---

## Comparacao de precos: Fluxo AI vs Mercado

> Cambio aproximado: R$ 5,70 por USD

### Fluxo AI vs Weavy.ai

| | Weavy Starter | Fluxo Creator (promo) | Fluxo Creator (regular) | Weavy Pro | Fluxo Pro (promo) | Fluxo Pro (regular) |
|---|---|---|---|---|---|---|
| **Preco** | $24 (~R$ 137) | R$ 79,90 | R$ 114,90 | $45 (~R$ 257) | R$ 179,90 | R$ 249,90 |
| **Creditos** | 1.500 | 1.700 | 1.700 | 4.000 | 4.000 | 4.000 |
| **R$/credito** | R$ 0,091 | R$ 0,047 | R$ 0,068 | R$ 0,064 | R$ 0,045 | R$ 0,062 |
| **vs Weavy** | — | **42% mais barato** | **16% mais barato** | — | **30% mais barato** | **3% mais barato** |

- No preco **promocional**: Fluxo AI e **30-42% mais barato** que o Weavy com mais creditos
- No preco **regular**: ainda mais barato, mas com margem saudavel de **51-53%** para o negocio
- Em ambos os casos, brasileiro paga em **BRL via PIX** em vez de USD no cartao internacional

### Custo por geracao: Fluxo AI vs Weavy.ai

Alem dos planos mais caros, o Weavy cobra **mais creditos por geracao** nos mesmos modelos:

| Modelo | Config | Weavy (creditos) | Fluxo AI (creditos) | Economia |
|---|---|---|---|---|
| **Nano Banana Pro** | 1K/2K | 24 | 18 | **25% menos** |
| **Nano Banana Pro** | 4K | 30 | 24 | **20% menos** |
| **GPT Image 1.5** | Medium | 5 | 4 | **20% menos** |
| **GPT Image 1.5** | High | 28 | 22 | **21% menos** |
| **Veo 3.1** | Lite | 40 | 30 | **25% menos** |
| **Veo 3.1** | Fast | 80 | 60 | **25% menos** |
| **Veo 3.1** | Quality | 330 | 250 | **24% menos** |

> O usuario do Fluxo AI gera **~20-25% mais conteudo** com a mesma quantidade de creditos. Combinado com planos mais baratos, a economia total pode chegar a **60-70%** comparado ao Weavy.

**Exemplo pratico** (plano com 4.000 creditos):
- **Weavy Pro** ($45/~R$ 257): 4.000 creditos ÷ 30 = **133 imagens** Nano 4K
- **Fluxo Pro promo** (R$ 179,90): 4.000 creditos ÷ 24 = **166 imagens** Nano 4K
- **Resultado**: 33 imagens a mais por **R$ 77 a menos**

### Comparacao com outras plataformas

| Plataforma | Plano Popular | Preco (R$/mes) | O que inclui | Equivalente Fluxo AI |
|---|---|---|---|---|
| **Weavy.ai** Starter | $24/mes | ~R$ 137 | 1.500 creditos | Creator R$ 79,90 promo / R$ 114,90 regular |
| **Weavy.ai** Pro | $45/mes | ~R$ 257 | 4.000 creditos | Pro R$ 179,90 promo / R$ 249,90 regular |
| **RunwayML** Standard | $12/mes | ~R$ 68 | 625 creditos (so video) | Starter R$ 34,90 promo / R$ 49,90 regular |
| **RunwayML** Pro | $28/mes | ~R$ 160 | 2.250 creditos | Creator R$ 79,90 promo / R$ 114,90 regular |
| **Pika** Standard | $8/mes | ~R$ 46 | 250 creditos/mes | Free + avulso sai similar |
| **Pika** Pro | $58/mes | ~R$ 330 | 2.000 creditos | Pro R$ 179,90 promo / R$ 249,90 regular |
| **Leonardo.ai** Artisan | $12/mes | ~R$ 68 | 8.500 tokens (diferente de creditos) | Dificil comparar direto |
| **Krea.ai** Pro | $30/mes | ~R$ 171 | Uso "ilimitado" (com fila) | Creator R$ 79,90 promo / R$ 114,90 regular |

### Onde o Fluxo AI compete forte

1. **Preco absoluto para BR**: Qualquer plataforma em USD fica cara por causa do cambio. Cobrar em BRL e um diferencial enorme.
2. **Custo por credito**: Consistentemente 50-60% menor que o Weavy em todos os planos.
3. **Imagem + Video junto**: RunwayML e Pika sao focados em video. Leonardo e focado em imagem. Fluxo oferece ambos.
4. **Modelos de ponta**: Kling 3, Veo 3.1, Seedance 2.0, GPT Image 1.5 — mesmos modelos das plataformas internacionais.
5. **Creditos avulsos**: Poucas plataformas oferecem compra avulsa sem assinatura.

---

## Roadmap para lancamento

### O que falta para lancar (critico)

| Item | Por que | Complexidade |
|---|---|---|
| **Autenticacao** | Sem login nao tem multi-usuario | Media |
| **Sistema de creditos real** | Controlar saldo, debito por geracao | Media |
| **Pagamento** | Cobrar pelo servico | Media |
| **Storage proprio** | catbox.moe nao e confiavel para producao | Baixa |
| **Deploy em producao** | Sair do localhost | Baixa |

### Importante (lanca sem, mas precisa logo)

| Item | Por que |
|---|---|
| **Historico de geracoes** | Usuario quer ver o que ja gerou |
| **Rate limiting** | Evitar abuso no free tier |
| **Fila server-side** | Polling no browser nao escala |
| **Landing page** | Converter visitantes em usuarios |

---

## Arquitetura de producao

### Stack atual vs producao

```
Atual (dev)                    →    Producao
─────────────────────────────────────────────
SQLite + Prisma                →    PostgreSQL (Supabase/Neon)
catbox.moe                     →    Cloudflare R2 ou Supabase Storage
Sem auth                       →    Clerk (login Google + email)
Sem pagamento                  →    Stripe (PIX, cartao, boleto)
localhost                      →    Vercel
Polling no browser             →    Webhooks + BullMQ/Redis (fase 2)
```

### Diagrama

```
┌─────────────────────────────────────────────┐
│                   Vercel                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Next.js  │  │ API      │  │ Webhooks  │  │
│  │ Frontend │  │ Routes   │  │ (callback)│  │
│  └──────────┘  └────┬─────┘  └─────┬─────┘  │
└──────────────────────┼─────────────┼─────────┘
                       │             │
        ┌──────────────┼─────────────┼──────┐
        │              ▼             ▼      │
        │  ┌──────────────────────────────┐ │
        │  │   Supabase                   │ │
        │  │  ┌──────────┐ ┌───────────┐  │ │
        │  │  │ Postgres │ │ Storage   │  │ │
        │  │  │ (users,  │ │ (imagens, │  │ │
        │  │  │ credits, │ │  videos)  │  │ │
        │  │  │ workflows│ │           │  │ │
        │  │  └──────────┘ └───────────┘  │ │
        │  │  ┌──────────┐                │ │
        │  │  │ Auth     │                │ │
        │  │  └──────────┘                │ │
        │  └──────────────────────────────┘ │
        │              │                    │
        │  ┌───────────┴────────┐           │
        │  │                    │           │
        │  ▼                    ▼           │
        │  ┌──────────┐  ┌──────────────┐  │
        │  │ Kie.ai   │  │ Stripe /     │  │
        │  │ API (IA) │  │ Mercado Pago │  │
        │  └──────────┘  └──────────────┘  │
        └───────────────────────────────────┘
```

### Ferramentas e servicos recomendados

| Necessidade | Ferramenta | Custo | Por que |
|---|---|---|---|
| **Auth** | Clerk | Gratis ate 10k MAU | Mais facil que NextAuth, UI pronta |
| **Banco** | Supabase (Postgres) | Gratis ate 500MB | Auth + DB + Storage tudo junto |
| **Storage** | Cloudflare R2 | Gratis ate 10GB | Sem taxa de egress (diferente do S3) |
| **Pagamento BR** | Stripe | 3,99% + R$ 0,39 | Aceita PIX, cartao, boleto |
| **Alternativa BR** | Mercado Pago | 4,99% | Mais popular no BR, API pior |
| **Deploy** | Vercel | Gratis (hobby) | Ja e Next.js, deploy automatico |
| **Analytics** | PostHog | Gratis ate 1M eventos | Open source |
| **Email** | Resend | Gratis ate 3k/mes | Emails transacionais |
| **Monitoramento** | Sentry | Gratis (dev) | Capturar erros em producao |

---

## Modelo do banco (producao)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  plan      Plan     @default(FREE)
  credits   Int      @default(50)
  createdAt DateTime @default(now())

  workflows   Workflow[]
  generations Generation[]
  purchases   Purchase[]
}

enum Plan {
  FREE
  STARTER
  CREATOR
  PRO
}

model Workflow {
  id        String   @id @default(cuid())
  name      String
  data      Json     // nodes + edges do ReactFlow
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Generation {
  id        String   @id @default(cuid())
  model     String   // "kling", "veo3", etc
  credits   Int      // quanto custou
  resultUrl String?
  status    String   // "pending", "completed", "failed"
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
}

model Purchase {
  id        String   @id @default(cuid())
  type      String   // "subscription" ou "credits"
  amount    Int      // valor em centavos
  credits   Int      // creditos adicionados
  stripeId  String?  // ID do pagamento no Stripe
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
}
```

---

## Fluxo de creditos

```
Usuario clica "Run Model"
        │
        ▼
Verificar saldo >= custo
        │
   ┌────┴────┐
   │ Sim     │ Nao → mostrar "Creditos insuficientes" + botao comprar
   ▼
Debitar creditos (otimista)
        │
        ▼
Chamar API Kie.ai
        │
   ┌────┴────┐
   │ Sucesso │ Falha → devolver creditos
   ▼
Salvar resultado em Generation
```

---

## Plano de implementacao — Versao inicial (v1.0)

### Fase 1 — Auth + Banco (Semana 1-2)

**Objetivo**: cada usuario tem sua conta, seus workflows e seu saldo de creditos.

| Tarefa | Detalhes | Arquivos afetados |
|---|---|---|
| Criar projeto Supabase | Dashboard > New project, copiar URL + anon key | `.env` |
| Migrar Prisma para PostgreSQL | Trocar provider de `sqlite` para `postgresql`, rodar `prisma migrate dev` | `prisma/schema.prisma` |
| Adicionar tabelas User, Generation, Purchase | Schema Prisma completo (ver secao "Modelo do banco") | `prisma/schema.prisma` |
| Instalar Clerk | `npm install @clerk/nextjs`, criar conta em clerk.com | `package.json` |
| Configurar Clerk Provider | Envolver `layout.tsx` com `<ClerkProvider>`, adicionar middleware | `src/app/layout.tsx`, `src/middleware.ts` |
| Pagina de login | Clerk ja fornece UI pronta, so configurar redirect | `src/app/sign-in/[[...sign-in]]/page.tsx` |
| Proteger rotas | Middleware do Clerk bloqueia acesso ao editor sem login | `src/middleware.ts` |
| Vincular workflow ao usuario | Adicionar `userId` ao save/load de workflows | `src/app/api/workflows/route.ts` |
| Dar 50 creditos no cadastro | Hook `afterSignUp` do Clerk cria User no Prisma com 50 creditos | `src/app/api/webhooks/clerk/route.ts` |
| Mostrar saldo no header | Componente com creditos restantes do usuario | `src/components/Header/UserCredits.tsx` |

```bash
# Comandos
npm install @clerk/nextjs
npm install @supabase/supabase-js  # opcional, Prisma ja conecta direto

# .env novas variaveis
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
DATABASE_URL="postgresql://user:pass@db.xxx.supabase.co:5432/postgres"
```

### Fase 2 — Storage proprio (Semana 3)

**Objetivo**: substituir catbox.moe por storage permanente e controlado.

| Tarefa | Detalhes | Arquivos afetados |
|---|---|---|
| Criar bucket no Cloudflare R2 | Dashboard R2 > Create bucket "fluxo-ai-uploads" | Cloudflare dashboard |
| Gerar API tokens R2 | Access Key ID + Secret Access Key | `.env` |
| Instalar AWS SDK | `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner` (R2 e compativel com S3) | `package.json` |
| Criar lib de upload | Funcao `uploadToR2(file)` que retorna URL publica | `src/lib/storage/r2.ts` |
| Refatorar API de upload | Trocar catbox.moe por R2 na route de upload | `src/app/api/upload/route.ts` |
| Configurar dominio publico R2 | Para servir imagens/videos via URL publica | Cloudflare dashboard |
| Salvar URLs no banco | Cada geracao salva resultUrl na tabela Generation | `src/lib/pipeline/executor.ts` |

```bash
# .env novas variaveis
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="fluxo-ai-uploads"
R2_PUBLIC_URL="https://cdn.fluxoai.com.br"
```

### Fase 3 — Sistema de creditos (Semana 4)

**Objetivo**: debitar creditos antes de cada geracao, impedir uso sem saldo.

| Tarefa | Detalhes | Arquivos afetados |
|---|---|---|
| Criar API de saldo | `GET /api/credits` retorna creditos do usuario logado | `src/app/api/credits/route.ts` |
| Verificar saldo antes de gerar | Antes de chamar Kie.ai, checar `user.credits >= custo` | `src/lib/pipeline/executor.ts` |
| Debitar creditos (otimista) | `UPDATE users SET credits = credits - custo WHERE id = ...` | `src/lib/credits/debit.ts` |
| Devolver creditos em falha | Se a geracao falhar, estornar creditos | `src/lib/credits/refund.ts` |
| Registrar em Generation | Salvar modelo, creditos gastos, status, resultUrl | `src/lib/pipeline/executor.ts` |
| Modal "creditos insuficientes" | Quando saldo < custo, mostrar modal com opcao de comprar | `src/components/Modals/InsufficientCredits.tsx` |
| Mostrar custo antes de rodar | Badge no botao "Run Model" com custo estimado | `src/components/nodes/ModelNode.tsx` |

```
Fluxo:
1. Usuario clica "Run Model" (custo: 24 creditos)
2. Frontend chama POST /api/generate com modelNodeId
3. Backend verifica: user.credits >= 24?
   - Nao → retorna 402 "Creditos insuficientes"
   - Sim → debita 24, chama Kie.ai
4. Se Kie.ai falhar → estorna 24 creditos
5. Se sucesso → salva Generation, retorna resultado
```

### Fase 4 — Pagamento com Stripe (Semana 4-5)

**Objetivo**: usuario pode assinar plano ou comprar creditos avulsos.

| Tarefa | Detalhes | Arquivos afetados |
|---|---|---|
| Criar conta Stripe | Dashboard Stripe, ativar modo teste | Stripe dashboard |
| Criar Products no Stripe | 3 planos (Starter/Creator/Pro) + 3 pacotes avulsos | Stripe dashboard |
| Instalar Stripe SDK | `npm install stripe @stripe/stripe-js` | `package.json` |
| Pagina de pricing | Tabela de planos com botao "Assinar" | `src/app/pricing/page.tsx` |
| Checkout session (assinatura) | `POST /api/stripe/checkout` cria Stripe Checkout Session | `src/app/api/stripe/checkout/route.ts` |
| Checkout session (avulso) | Mesmo endpoint, mode: "payment" em vez de "subscription" | `src/app/api/stripe/checkout/route.ts` |
| Webhook do Stripe | Recebe eventos: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted` | `src/app/api/webhooks/stripe/route.ts` |
| Ativar plano no webhook | Ao receber pagamento, atualizar plan + credits do User | `src/app/api/webhooks/stripe/route.ts` |
| Adicionar creditos avulsos | Ao receber pagamento avulso, incrementar credits | `src/app/api/webhooks/stripe/route.ts` |
| Renovacao mensal | Stripe cobra automatico, webhook reseta creditos do plano | `src/app/api/webhooks/stripe/route.ts` |
| Portal do cliente | Link para Stripe Customer Portal (cancelar, trocar plano) | `src/app/api/stripe/portal/route.ts` |

```bash
# .env novas variaveis
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Stripe Products (criar no dashboard)
# Starter: R$ 34,90/mes (promo) → R$ 49,90/mes (regular)
# Creator: R$ 79,90/mes (promo) → R$ 114,90/mes (regular)
# Pro: R$ 179,90/mes (promo) → R$ 249,90/mes (regular)
# Avulso 500: R$ 24,90 (one-time)
# Avulso 1000: R$ 44,90 (one-time)
# Avulso 2500: R$ 99,90 (one-time)
```

### Fase 5 — Landing page + Deploy (Semana 5-6)

**Objetivo**: colocar no ar com dominio proprio.

| Tarefa | Detalhes | Arquivos afetados |
|---|---|---|
| Landing page | Hero com GIF do editor, features, tabela de precos, CTA "Comecar gratis" | `src/app/page.tsx` |
| SEO basico | Meta tags, Open Graph, titulo/descricao | `src/app/layout.tsx` |
| Rate limiting | `npm install @upstash/ratelimit`, limitar API routes | `src/middleware.ts` |
| Instalar Sentry | `npx @sentry/wizard@latest -i nextjs`, capturar erros | `sentry.client.config.ts` |
| Configurar Vercel | Conectar repo GitHub, configurar env vars | Vercel dashboard |
| Dominio proprio | Comprar dominio (ex: fluxoai.com.br), configurar DNS na Vercel | Vercel + registrador |
| SSL | Vercel configura automaticamente | Automatico |
| Testar deploy | Verificar todas as API routes, auth, pagamento em staging | Manual |

```bash
# Deploy
npm run build          # verificar se compila sem erros
vercel                 # primeiro deploy (configura projeto)
vercel --prod          # deploy em producao

# Dominio
# Vercel > Settings > Domains > Add "fluxoai.com.br"
# No registrador, apontar CNAME para cname.vercel-dns.com
```

### Fase 6 — Beta + Promo (Semana 6-7)

| Tarefa | Detalhes |
|---|---|
| Convidar 10-20 beta testers | Dar creditos extras em troca de feedback |
| Monitorar erros no Sentry | Corrigir bugs criticos rapidamente |
| Coletar feedback | Google Forms ou WhatsApp |
| Ajustar UX/bugs | Iterar rapido baseado no feedback |
| Ativar promo 100 primeiros | Criar coupon no Stripe com 30% off, limitar a 100 usos |
| Contador de vagas | Mostrar "Restam X vagas no preco de lancamento" na landing |
| Lancar publicamente | Post nas redes, primeiro Reel, ativar lista de espera |

### Resumo: estrutura de pastas apos implementacao

```
src/
  app/
    page.tsx                        # Landing page
    pricing/page.tsx                # Pagina de precos
    sign-in/[[...sign-in]]/page.tsx # Login (Clerk)
    sign-up/[[...sign-up]]/page.tsx # Cadastro (Clerk)
    editor/[id]/page.tsx            # Editor (protegido)
    api/
      credits/route.ts              # GET saldo do usuario
      generate/route.ts             # Nano Banana Pro
      generate-gpt-image/route.ts   # GPT Image 1.5
      generate-kling/route.ts       # Kling 3.0
      generate-seedance/route.ts    # Seedance 2.0
      generate-video/route.ts       # Veo 3.1
      status/route.ts               # Polling de tasks
      upload/route.ts               # Upload para R2
      workflows/route.ts            # CRUD workflows
      stripe/
        checkout/route.ts           # Criar checkout session
        portal/route.ts             # Portal do cliente
      webhooks/
        clerk/route.ts              # Webhook Clerk (novo usuario)
        stripe/route.ts             # Webhook Stripe (pagamento)
  components/
    Header/UserCredits.tsx          # NOVO: saldo de creditos
    Modals/InsufficientCredits.tsx  # NOVO: modal sem creditos
    Landing/                        # NOVO: componentes da landing
    ... (existentes)
  lib/
    ai/kie.ts                       # (existente)
    credits/
      debit.ts                      # NOVO: debitar creditos
      refund.ts                     # NOVO: estornar creditos
    storage/
      r2.ts                         # NOVO: upload para Cloudflare R2
    stripe/
      client.ts                     # NOVO: Stripe client
    pipeline/executor.ts            # (existente, adicionar verificacao de creditos)
  middleware.ts                     # NOVO: Clerk auth + rate limiting
```

### Variaveis de ambiente (producao completa)

| Variavel | Servico | Obrigatoria |
|---|---|---|
| `DATABASE_URL` | Supabase PostgreSQL | Sim |
| `KIE_API_KEY` | Kie.ai | Sim |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk | Sim |
| `CLERK_SECRET_KEY` | Clerk | Sim |
| `CLERK_WEBHOOK_SECRET` | Clerk | Sim |
| `STRIPE_SECRET_KEY` | Stripe | Sim |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe | Sim |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Sim |
| `R2_ACCOUNT_ID` | Cloudflare R2 | Sim |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 | Sim |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 | Sim |
| `R2_BUCKET_NAME` | Cloudflare R2 | Sim |
| `R2_PUBLIC_URL` | Cloudflare R2 | Sim |
| `SENTRY_DSN` | Sentry | Recomendado |
| `NEXT_PUBLIC_APP_URL` | Vercel | Sim |

---

## Dicas praticas

1. **Nao espere ficar perfeito** — lanca com 3-4 modelos funcionando bem. Adiciona mais depois.
2. **Comece com Stripe** em vez de Mercado Pago — API muito melhor, aceita PIX, padrao global.
3. **Clerk > NextAuth** para quem esta comecando — UI de login pronta, dashboard de usuarios, gratis ate 10k MAU.
4. **Cloudflare R2 > S3** — nao cobra por download (egress), economiza se usuarios baixam muitas imagens/videos.
5. **Nao construa fila complexa ainda** — polling no browser funciona ate ~100 usuarios simultaneos.
6. **Landing page simples vende** — hero com GIF do editor + tabela de precos + botao "Comecar gratis".
7. **Free tier e essencial** — 50 creditos da pra testar. Quem testa, converte.
8. **Teste em modo Stripe test** — use cartoes de teste antes de ativar producao. So ativar live quando tudo funcionar.
9. **Promo no Stripe** — crie um Coupon com 30% off e limite de 100 usos. O proprio Stripe controla quantos usaram.

---

## Estrategia de lancamento: Ensina e Vende

### Por que essa estrategia

O mercado brasileiro de IA criativa **nao tem ninguem**. A maioria dos criadores de conteudo BR nem sabe que ferramentas de workflow com IA existem. Quem **educa** o mercado, **domina** o mercado.

Concorrentes gringos (Weavy, Runway, Pika, Krea):
- Cobram em dolar (5-6x mais caro pelo cambio)
- Nenhum tem suporte em portugues
- Nenhum aceita PIX
- Maioria dos criadores BR nem tem cartao internacional

**O Fluxo AI nao precisa competir no mundo inteiro. Precisa ser o Weavy do Brasil.**

### Publico-alvo

| Quem | O que faz hoje | O que faria no Fluxo AI |
|---|---|---|
| **Criador UGC** | Paga editor freelancer | Gera videos sozinho |
| **Lojista Shopee/ML** | Fotos amadoras do produto | Gera fotos profissionais com IA |
| **Social media** | Canva + templates genericos | Cria conteudo unico com IA |
| **Agencia pequena** | Adobe + horas de trabalho | Workflow automatizado |
| **Afiliado digital** | Compra criativos prontos | Gera criativos ilimitados |

Nenhuma dessas pessoas sabe o que e "node-based workflow". **Nao precisa saber.** Vende o resultado:
- "Gere videos profissionais em 2 minutos"
- "Troque a roupa de qualquer modelo com 1 clique"
- "Crie 10 variacoes de anuncio em 5 minutos"

### Modelo de conteudo (product-led content)

```
Conteudo gratuito (atrai)          →    Produto pago (converte)
─────────────────────────────────────────────────────────────
Reels/TikTok mostrando resultado   →    "Fiz isso no Fluxo AI"
Tutorial "como trocar roupa com IA" →    "Link na bio, 50 creditos gratis"
Live montando workflow ao vivo     →    "Assina o Creator por R$ 79,90"
Curso basico gratis no YouTube     →    Funil para plano pago
```

### Fases de lancamento com conteudo

#### Fase 1 — Antes de lancar (criar audiencia)
- [ ] Reels mostrando resultados impressionantes (antes/depois)
- [ ] "Como eu gero isso?" — gerar curiosidade, nao mostrar a ferramenta ainda
- [ ] Coletar lista de espera (email ou WhatsApp)
- [ ] Postar em comunidades de criadores de conteudo

#### Fase 2 — Lancamento beta + promo 100 primeiros
- [ ] "Liberei pra 50 pessoas testarem gratis"
- [ ] Escassez real (poucos creditos no servidor)
- [ ] Pedir feedback em troca de creditos extras
- [ ] Gravar os melhores resultados dos beta testers
- [ ] **Preco promocional com 30% de desconto para os 100 primeiros assinantes**
- [ ] Mostrar contador: "Restam X vagas no preco de lancamento"
- [ ] Quem assinar na promo **mantem o preco enquanto a assinatura estiver ativa**

#### Fase 3 — Lancamento publico (preco regular)
- [ ] Tutoriais curtos: "Como fazer X no Fluxo AI"
- [ ] Templates prontos: "Clona esse workflow e roda"
- [ ] Comunidade no Discord/WhatsApp
- [ ] Programa de afiliados (indicou, ganha creditos)
- [ ] **Preco regular entra em vigor** (Starter R$ 49,90 / Creator R$ 114,90 / Pro R$ 249,90)
- [ ] Margem sobe para ~51-53%, sustentavel a longo prazo

#### Fase 4 — Curso pago (dupla monetizacao)
- [ ] "Masterclass: IA para criadores de conteudo"
- [ ] Ensina a usar IA + usa o Fluxo AI como ferramenta
- [ ] Preco: R$ 197-497 (curso) + aluno ja entra como Starter
- [ ] **Vende o curso E o SaaS ao mesmo tempo**

### O ciclo que se alimenta sozinho

```
Conteudo educa       →  Pessoas descobrem IA
        ↑                        ↓
Mais resultados      ←  Usam o Fluxo AI
para mostrar                     ↓
        ↑                Pagam assinatura
        └────────────────────────┘
```

### Por que funciona especialmente no Brasil

1. **Brasileiro ama tutorial** — "como fazer X" e o tipo de busca que mais cresce
2. **Criador de conteudo BR esta explodindo** — todo mundo quer criar, pouca ferramenta acessivel
3. **PIX democratizou pagamento** — R$ 34,90 no PIX e impulso, $24 no cartao internacional e barreira
4. **Comunidade BR e fiel** — se voce ajuda, eles divulgam, viram evangelistas

### Vantagem competitiva real

Nao e o codigo. Nao e o preco. E:

**Falar portugues, entender o criador BR, e ensinar o mercado a usar algo que ele nem sabe que existe.**

O Weavy nunca vai fazer um Reels em portugues ensinando um lojista da Shopee a gerar foto de produto.

---

## Proximos passos (features futuras)

### Media prioridade
- **Templates de workflow**: workflows pre-montados que o usuario pode clonar (ex: "Troca de roupa", "Video de produto")
- **Historico de geracoes**: timeline com todos os resultados gerados, filtros por modelo/data
- **Comparacao A/B**: colocar dois resultados lado a lado para comparar
- **Preview de custo antes de rodar**: mostrar estimativa de custo total do workflow antes de executar
- **Batch processing**: rodar o mesmo workflow com diferentes inputs automaticamente
- **Variaveis no prompt**: sistema de variaveis ({{nome}}, {{produto}}) para reusar workflows com inputs diferentes

### Diferenciais vs Weavy.ai
- **Workflow marketplace**: usuarios podem publicar e vender templates de workflows
- **API publica**: expor workflows como endpoints API (usuario monta workflow visual, gera endpoint REST)
- **Agendamento**: agendar geracoes para horarios especificos (ex: gerar conteudo todo dia as 9h)
- **Integracao com redes sociais**: publicar direto no Instagram, TikTok, YouTube
- **Editor de video basico**: cortar, concatenar, adicionar texto/musica nos videos gerados
- **IA de sugestao de prompt**: analisar imagens de entrada e sugerir prompts otimizados
- **Modo mobile**: interface responsiva para montar workflows simples no celular
- **Webhooks e automacoes**: conectar com Zapier/n8n/Make para automacoes externas
- **Analytics de conteudo**: metricas de performance dos conteudos gerados (quando integrado com redes sociais)

---

## Variaveis de ambiente

| Variavel | Descricao | Obrigatoria |
|----------|-----------|-------------|
| `DATABASE_URL` | URL do banco SQLite (ex: `file:./dev.db`) | Sim |
| `KIE_API_KEY` | API key da Kie.ai | Sim |

## Licenca

Projeto privado.
