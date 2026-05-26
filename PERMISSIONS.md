# 🔐 Sistema de Permissões

## Visão Geral

O sistema implementa controle de acesso baseado em roles (RBAC - Role-Based Access Control) com três níveis de permissão:

1. **ADMIN** - Acesso total ao sistema
2. **TESOUREIRO** - Acesso financeiro
3. **SECRETARIO** - Acesso administrativo

---

## Usuários Padrão

### 1. ADMIN
- **Login**: (definido no setup inicial)
- **Acesso**: Total - todas as funcionalidades
- **Descrição**: Administrador com permissões completas

### 2. TESOUREIRO
- **Login**: `Tesoureiro`
- **Senha**: `Tesoureiro2025@`
- **Acesso**:
  - ✅ Gerar Recibos
  - ✅ Gestão Financeira (Planilhas)
  - ✅ Controle de Mensalidades
  - ✅ Visualizar Membros (somente leitura)
- **Restrições**:
  - ❌ Não pode criar/editar/excluir membros
  - ❌ Não pode acessar Atas
  - ❌ Não pode acessar Controle de Presenças

### 3. SECRETARIO
- **Login**: `secretario`
- **Senha**: `Secretario2025@`
- **Acesso**:
  - ✅ Gestão de Membros (criar, editar, excluir)
  - ✅ Atas de Sessões
  - ✅ Controle de Presenças
- **Restrições**:
  - ❌ Não pode acessar Gestão Financeira
  - ❌ Não pode acessar Mensalidades
  - ❌ Não pode gerar Recibos

---

## Mapa de Permissões

| Recurso | ADMIN | TESOUREIRO | SECRETARIO |
|---------|-------|------------|------------|
| **Dashboard** | ✅ | ✅ | ✅ |
| **Membros** (Leitura) | ✅ | ✅ | ✅ |
| **Membros** (Criar/Editar/Excluir) | ✅ | ❌ | ✅ |
| **Atas de Sessões** | ✅ | ❌ | ✅ |
| **Controle de Presenças** | ✅ | ❌ | ✅ |
| **Gestão Financeira** | ✅ | ✅ | ❌ |
| **Mensalidades** | ✅ | ✅ | ❌ |
| **Gerar Recibos** | ✅ | ✅ | ❌ |

---

## Implementação Técnica

### Estrutura de Permissões

```javascript
const PERMISSIONS = {
  ADMIN: ['*'], // Acesso total

  TESOUREIRO: [
    'recibo',           // Gerar recibos
    'financeiro',       // Gestão financeira
    'mensalidades',     // Controle de mensalidades
    'membros:read'      // Leitura de membros
  ],

  SECRETARIO: [
    'membros',          // Gestão completa de membros
    'atas',             // Atas de sessões
    'presencas'         // Controle de presenças
  ]
};
```

### Uso nos API Routes

#### Autenticação Simples (todos os usuários autenticados)
```javascript
import { withAuth } from '../../../lib/authMiddleware';

export const GET = withAuth(async (request, { user }) => {
  // user.role, user.username, user.userId disponíveis
  // ...
});
```

#### Autenticação com Permissão Específica
```javascript
import { withPermission } from '../../../lib/authMiddleware';

// Apenas SECRETARIO e ADMIN podem acessar
export const POST = withPermission('membros')(async (request, { user }) => {
  // ...
});

// Apenas TESOUREIRO e ADMIN podem acessar
export const POST = withPermission('financeiro')(async (request, { user }) => {
  // ...
});
```

### Verificação Manual de Permissões

```javascript
import { hasPermission } from '../../../lib/authMiddleware';

// No handler
if (!hasPermission(user.role, 'membros')) {
  return NextResponse.json(
    { error: 'Sem permissão' },
    { status: 403 }
  );
}
```

---

## Rotas da API e Permissões

### `/api/membros`
- **GET**: `withAuth` - Todos os usuários autenticados
- **POST**: `withPermission('membros')` - SECRETARIO, ADMIN
- **PUT**: `withPermission('membros')` - SECRETARIO, ADMIN
- **DELETE**: `withPermission('membros')` - SECRETARIO, ADMIN

