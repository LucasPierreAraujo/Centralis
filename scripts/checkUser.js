// scripts/checkUser.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Verificando usuário Tesoureiro...\n');

    const user = await prisma.user.findUnique({
      where: { username: 'Tesoureiro' }
    });

    if (user) {
      console.log('✅ Usuário encontrado:');
      console.log('   Username:', user.username);
      console.log('   Role:', user.role);
      console.log('   ID:', user.id);
      console.log('   Criado em:', user.createdAt);
    } else {
      console.log('❌ Usuário "Tesoureiro" não encontrado!');
      console.log('\nExecute: node scripts/setupRoles.js');
    }

    console.log('\n📋 Todos os usuários:');
    const allUsers = await prisma.user.findMany({
      select: {
        username: true,
        role: true
      }
    });
    allUsers.forEach(u => {
      console.log(`   - ${u.username}: ${u.role}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
