// scripts/updateTesoureiroUsername.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    // Verificar se o usuário 'tesoureiro' existe
    const oldUser = await prisma.user.findUnique({
      where: { username: 'tesoureiro' }
    });

    if (oldUser) {
      console.log('📝 Atualizando username de "tesoureiro" para "Tesoureiro"...');

      await prisma.user.update({
        where: { username: 'tesoureiro' },
        data: { username: 'Tesoureiro' }
      });

      console.log('✅ Username atualizado com sucesso!');
      console.log('   Novo login: Tesoureiro');
      console.log('   Senha: Tesoureiro2025@ (inalterada)');
    } else {
      console.log('ℹ️  Usuário "tesoureiro" não encontrado.');

      // Verificar se "Tesoureiro" já existe
      const newUser = await prisma.user.findUnique({
        where: { username: 'Tesoureiro' }
      });

      if (newUser) {
        console.log('✅ Usuário "Tesoureiro" já existe.');
      } else {
        console.log('⚠️  Nenhum usuário encontrado. Execute: node scripts/setupRoles.js');
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
