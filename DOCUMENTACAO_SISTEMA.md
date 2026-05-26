# Documentação Técnica — Sistema de Gestão da A.R.L.S. Sabedoria de Salomão Nº 4.774

> Documento elaborado para fins de Trabalho de Conclusão de Curso (TCC)

---

## Sumário

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Tecnologias Utilizadas](#2-tecnologias-utilizadas)
3. [Arquitetura do Sistema](#3-arquitetura-do-sistema)
4. [Modelagem de Dados](#4-modelagem-de-dados)
5. [Módulos e Funcionalidades](#5-módulos-e-funcionalidades)
6. [API REST — Endpoints](#6-api-rest--endpoints)
7. [Autenticação e Controle de Acesso](#7-autenticação-e-controle-de-acesso)
8. [Fluxos Principais](#8-fluxos-principais)
9. [Configuração e Implantação](#9-configuração-e-implantação)
10. [Estrutura de Pastas](#10-estrutura-de-pastas)

---

## 1. Visão Geral do Sistema

O **Sistema de Gestão da A.R.L.S. Sabedoria de Salomão Nº 4.774** é uma aplicação web desenvolvida para digitalizar e centralizar os processos administrativos de uma loja maçônica. Antes do sistema, tarefas como controle de mensalidades, emissão de recibos, registro de presenças e elaboração de atas eram feitas manualmente, em papéis ou planilhas descentralizadas.

### Objetivos

- Centralizar o cadastro de membros e seus dependentes
- Controlar frequência em reuniões
- Gerenciar mensalidades e inadimplências
- Controlar o financeiro da loja (caixa, tronco de beneficência, doações)
- Registrar e gerar atas digitais com exportação em PDF
- Emitir recibos de mensalidade
- Enviar alertas automáticos de reuniões por e-mail
- Garantir segurança com controle de acesso por perfil de usuário

### Público-alvo

Administradores, Venerável Mestre, Tesoureiro e Secretário da loja maçônica.

---

## 2. Tecnologias Utilizadas

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework web | Next.js (App Router) | 16.0.10 |
| Linguagem | JavaScript (React) | 18.3.0 |
| Banco de dados | PostgreSQL (Neon Serverless) | — |
| ORM | Prisma | 6.19.1 |
| Autenticação | JWT com jose + bcryptjs | jose 6.1.3, bcryptjs 3.0.3 |
| Estilização | Tailwind CSS | 3.4.17 |
| Ícones | Lucide React | 0.460.0 |
| Geração de PDF | jsPDF + jspdf-autotable | 3.0.4 / 5.0.7 |
| Captura de tela | html2canvas | 1.4.1 |
| Upload de imagens | Cloudinary | 2.5.1 |
| Envio de e-mails | Nodemailer | 7.0.12 |
| Testes | Playwright | 1.57.0 |
| PWA | next-pwa | 5.6.0 |
| Hospedagem | Vercel | — |

### Principais escolhas arquiteturais

- **Next.js App Router**: permite criar páginas e rotas de API no mesmo projeto, eliminando a necessidade de um backend separado.
- **Neon PostgreSQL**: banco de dados serverless que hiberna quando não está em uso, reduzindo custos em projetos de baixo volume.
- **Prisma ORM**: abstração do banco que gera tipagem automática e simplifica queries complexas.
- **JWT em Cookie HTTP-only**: evita que o token seja acessível via JavaScript do navegador, prevenindo ataques XSS.
- **PWA**: permite instalar o sistema como aplicativo no celular.

---

## 3. Arquitetura do Sistema

### Visão de Alto Nível

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENTE (Navegador)                  │
│  React (Next.js App Router - Client Components)         │
│  Tailwind CSS, jsPDF, html2canvas                       │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP (fetch)
┌────────────────────────▼────────────────────────────────┐
│              SERVIDOR (Next.js - Vercel)                 │
│  Route Handlers (API REST)                               │
│  Auth Middleware (JWT verification)                      │
│  Business Logic                                          │
└────────────────────────┬────────────────────────────────┘
                         │ Prisma ORM
┌────────────────────────▼────────────────────────────────┐
│           BANCO DE DADOS (Neon PostgreSQL)               │
│  Connection Pool (pgbouncer)                             │
│  Serverless - hiberna em inatividade                     │
└─────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              SERVIÇOS EXTERNOS                           │
│  Cloudinary (armazenamento de assinaturas/imagens)       │
│  Gmail SMTP (envio de alertas por e-mail)               │
└─────────────────────────────────────────────────────────┘
```

### Padrão de Comunicação

1. O usuário acessa uma página React (Client Component).
2. A página faz chamadas `fetch` para os Route Handlers (`/api/...`).
3. Os Route Handlers verificam autenticação via middleware JWT.
4. O middleware autorizado executa queries no banco via Prisma.
5. Os dados retornam como JSON para o cliente.

---

## 4. Modelagem de Dados

O banco de dados possui **14 modelos** organizados em grupos funcionais.

### 4.1 Diagrama Simplificado

```
User ──────────────────────── (autenticação, sem relação com Membro)

Membro ──────┬── PagamentoMensalidade ── PlanilhaFinanceira
             ├── Dependente
             ├── AtaCargo ──── Ata ──── AtaPresenca
             ├── AtaPresenca
             └── Presenca ──── Reuniao

PlanilhaFinanceira ──┬── Receita
                     ├── Despesa
                     ├── Tronco
                     ├── DoacaoFilantropica
                     └── PagamentoMensalidade

ControleMensalidade (tabela auxiliar de status de mensalidades)
ConfiguracaoMensalidade (valor por mês/ano)
```

### 4.2 Descrição dos Modelos

#### `User` — Usuários do sistema
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (cuid) | Identificador único |
| username | String (único) | Nome de usuário para login |
| password | String | Senha hasheada com bcrypt (salt=12) |
| role | Enum (UserRole) | Papel: ADMIN, VENERAVEL, TESOUREIRO, SECRETARIO |
| permissions | Json? | Permissões individuais customizadas |
| grau | String? | Grau maçônico (controla visibilidade de atas) |

#### `Membro` — Membros da loja
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (cuid) | Identificador único |
| nome | String | Nome completo |
| grau | String | APRENDIZ, COMPANHEIRO, MESTRE, MESTRE INSTALADO |
| status | String | ATIVO, INATIVO, etc. |
| cim | String? | Cadastro de Identificação Maçônica |
| cargo | String? | Cargo na loja (Venerável Mestre, Tesoureiro, etc.) |
| assinaturaUrl | String? | URL da imagem da assinatura (Cloudinary) |
| email | String? | E-mail para alertas |
| dataNascimento | String? | Data de nascimento |
| dataIniciacao | String? | Data de iniciação |
| dataFiliacao | String? | Data de filiação |
| dataPassagemGrau | String? | Passagem para Companheiro |
| dataElevacao | String? | Elevação a Mestre |
| dataInstalacao | String? | Data de instalação como Mestre Instalado |
| dataRegularizacao | String? | Data de regularização |

#### `Dependente` — Dependentes dos membros
| Campo | Tipo | Descrição |
|-------|------|-----------|
| membroId | String | Referência ao membro |
| tipoDependente | String | ESPOSA, MARIDO, FILHO, FILHA |
| nome | String | Nome do dependente |
| dataNascimento | String? | Data de nascimento |
| dataCasamento | String? | Apenas para cônjuge |

#### `PlanilhaFinanceira` — Controle financeiro mensal
| Campo | Tipo | Descrição |
|-------|------|-----------|
| mes | Int | Mês (1-12) |
| ano | Int | Ano |
| valorMensalidade | Decimal | Valor padrão da mensalidade |
| valorMensalidadeExcecao | Decimal? | Valor especial para alguns membros |
| membrosExcecaoIds | String? | IDs dos membros com valor especial |
| saldoInicialCaixa | Decimal | Saldo de abertura do caixa |
| saldoFinalCaixa | Decimal | Saldo de fechamento calculado |
| totalReceitas | Decimal | Total de receitas do caixa |
| totalDespesas | Decimal | Total de despesas do caixa |
| saldoInicialTronco | Decimal | Saldo inicial do tronco de beneficência |
| saldoFinalTronco | Decimal | Saldo final do tronco |
| totalTroncoRecebido | Decimal | Total arrecadado no tronco |
| totalDoacoesFilantropicas | Decimal | Total doado em ações filantrópicas |
| saldoFinal | Decimal | Saldo geral (caixa + tronco) |

#### `Ata` — Registro de sessões/reuniões
| Campo | Tipo | Descrição |
|-------|------|-----------|
| numeroAta | String | Número da ata (ex: "01/2025") |
| livro | String | APRENDIZ, COMPANHEIRO, MESTRE |
| tipoSessao | String? | MAGNA, INICIACAO, ELEVACAO, etc. |
| data | DateTime | Data da sessão |
| horarioInicio / Encerramento | String | Horários da sessão |
| numeroPresentes | Int | Quantidade de presentes |
| valorTronco | Decimal | Valor arrecadado no tronco |
| local | String? | Local onde ocorreu a sessão |
| usarAssinaturas | Boolean | Se deve exibir assinaturas na ata |
| leituraAta / expediente / ordemDia... | String? | Conteúdo textual da ata |

> **Nota**: A constraint `@@unique([numeroAta, livro])` garante que o mesmo número de ata pode existir em livros diferentes (ex: ata 01/2025 pode existir no livro Aprendiz E no livro Companheiro).

#### `Reuniao` e `Presenca` — Controle de frequência
| Campo | Tipo | Descrição |
|-------|------|-----------|
| data | DateTime | Data da reunião |
| grau | String | Grau ao qual pertence a reunião |
| alertaHojeEnviadoEm | DateTime? | Controle anti-duplicidade de alertas |
| alertaAmanhaEnviadoEm | DateTime? | Controle anti-duplicidade de alertas |

#### `ControleMensalidade` — Status de mensalidade por membro/mês
| Campo | Tipo | Descrição |
|-------|------|-----------|
| ano | Int | Ano de referência |
| membroId | String | Referência ao membro |
| mes | String | JAN, FEV, MAR, ... DEZ |
| status | String | `ok` (pago), `x` (inadimplente), `p` (parcial), `i` (isento) |

---

## 5. Módulos e Funcionalidades

### 5.1 Autenticação (`/login`)

- Formulário de login com usuário e senha
- Rate limiting: máximo 5 tentativas por IP em 15 minutos
- Senha verificada com bcrypt (salt 12)
- Token JWT assinado com HS256, validade 7 dias
- Token armazenado em cookie HTTP-only (não acessível via JS)
- Logout limpa o cookie

### 5.2 Dashboard (`/dashboard`)

Painel principal com estatísticas em tempo real:
- Total de membros / membros ativos
- Frequência média em reuniões
- Membros em dia / inadimplentes com mensalidades
- Links rápidos para todos os módulos
- Controle de visibilidade por papel do usuário

### 5.3 Gerenciar Membros (`/membros`)

- Listagem em ordem alfabética com filtro por grau e status
- Cadastro completo: dados pessoais, datas maçônicas, cargo, e-mail
- Upload de assinatura digital (via Cloudinary)
- Gerenciamento de dependentes (cônjuge, filhos)
- Aniversariantes do mês em destaque

### 5.4 Atas (`/atas`)

- Listagem de todas as atas com filtro por livro (grau)
- **Criação de ata** com formulário de múltiplas etapas:
  1. Dados gerais (número, data, local, horários, tronco)
  2. Cargos na sessão (seletor de membro ou digitação manual)
  3. Presenças (membros do quadro + visitantes)
  4. Conteúdo textual (leitura da ata, expediente, ordem do dia, etc.)
- **Visualização e impressão** com template formatado
- **Exportação em PDF** gerado no cliente com jsPDF
- Suporte a assinaturas digitais na ata (imagens dos cargos TESOUREIRO e VENERÁVEL MESTRE)
- Conteúdo das atas visível apenas para usuários com grau maçônico compatível

### 5.5 Controle de Presenças (`/presencas`)

- Cadastro de reuniões com data, horário e grau
- Registro de presença por reunião: lista de todos os membros ativos com checkbox
- Histórico de frequência por membro
- Alertas automáticos enviados por e-mail:
  - "Reunião amanhã" — dia anterior
  - "Reunião hoje" — no dia da reunião
  - Cron jobs configurados para disparo automático

### 5.6 Mensalidades (`/mensalidades`)

- Planilha mensal com todos os membros ativos
- Status por membro/mês: pago (`ok`), inadimplente (`x`), parcial (`p`), isento (`i`)
- Configuração do valor por mês/ano
- Relatório de inadimplência
- Integração com o módulo financeiro (registra pagamentos na planilha financeira)

### 5.7 Financeiro (`/financeiro`)

- Planilhas financeiras mensais
- **Caixa**:
  - Saldo inicial e final
  - Receitas: mensalidades + outras entradas
  - Despesas: classificadas por categoria e tipo (FIXO ou VARIÁVEL)
- **Tronco de Beneficência**:
  - Valores arrecadados por sessão
  - Doações filantrópicas realizadas
- Totais recalculados automaticamente a cada operação
- Exportação em PDF da planilha mensal

### 5.8 Recibos (`/recibo`)

- Emissão de recibo de pagamento de mensalidade
- Seleção do membro e período referente
- Geração de PDF formatado com logotipo e assinaturas
- Histórico de recibos emitidos

### 5.9 Alertas (`/alertas`)

- Listagem das reuniões com status de alertas enviados
- Envio manual de alerta para reunião específica
- Envio de e-mail personalizado para membros selecionados
- Configuração de e-mail via Gmail SMTP

### 5.10 Gerenciar Usuários (`/usuarios`)

- Criação de usuários do sistema (acesso restrito ao ADMIN)
- Atribuição de papel (role): ADMIN, VENERAVEL, TESOUREIRO, SECRETARIO
- Permissões customizadas por usuário
- Atribuição de grau maçônico (controla acesso ao conteúdo de atas)
- Alteração de senha

---

## 6. API REST — Endpoints

### Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/login` | Autenticar usuário, retorna cookie JWT |
| POST | `/api/auth/logout` | Invalidar sessão (limpa cookie) |
| GET | `/api/auth/me` | Retornar dados do usuário autenticado |

### Membros

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/membros` | Listar todos os membros |
| GET | `/api/membros?financeiro=true` | Listar apenas membros ativos com grau permitido |
| GET | `/api/membros?assinaturas=true` | Retornar assinaturas do Tesoureiro e Venerável Mestre |
| POST | `/api/membros` | Criar novo membro |
| PUT | `/api/membros` | Atualizar membro (por ID no body) |
| DELETE | `/api/membros` | Remover membro |

### Dependentes

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/dependentes` | Listar dependentes |
| POST | `/api/dependentes` | Criar dependente |
| PUT | `/api/dependentes` | Atualizar dependente |
| DELETE | `/api/dependentes` | Remover dependente |

### Atas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/atas` | Listar todas as atas (com cargos e presenças) |
| POST | `/api/atas` | Criar nova ata (em transação atômica) |
| GET | `/api/atas/[id]` | Buscar ata específica |
| PUT | `/api/atas/[id]` | Atualizar ata |
| DELETE | `/api/atas/[id]` | Remover ata |

### Reuniões e Presenças

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/reunioes` | Listar reuniões |
| POST | `/api/reunioes` | Criar reunião |
| PUT | `/api/reunioes` | Atualizar reunião |
| DELETE | `/api/reunioes` | Remover reunião |
| GET | `/api/presencas` | Buscar presenças de uma reunião |
| POST | `/api/presencas` | Registrar presença |
| PUT | `/api/presencas` | Atualizar presença |

### Mensalidades

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/mensalidades?ano=YYYY` | Buscar status de mensalidades do ano |
| POST | `/api/mensalidades` | Atualizar status de mensalidade |
| GET | `/api/mensalidades/config` | Buscar configuração (valor) por mês/ano |
| POST | `/api/mensalidades/config` | Salvar configuração de mensalidade |

### Financeiro

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/planilhas` | Listar todas as planilhas |
| GET | `/api/planilhas?id=ID` | Buscar planilha completa |
| POST | `/api/planilhas` | Criar planilha mensal |
| PUT | `/api/planilhas/[id]` | Atualizar planilha |
| DELETE | `/api/planilhas/[id]` | Remover planilha |
| POST | `/api/planilhas/pagamentos` | Registrar pagamento de mensalidade na planilha |

### Upload

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/upload` | Fazer upload de imagem para o Cloudinary |

### Usuários

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/usuarios` | Listar usuários |
| POST | `/api/usuarios` | Criar usuário |
| PUT | `/api/usuarios` | Atualizar usuário |
| DELETE | `/api/usuarios` | Remover usuário |
| PUT | `/api/usuarios/senha` | Alterar senha do usuário |

### Alertas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/alertas/enviar` | Enviar alertas automáticos de reunião |
| POST | `/api/alertas/enviar-manual` | Enviar alerta manualmente para reunião |
| POST | `/api/alertas/email-personalizado` | Enviar e-mail personalizado |

### Cron Jobs (agendados)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/cron/alertas` | Verificar e enviar alertas pendentes (via cron) |
| GET | `/api/cron/aniversarios` | Enviar parabéns por aniversário |

---

## 7. Autenticação e Controle de Acesso

### Fluxo de Autenticação

```
1. Usuário envia POST /api/auth/login com { username, password }
2. Sistema verifica rate limiting por IP (máx. 5 tentativas/15min)
3. Senha comparada com hash bcrypt armazenado no banco
4. Se válido: JWT gerado com { userId, username, role, permissions, grau }
5. JWT salvo como cookie HTTP-only (path=/; maxAge=7 dias)
6. Todas as requisições subsequentes enviam o cookie automaticamente
7. Route Handlers extraem e verificam o JWT via authMiddleware.js
```

### Papéis (Roles)

| Role | Acesso |
|------|--------|
| `ADMIN` | Acesso total a todos os módulos |
| `VENERAVEL` | Acesso total a todos os módulos |
| `TESOUREIRO` | Recibo, Financeiro, Mensalidades, visualização de Membros, Presenças, Alertas |
| `SECRETARIO` | Membros, Atas, Presenças, Alertas |

### Permissões Individuais (Override)

Além do papel, cada usuário pode ter permissões individuais no campo `permissions` (JSON array). Exemplo:
```json
["membros", "atas", "presencas", "recibo", "financeiro", "mensalidades"]
```

Quando definidas, as permissões individuais sobrepõem as permissões do papel.

### Controle de Visibilidade de Atas

O campo `grau` no usuário controla quais livros de ata são visíveis:
- Usuário sem grau: não vê atas
- Usuário com grau APRENDIZ: vê apenas atas do livro APRENDIZ
- Usuário com grau COMPANHEIRO: vê atas de APRENDIZ e COMPANHEIRO
- Usuário com grau MESTRE ou MESTRE INSTALADO: vê todas as atas

### Segurança Adicional

- Headers de segurança HTTP configurados no `next.config.mjs`:
  - `X-Frame-Options: DENY` — previne clickjacking
  - `X-Content-Type-Options: nosniff` — previne MIME sniffing
  - `X-XSS-Protection: 1; mode=block` — proteção XSS no navegador
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` — restringe câmera, microfone e geolocalização
- Senhas nunca armazenadas em texto plano (bcrypt com salt 12)
- Tokens JWT não acessíveis via JavaScript (HTTP-only cookie)
- HTTPS obrigatório em produção (cookie `secure: true`)

---

## 8. Fluxos Principais

### 8.1 Fluxo: Criar uma Ata

```
1. Usuário acessa /atas/nova
2. Preenche: número, livro, tipo de sessão, data, local, horários, tronco
3. Adiciona cargos (Venerável, Vigilantes, Secretário, etc.) — seletor de membro ou nome manual
4. Registra presentes (membros do quadro + visitantes)
5. Preenche conteúdo textual opcional (leitura da ata, expediente, etc.)
6. Clica "Criar Ata" → POST /api/atas
7. API executa em prisma.$transaction():
   a. Cria registro na tabela `atas`
   b. Cria registros em `atas_cargos`
   c. Cria registros em `atas_presencas`
8. Redireciona para visualização da ata (/atas/[id]/visualizar)
```

### 8.2 Fluxo: Registrar Pagamento de Mensalidade

```
1. Tesoureiro acessa /mensalidades
2. Visualiza grade: membros × meses
3. Clica em uma célula para alterar status (ok/x/p/i)
4. POST /api/mensalidades com { membroId, mes, ano, status }
5. Sistema atualiza ControleMensalidade no banco
6. Se status = 'ok', Tesoureiro pode registrar na planilha financeira:
   → POST /api/planilhas/pagamentos
   → Registra em PagamentoMensalidade
   → Chama recalcularTotais() que recalcula todos os saldos da planilha
```

### 8.3 Fluxo: Envio de Alerta de Reunião

```
1. Cron job aciona GET /api/cron/alertas (agendado no Vercel)
2. Sistema busca reuniões do dia atual e do dia seguinte
3. Para cada reunião sem alerta enviado:
   a. Busca membros ativos com e-mail cadastrado e grau compatível
   b. Envia e-mail via Nodemailer (Gmail SMTP)
   c. Registra data/hora do envio (alertaHojeEnviadoEm / alertaAmanhaEnviadoEm)
4. Controle anti-duplicidade: campos de data impedem reenvio no mesmo dia
```

### 8.4 Fluxo: Geração de PDF da Ata

```
1. Usuário acessa /atas/[id]/visualizar
2. Clica "Gerar PDF"
3. JavaScript no cliente (jsPDF) lê os dados da ata já carregados
4. Monta documento PDF com:
   - Cabeçalho: nome da loja, número da ata, livro, data
   - Local da sessão (campo editável)
   - Cargos presentes
   - Lista de presenças
   - Conteúdo textual (leitura da ata, expediente, ordem do dia, etc.)
   - Assinaturas digitais (se usarAssinaturas = true)
5. PDF baixado no navegador do usuário
```

---

## 9. Configuração e Implantação

### Variáveis de Ambiente

```env
# Banco de dados
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Autenticação JWT (mínimo 32 caracteres)
JWT_SECRET=chave-secreta-com-mais-de-32-caracteres

# Usuário master (criado automaticamente no seed)
MASTER_USERNAME=admin
MASTER_PASSWORD=senha-admin

# Cloudinary (upload de imagens)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=nome-do-cloud
CLOUDINARY_API_KEY=chave-api
CLOUDINARY_API_SECRET=segredo-api

# E-mail (Gmail SMTP)
EMAIL_USER=email@gmail.com
EMAIL_PASS=senha-de-app-gmail
EMAIL_FROM=email@gmail.com

# Cron jobs (token de segurança)
CRON_SECRET=token-secreto-cron

# URL pública do site (para e-mails com links)
NEXT_PUBLIC_SITE_URL=https://seu-dominio.vercel.app
```

### Passos para Implantação

```bash
# 1. Instalar dependências
npm install

# 2. Gerar o Prisma Client
npx prisma generate

# 3. Executar migrações do banco
npx prisma migrate deploy

# 4. Popular dados iniciais (usuário admin)
npm run seed

# 5. Build de produção
npm run build

# 6. Iniciar servidor
npm start
```

### Implantação no Vercel

O projeto possui `vercel.json` configurado para implantação automática. O Vercel detecta automaticamente o Next.js e configura o build. As variáveis de ambiente devem ser configuradas no painel do Vercel.

**Cron Jobs no Vercel**: Configurados em `vercel.json` para execução automática dos alertas de reuniões e aniversários.

---

## 10. Estrutura de Pastas

```
recibosabedoria/
├── prisma/
│   ├── schema.prisma          # Modelos do banco de dados
│   └── migrations/            # Histórico de migrações
│
├── src/
│   ├── app/
│   │   ├── layout.js          # Layout raiz (PWA, providers)
│   │   ├── page.js            # Página raiz (redirect)
│   │   │
│   │   ├── login/
│   │   │   └── page.js        # Tela de login
│   │   │
│   │   ├── dashboard/
│   │   │   └── page.js        # Painel principal
│   │   │
│   │   ├── membros/
│   │   │   └── page.js        # Gestão de membros e dependentes
│   │   │
│   │   ├── atas/
│   │   │   ├── page.js        # Lista de atas
│   │   │   ├── nova/page.js   # Criar nova ata
│   │   │   └── [id]/
│   │   │       ├── visualizar/page.js  # Visualizar e imprimir ata
│   │   │       └── editar/page.js      # Editar ata existente
│   │   │
│   │   ├── presencas/
│   │   │   └── page.js        # Controle de frequência
│   │   │
│   │   ├── mensalidades/
│   │   │   └── page.js        # Grade de mensalidades
│   │   │
│   │   ├── financeiro/
│   │   │   ├── page.js        # Lista de planilhas financeiras
│   │   │   └── [id]/page.js   # Planilha financeira detalhada
│   │   │
│   │   ├── recibo/
│   │   │   └── page.js        # Emissão de recibos
│   │   │
│   │   ├── alertas/
│   │   │   └── page.js        # Gerenciamento de alertas
│   │   │
│   │   ├── usuarios/
│   │   │   └── page.js        # Gestão de usuários
│   │   │
│   │   ├── api/               # Route Handlers (API REST)
│   │   │   ├── auth/          # login, logout, me
│   │   │   ├── membros/       # CRUD membros
│   │   │   ├── dependentes/   # CRUD dependentes
│   │   │   ├── atas/          # CRUD atas
│   │   │   ├── reunioes/      # CRUD reuniões
│   │   │   ├── presencas/     # Registro de presença
│   │   │   ├── mensalidades/  # Status e configuração
│   │   │   ├── planilhas/     # Financeiro
│   │   │   ├── usuarios/      # CRUD usuários
│   │   │   ├── upload/        # Upload para Cloudinary
│   │   │   ├── alertas/       # Envio de e-mails
│   │   │   └── cron/          # Jobs agendados
│   │   │
│   │   └── components/        # Componentes reutilizáveis
│   │       ├── Breadcrumbs.js
│   │       ├── ConfirmDialog.js
│   │       ├── Toast.js
│   │       ├── SeletorMembro.js
│   │       ├── SeletorMembroCargo.js
│   │       └── SeletorMembrosQuadro.js
│   │
│   └── lib/
│       ├── auth.js                    # Hash e JWT
│       ├── authMiddleware.js          # Middleware de autenticação
│       ├── prisma.js                  # Singleton do PrismaClient
│       ├── email.js                   # Funções de e-mail
│       └── recalcularTotaisPlanilha.js # Cálculos financeiros
│
├── public/                    # Arquivos estáticos
│   ├── icons/                 # Ícones para PWA
│   └── manifest.json          # Manifesto do PWA
│
├── scripts/                   # Scripts utilitários
│   └── seed.js                # Popular banco com dados iniciais
│
├── tests/                     # Testes Playwright
│
├── next.config.mjs            # Configuração Next.js + PWA + headers
├── tailwind.config.js         # Configuração Tailwind CSS
├── package.json               # Dependências e scripts
├── prisma/schema.prisma       # Schema do banco de dados
└── vercel.json                # Configuração de deploy
```

---

## Considerações Finais

### Limitações Conhecidas

1. **Banco Neon Serverless**: O banco hiberna após inatividade, causando latência na primeira requisição após período ocioso. Para mitigar, operações múltiplas usam `prisma.$transaction()` em vez de `Promise.all()`.

2. **Rate Limiting In-Memory**: O controle de tentativas de login é armazenado em memória do servidor Next.js. Em ambiente serverless (Vercel), cada instância tem sua própria memória, então o limite não é compartilhado entre instâncias. Em produção de alta escala, deveria usar Redis.

3. **Cron Jobs via Vercel**: Os jobs agendados dependem do plano do Vercel para frequência mínima de execução.

### Decisões de Design

- **Datas como String**: Datas maçônicas (dataNascimento, dataIniciacao, etc.) são armazenadas como String para evitar problemas de fuso horário ao exibir no frontend brasileiro (UTC-3). Datas de eventos (reuniões, atas) usam `new Date(data + 'T12:00:00Z')` para salvar ao meio-dia UTC, garantindo exibição correta no fuso horário brasileiro.

- **Assinatura Digital**: Upload da assinatura é feito via Cloudinary e a URL é armazenada no cadastro do membro. Na geração da ata, a imagem é carregada e inserida no PDF via jsPDF.

- **Transações Atômicas**: A criação de atas usa `prisma.$transaction()` para garantir que a ata, os cargos e as presenças sejam criados atomicamente — ou tudo é criado, ou nada.

---

*Documentação gerada automaticamente com base no código-fonte do projeto.*
*Versão do sistema: 1.0.0 | Next.js 16 | Prisma 6 | PostgreSQL (Neon)*
