// scripts/updateUsers.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔄 Atualizando usuários...\n');

    // 1. Renomear secretario → Secretario
    const secretario = await prisma.user.findUnique({
      where: { username: 'secretario' }
    });

    if (secretario) {
      await prisma.user.update({
        where: { username: 'secretario' },
        data: { username: 'Secretario' }
      });
      console.log('✅ Usuario "secretario" renomeado para "Secretario"');
    } else {
      const secretarioCapitalizado = await prisma.user.findUnique({
        where: { username: 'Secretario' }
      });
      if (secretarioCapitalizado) {
        console.log('✅ Usuario "Secretario" já existe');
      }
    }

    // 2. Renomear SabedoriaDeSalomão → Veneravel e mudar para role VENERAVEL
    const sabedoria = await prisma.user.findUnique({
      where: { username: 'SabedoriaDeSalomão' }
    });

    if (sabedoria) {
      const hashedPassword = await bcrypt.hash('Veneravel2025@', 12);

      await prisma.user.update({
        where: { username: 'SabedoriaDeSalomão' },
        data: {
          username: 'Veneravel',
          password: hashedPassword,
          role: 'VENERAVEL'
        }
      });
      console.log('✅ Usuario "SabedoriaDeSalomão" → "Veneravel" (VENERAVEL)');
      console.log('   Senha: Veneravel2025@');
    } else {
      const veneravel = await prisma.user.findUnique({
        where: { username: 'Veneravel' }
      });

      if (veneravel) {
        console.log('✅ Usuario "Veneravel" já existe');
      } else {
        // Criar Veneravel se não existir
        const hashedPassword = await bcrypt.hash('Veneravel2025@', 12);
        await prisma.user.create({
          data: {
            username: 'Veneravel',
            password: hashedPassword,
            role: 'VENERAVEL'
          }
        });
        console.log('✅ Usuario "Veneravel" criado (VENERAVEL)');
        console.log('   Senha: Veneravel2025@');
      }
    }

    // 3. Criar AdminSabedoria (ADMIN)
    const adminSabedoria = await prisma.user.findUnique({
      where: { username: 'AdminSabedoria' }
    });

    if (!adminSabedoria) {
      const hashedPassword = await bcrypt.hash('Sabedoria2025@', 12);
      await prisma.user.create({
        data: {
          username: 'AdminSabedoria',
          password: hashedPassword,
          role: 'ADMIN'
        }
      });
      console.log('✅ Usuario "AdminSabedoria" criado (ADMIN)');
      console.log('   Senha: Sabedoria2025@');
      console.log('   Função: Gerenciar usuários do sistema');
    } else {
      console.log('✅ Usuario "AdminSabedoria" já existe');
    }

    console.log('\n📋 Usuários atuais:');
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

    console.log('\n✅ Atualização concluída!');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