### `/api/atas`
- **Todas**: `withPermission('atas')` - SECRETARIO, ADMIN

### `/api/presencas` e `/api/reunioes`
- **Todas**: `withPermission('presencas')` - SECRETARIO, ADMIN

### `/api/planilhas`
- **Todas**: `withPermission('financeiro')` - TESOUREIRO, ADMIN

### `/api/mensalidades`
- **Todas**: `withPermission('mensalidades')` - TESOUREIRO, ADMIN

### `/api/upload`
- **POST**: `withAuth` - Todos (usado para assinaturas em múltiplos contextos)

---

## JWT Token

O token JWT agora inclui o campo `role`:

```javascript
{
  userId: "...",
  username: "Tesoureiro",
  role: "TESOUREIRO",
  iat: ...,
  exp: ...
}
```

---

## Criar Novos Usuários

Use o script de setup ou crie manualmente via Prisma:

```bash
# Via script (recomendado)
node scripts/setupRoles.js

# Criar usuário ADMIN manualmente
MASTER_USERNAME="admin" MASTER_PASSWORD="SenhaForte123!" node scripts/createMasterUser.js
```

---

## Respostas HTTP

### 401 Unauthorized
Usuário não está autenticado (sem token ou token inválido)

```json
{
  "error": "Não autorizado. Faça login para continuar.",
  "authenticated": false
}
```

### 403 Forbidden
Usuário autenticado mas sem permissão para o recurso

```json
{
  "error": "Você não tem permissão para acessar membros.",
  "authenticated": true,
  "forbidden": true
}
```

---

## Adicionar Nova Permissão

1. Adicionar no enum `UserRole` em `prisma/schema.prisma`
2. Adicionar no objeto `PERMISSIONS` em `src/lib/authMiddleware.js`
3. Aplicar nas rotas usando `withPermission('novo-recurso')`
4. Criar migration do Prisma se necessário

---

## Migração de Usuários Existentes

Usuários criados antes do sistema de roles recebem automaticamente a role `ADMIN` (default no schema).

Para atualizar a role de um usuário existente:

```javascript
await prisma.user.update({
  where: { username: 'usuario' },
  data: { role: 'TESOUREIRO' }
});
```

---

## Testes

### Testar Login com Diferentes Roles

```bash
# Login como TESOUREIRO
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"Tesoureiro","password":"Tesoureiro2025@"}'

# Login como SECRETARIO
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"secretario","password":"Secretario2025@"}'
```

### Testar Permissões

```bash
# Tentar criar membro como TESOUREIRO (deve retornar 403)
curl -X POST http://localhost:3000/api/membros \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=TOKEN_DO_TESOUREIRO" \
  -d '{"nome":"Teste","grau":"APRENDIZ","status":"ATIVO"}'

# Tentar acessar financeiro como SECRETARIO (deve retornar 403)
curl http://localhost:3000/api/planilhas \
  -H "Cookie: auth-token=TOKEN_DO_SECRETARIO"
```

---

## Segurança

- ✅ Roles armazenadas no JWT (verificadas em cada request)
- ✅ Enum no banco de dados (valores validados)
- ✅ Middleware centralizado de permissões
- ✅ Rate limiting no login
- ✅ Senhas com bcrypt (12 rounds)
- ✅ Cookies HttpOnly

---

## Troubleshooting

### "Você não tem permissão"

1. Verifique se o usuário tem a role correta:
   ```javascript
   const user = await prisma.user.findUnique({
     where: { username: 'Tesoureiro' }
   });
   console.log(user.role);
   ```

2. Verifique se a permissão está configurada em `PERMISSIONS`

3. Verifique se o token JWT foi gerado após adicionar a role (faça logout/login)

### Migration Error

Se houver erro na migration, execute o script de setup:

```bash
node scripts/setupRoles.js
```

O script é idempotente e pode ser executado múltiplas vezes.

---

**Última atualização**: 2026-01-14
**Versão**: 1.0
