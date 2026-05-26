// scripts/createMasterUser.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // IMPORTANTE: Defina estas variáveis de ambiente antes de executar:
  // MASTER_USERNAME e MASTER_PASSWORD
  const username = process.env.MASTER_USERNAME;
  const password = process.env.MASTER_PASSWORD;

  if (!username || !password) {
    console.error('❌ Erro: Variáveis de ambiente MASTER_USERNAME e MASTER_PASSWORD não definidas!');
    console.error('Execute: MASTER_USERNAME=seu_usuario MASTER_PASSWORD=sua_senha node scripts/createMasterUser.js');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ Erro: A senha deve ter no mínimo 8 caracteres!');
    process.exit(1);
  }

  // Gera hash da senha
  const hashedPassword = await bcrypt.hash(password, 12);

  // Cria ou atualiza o usuário
  const user = await prisma.user.upsert({
    where: { username },
    update: { password: hashedPassword },
    create: {
      username,
      password: hashedPassword
    }
  });

  console.log('✅ Usuário master criado com sucesso!');
  console.log('Username:', username);
  console.log('⚠️  ATENÇÃO: Guarde a senha em local seguro. Ela não será exibida novamente.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });