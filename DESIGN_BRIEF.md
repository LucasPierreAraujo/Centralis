# Brief de Design — Sistema de Gestão Maçônico
## A.R.L.S. Sabedoria de Salomão Nº 4774

---

## 1. CONTEXTO DO PROJETO

Este é um sistema web de gestão para uma loja maçônica (A.R.L.S. Sabedoria de Salomão Nº 4774, Oriente de Crato – CE). O sistema digitaliza processos administrativos que antes eram feitos no papel: controle de membros, presenças em reuniões, mensalidades, financeiro, geração de atas e emissão de recibos.

O sistema já está em produção e funcionando. O objetivo deste redesign é **melhorar a experiência visual e de usabilidade**, sem alterar a lógica ou funcionalidades existentes.

**Stack atual:**
- Next.js 16 + React 18 (App Router)
- Tailwind CSS 3.4
- Lucide React (ícones)
- PostgreSQL (Neon Serverless) + Prisma ORM
- PWA (instalável no celular)
- Deploy na Vercel

---

## 2. IDENTIDADE VISUAL ATUAL

### Logo
- Selo maçônico circular com borda azul escura
- Texto: "A.R.L.S. SABEDORIA DE SALOMÃO Nº 4774 · ORIENTE DE CRATO CE"
- Imagem central: figura de Salomão com coroa e o templo
- Arquivo: `/public/logo.jpeg`

### Paleta de cores atual
| Papel | Cor |
|-------|-----|
| Primária | Azul maçônico `#1e3a8a` |
| Fundo | Branco `#ffffff` |
| Texto | Cinza escuro `#111827` |
| Sucesso | Verde |
| Erro | Vermelho |
| Aviso | Amarelo |

### Tipografia atual
Tailwind CSS padrão (sistema da plataforma – sem fonte customizada definida).

---

## 3. PÚBLICO-ALVO

- **Administrador / Venerável Mestre:** acesso total. Gerencia membros, usuários, financeiro, atas, presenças.
- **Tesoureiro:** recibos, financeiro, mensalidades, membros (visualização), presenças, alertas.
- **Secretário:** membros, atas, presenças, alertas.
- **Perfil geral:** homens adultos (30–70 anos), familiarizados com smartphones e computadores, mas não necessariamente com sistemas complexos. Precisam de interface clara, legível e direta.

---

## 4. DISPOSITIVOS E ACESSO

- **Desktop:** uso principal para operações longas (criar atas, planilhas financeiras, gerenciar membros)
- **Mobile:** uso frequente para consultas rápidas, marcar presenças, verificar mensalidades
- É um **PWA** (Progressive Web App) — pode ser instalado como app no celular

---

## 5. PÁGINAS DO SISTEMA

### 5.1 Login (`/login`)
- Formulário simples: usuário + senha (com toggle mostrar/ocultar)
- Fundo com degradê azul e logo da loja
- Limite de tentativas: 5 por IP em 15 minutos (feedback visual de erro)
- Redireciona para o dashboard após sucesso

---

### 5.2 Dashboard (`/dashboard`)
**Objetivo:** Visão geral e acesso rápido aos módulos

**Conteúdo atual:**
- Cards de estatísticas: total de membros, membros ativos, reuniões realizadas, taxa de presença
- Status financeiro: membros em dia vs. inadimplentes
- Links rápidos para todos os módulos

**Melhorias desejadas:**
- Design moderno com cards bem definidos
- Gráfico simples de presença (opcional)
- Hierarquia visual clara: o que é urgente vs. informativo

---

### 5.3 Membros (`/membros`)
**Objetivo:** CRUD completo de membros da loja

**Conteúdo atual:**
- Abas: Membros, Filiados, Candidatos, Dependentes, Outros
- Lista com nome, grau, cargo, status (ATIVO/INATIVO)
- Formulário de cadastro/edição com campos:
  - Nome, grau, CIM (ID maçônico), cargo, email
  - Datas maçônicas: iniciação, filiação, passagem de grau, elevação, instalação, regularização
  - Upload de assinatura digital (imagem no Cloudinary)
  - Dependentes: cônjuge, filhos (nome, tipo, data de nascimento, data de casamento)
- Destaque de aniversariantes do mês
- Filtro por grau e status

**Graus dos membros:**
`CANDIDATO`, `APRENDIZ`, `COMPANHEIRO`, `MESTRE`, `MESTRE INSTALADO`, `FILIADO`, `DEPENDENTE`, `OUTROS`

---

### 5.4 Atas (`/atas`)
**Objetivo:** Registro oficial das sessões maçônicas

