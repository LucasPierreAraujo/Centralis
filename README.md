# A.R.L.S. Sabedoria de Salomão Nº 4774 - Sistema de Gestão

Sistema de gerenciamento maçônico desenvolvido com Next.js para a Loja Sabedoria de Salomão.

## 🔒 IMPORTANTE: Configuração de Segurança

**⚠️ LEIA ISTO ANTES DE EXECUTAR O PROJETO**

Este projeto requer configuração de variáveis de ambiente sensíveis. **NUNCA** commite credenciais no Git.

### 1. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo e configure suas credenciais:

```bash
cp .env.example .env
```

Edite o arquivo `.env` e configure:

```env
# Database
DATABASE_URL="postgresql://usuario:senha@localhost:5432/sabedoria"

# JWT Secret (OBRIGATÓRIO - mínimo 32 caracteres)
JWT_SECRET="sua-chave-jwt-muito-segura-com-32-caracteres-minimo"
```

**Gere uma JWT_SECRET segura:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Criar Usuário Master

```bash
MASTER_USERNAME="seu_usuario" MASTER_PASSWORD="Senha_Forte_123!" node scripts/createMasterUser.js
```

### 3. Executar Migrações do Banco

```bash
npx prisma migrate deploy
npx prisma generate
```

📖 **Leia o arquivo [SECURITY.md](./SECURITY.md) para mais informações sobre segurança.**

## 🚀 Getting Started

Após configurar as variáveis de ambiente, inicie o servidor de desenvolvimento:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# Centralis
