// scripts/cleanOldAdmin.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🧹 Limpando usuário antigo...\n');

    // Deletar SabedoriaDeSalomao (agora existe como Veneravel)
    const oldAdmin = await prisma.user.findUnique({
      where: { username: 'SabedoriaDeSalomao' }
    });

    if (oldAdmin) {
      await prisma.user.delete({
        where: { username: 'SabedoriaDeSalomao' }
      });
      console.log('✅ Usuario "SabedoriaDeSalomao" removido (já existe como "Veneravel")');
    } else {
      console.log('✅ Usuario "SabedoriaDeSalomao" não encontrado');
    }

    console.log('\n📋 Usuários finais:');
    const allUsers = await prisma.user.findMany({
      select: {
        username: true,
        role: true
      },
      orderBy: {
        role: 'asc'
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