**Conteúdo atual:**
- Lista de atas com filtro por livro (grau)
- Cada ata tem: número, data, tipo de sessão, livro
- Ações: visualizar, editar, gerar PDF

**Criação de nova ata (`/atas/nova`) — formulário multi-etapa:**
1. **Dados gerais:** número da ata, livro, tipo de sessão, data, local, horário de início/encerramento, valor do tronco
2. **Cargos:** Venerável Mestre, 1º Vigilante, 2º Vigilante, Secretário, Tesoureiro, etc. (dropdown de membro cadastrado ou nome manual)
3. **Presenças:** membros do quadro (checkboxes) + visitantes (nome manual)
4. **Conteúdo:** leitura da ata anterior, expediente, ordem do dia, cobertura do templo, palavra bem da loja

**Visualização (`/atas/[id]/visualizar`):**
- Formato de documento oficial
- Assinaturas digitais do Tesoureiro e Venerável (imagens)
- Exportação para PDF via jsPDF

**Tipos de sessão:** `MAGNA`, `INICIACAO`, `ELEVACAO`, `PASSAGEM_GRAU`, `INSTALACAO`, entre outros

**Livros:** `APRENDIZ`, `COMPANHEIRO`, `MESTRE` (acesso controlado pelo grau do usuário logado)

---

### 5.5 Presenças (`/presencas`)
**Objetivo:** Controle de presença nas reuniões

**Conteúdo atual:**
- Lista de reuniões agendadas (data, horário, grau)
- Para cada reunião: checkboxes para todos os membros ativos compatíveis com o grau
- Campo para adicionar visitantes com nome manual
- Histórico de presença por membro
- Botão de envio manual de alerta por reunião

---

### 5.6 Mensalidades (`/mensalidades`)
**Objetivo:** Controle de pagamento das mensalidades

**Conteúdo atual:**
- Grade/tabela: membros × 12 meses
- Status por célula:
  - `ok` = pago (verde)
  - `x` = inadimplente (vermelho)
  - `p` = parcial (amarelo)
  - `i` = isento (cinza)
- Configuração do valor da mensalidade
- Relatório de inadimplentes

---

### 5.7 Financeiro (`/financeiro`)
**Objetivo:** Planilha financeira mensal

**Conteúdo atual:**
- Lista de planilhas mensais
- Criação de nova planilha: mês, ano, saldos iniciais (caixa e tronco)
- Detalhamento (`/financeiro/[id]`):
  - **Seção Caixa:** receitas (mensalidades + outros) e despesas por categoria
  - **Seção Tronco da Beneficência:** coletas por sessão + doações filantrópicas
  - Recálculo automático de totais
  - Exportação para PDF

**Categorias de despesa:** utilidades, manutenção, etc.
**Tipos de gasto:** `FIXO` / `VARIÁVEL`

---

### 5.8 Recibo (`/recibo`)
**Objetivo:** Emissão de recibos de mensalidade

**Conteúdo atual:**
- Selecionar membro e período de referência
- Gerar PDF com logo, nome, período, valor e assinaturas digitais
- Histórico de recibos emitidos

---

### 5.9 Alertas (`/alertas`)
**Objetivo:** Notificações por e-mail sobre reuniões

**Conteúdo atual:**
- Lista de reuniões com status de alerta enviado
- Envio manual de alerta para reunião específica
- Composição de e-mail personalizado para todos os membros
- Configuração de e-mail via Gmail SMTP

**Alertas automáticos (cron):**
- Dia anterior à reunião: "Amanhã tem reunião..."
- Dia da reunião: "Hoje tem reunião..."
- Anti-duplicata: registra timestamp de envio

---

### 5.10 Usuários (`/usuarios`) — Somente Admin
**Objetivo:** Gerenciamento de acesso ao sistema

**Conteúdo atual:**
- CRUD de usuários do sistema
- Campos: usuário, senha, papel, grau maçônico
- Papéis: `ADMIN`, `VENERAVEL`, `TESOUREIRO`, `SECRETARIO`
- Permissões customizadas por usuário (override do papel)
- Alteração de senha

---

### 5.11 Candidatos (`/candidatos`)
**Objetivo:** Acompanhamento do processo de iniciação de candidatos

**Conteúdo atual:**
- Lista de candidatos com status
- Cadastro: nome, email, telefone, data de nascimento, proponentes
- Progresso por etapas (configuráveis) com data e observação por etapa
- Status: `EM_ANDAMENTO`, `APROVADO`, `REPROVADO`, `DESISTIU`
- Resultado da sindicância
- CIM após aprovação

