// scripts/setupRoles.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔧 Verificando estrutura do banco...\n');

    // Verificar se o enum UserRole existe
    const enumExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'UserRole'
      )`;

    if (!enumExists[0].exists) {
      console.log('📝 Criando enum UserRole...');
      await prisma.$executeRaw`CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'TESOUREIRO', 'SECRETARIO')`;
      console.log('✅ Enum criado\n');
    } else {
      console.log('✅ Enum UserRole já existe\n');
    }

    // Verificar se a coluna role existe
    const columnExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role'
      )`;

    if (!columnExists[0].exists) {
      console.log('📝 Adicionando coluna role na tabela users...');
      await prisma.$executeRaw`ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'ADMIN'`;
      console.log('✅ Coluna role adicionada\n');
    } else {
      console.log('✅ Coluna role já existe\n');
    }

    // Criar usuários
    console.log('👥 Criando usuários...\n');

    // 1. Tesoureiro
    const tesoureiroExists = await prisma.user.findUnique({
      where: { username: 'Tesoureiro' }
    });

    if (!tesoureiroExists) {
      const hashedPassword = await bcrypt.hash('Tesoureiro2025@', 12);
      await prisma.user.create({
        data: {
          username: 'Tesoureiro',
          password: hashedPassword,
          role: 'TESOUREIRO'
        }
      });
      console.log('✅ Usuário TESOUREIRO criado');
      console.log('   Login: Tesoureiro');
      console.log('   Senha: Tesoureiro2025@\n');
    } else {
      console.log('ℹ️  Usuário Tesoureiro já existe\n');
    }

    // 2. Secretário
    const secretarioExists = await prisma.user.findUnique({
      where: { username: 'secretario' }
    });

    if (!secretarioExists) {
      const hashedPassword = await bcrypt.hash('Secretario2025@', 12);
      await prisma.user.create({
        data: {
          username: 'secretario',
          password: hashedPassword,
          role: 'SECRETARIO'
        }
      });
      console.log('✅ Usuário SECRETARIO criado');
      console.log('   Login: secretario');
      console.log('   Senha: Secretario2025@\n');
    } else {
      console.log('ℹ️  Usuário secretario já existe\n');
    }

    // Listar todos os usuários
    console.log('📋 Usuários cadastrados:');
    const users = await prisma.user.findMany({
      select: {
        username: true,
        role: true,
        createdAt: true
      }
    });

    users.forEach(user => {
      console.log(`   - ${user.username} (${user.role})`);
    });

    console.log('\n✅ Setup de roles concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro no setup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