---

### 5.12 Promoção/Elevação (`/promocao`)
**Objetivo:** Acompanhamento da progressão de grau dos membros

**Conteúdo atual:**
- Lista de promoções/elevações em andamento
- Tipos: `PROMOCAO` (→ Companheiro), `ELEVACAO` (→ Mestre)
- Status e etapas configuráveis

---

## 6. COMPONENTES GLOBAIS

### Navegação lateral / topo
- Links para todos os módulos com ícones Lucide
- Exibe nome do usuário logado e botão de logout
- Acesso controlado por papel (Tesoureiro não vê `/usuarios`, etc.)

### Toast de notificação (global)
- Posicionado no canto da tela
- Tipos: `success` (verde), `error` (vermelho), `warning` (amarelo), `info` (azul)
- Auto-dismiss configurável

### Dialog de confirmação (global)
- Modal centralizado antes de ações destrutivas (deletar)
- Botões: Confirmar / Cancelar

### Seletor de membro
- Toggle entre: dropdown de membros cadastrados ↔ campo de texto manual
- Usado nos cargos e presenças das atas

### Breadcrumbs
- Navegação hierárquica nas páginas internas

---

## 7. DIRETRIZES PARA O REDESIGN

### O que manter
- Funcionalidade 100% igual — apenas aparência e usabilidade
- Logo e identidade maçônica
- Paleta de cores com azul como cor primária (pode refinar o tom)
- Ícones Lucide React

### O que melhorar
1. **Visual geral:** mais moderno, clean, com boa hierarquia tipográfica
2. **Navegação:** menu lateral fixo (sidebar) em desktop, bottom navigation ou drawer em mobile
3. **Tabelas:** mais legíveis, com zebra stripes ou separadores sutis, ações visíveis no hover
4. **Formulários:** campos mais espaçados, labels claros, feedback de validação inline
5. **Cards/KPIs:** no dashboard, usar cards com sombra, ícones e cor de destaque
6. **Responsividade:** garantir que todas as telas funcionem bem em 320px até 1440px
7. **Acessibilidade:** contraste mínimo WCAG AA, estados de foco visíveis

### Referências de estilo (sugestões)
- ShadCN/UI (clean, minimalista)
- Tailwind UI (componentes bem estruturados)
- Linear / Notion (hierarquia tipográfica forte)
- Tom sóbrio e institucional — é um sistema para uma organização tradicional

### O que evitar
- Cores vibrantes demais ou paletas "startup tech"
- Animações excessivas ou distrativas
- Interface muito densa que dificulte uso em mobile

---

## 8. ENTREGAS ESPERADAS DO REDESIGN

1. **Telas obrigatórias** (mockup ou código):
   - [ ] Login
   - [ ] Dashboard
   - [ ] Membros (lista + formulário de cadastro)
   - [ ] Atas (lista + criação multi-etapa + visualização)
   - [ ] Presenças
   - [ ] Mensalidades (grade)
   - [ ] Financeiro (lista + planilha detalhada)
   - [ ] Recibo
   - [ ] Candidatos
   - [ ] Usuários
   - [ ] Alertas

2. **Componentes globais:**
   - [ ] Sidebar / navegação
   - [ ] Toast notifications
   - [ ] Modal de confirmação
   - [ ] Seletor de membro

3. **Guia de estilo mínimo:**
   - Paleta de cores definida (primária, secundária, estados)
   - Tipografia (família, tamanhos, pesos)
   - Espaçamento base
   - Bordas e sombras

---

## 9. INFORMAÇÕES TÉCNICAS PARA O DESENVOLVEDOR

- O sistema usa **Tailwind CSS** — o redesign deve ser implementável via classes Tailwind
- Componentes em **React** (Next.js App Router)
- Sem biblioteca de componentes UI atualmente (tudo custom com Tailwind)
- Pode-se adotar **shadcn/ui** ou **Radix UI** como base de componentes, se desejado
- Ícones: **Lucide React** (manter para consistência)
- Geração de PDF: jsPDF (client-side) — as telas de visualização de ata e recibo precisam funcionar bem para impressão/exportação

---

## 10. CONTATO E CONTEXTO ADICIONAL

- **Projeto:** Sistema privado de gestão para loja maçônica
- **Usuários:** ~20–50 usuários internos (membros da loja)
- **Ambiente:** Web (desktop + mobile via PWA)
- **URL de produção:** deploy na Vercel (privado)

---

*Documento gerado em abril de 2026 para briefing de redesign de interface.*
