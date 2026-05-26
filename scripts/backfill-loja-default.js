/**
 * Script de backfill para associar dados existentes à loja padrão.
 * Cria a loja "A.R.L.S. Sabedoria de Salomão Nº 4774" e vincula todos os
 * registros existentes a ela.
 *
 * Executar UMA ÚNICA VEZ: node scripts/backfill-loja-default.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando backfill da loja padrão...\n');

  // 1. Criar (ou encontrar) a loja padrão
  let lojaDefault = await prisma.loja.findFirst({
    where: { status: 'ATIVA' }
  });

  if (!lojaDefault) {
    lojaDefault = await prisma.loja.create({
      data: {
        nome: 'A.R.L.S. Sabedoria de Salomão Nº 4774',
        emailVeneravel: 'pedrolucaspierre@gmail.com',
        status: 'ATIVA',
      }
    });
    console.log('✅ Loja padrão criada:', lojaDefault.id);
  } else {
    console.log('ℹ️  Loja padrão já existe:', lojaDefault.id);
  }

  const lojaId = lojaDefault.id;

  // 2. Backfill de cada tabela
  const [
    users, membros, atas, reunioes, planilhas, candidatos,
    promocoes, configsGerais, configsEtapas, configsMensalidades, controles
  ] = await Promise.all([
    prisma.user.updateMany({ where: { lojaId: null }, data: { lojaId } }),
    prisma.membro.updateMany({ where: { lojaId: null }, data: { lojaId } }),
    prisma.ata.updateMany({ where: { lojaId: null }, data: { lojaId } }),
    prisma.reuniao.updateMany({ where: { lojaId: null }, data: { lojaId } }),
    prisma.planilhaFinanceira.updateMany({ where: { lojaId: null }, data: { lojaId } }),
    prisma.candidato.updateMany({ where: { lojaId: null }, data: { lojaId } }),
    prisma.promocaoElevacao.updateMany({ where: { lojaId: null }, data: { lojaId } }),
    prisma.configuracaoGeral.updateMany({ where: { lojaId: null }, data: { lojaId } }),
    prisma.configuracaoEtapas.updateMany({ where: { lojaId: null }, data: { lojaId } }),
    prisma.configuracaoMensalidade.updateMany({ where: { lojaId: null }, data: { lojaId } }),
    prisma.controleMensalidade.updateMany({ where: { lojaId: null }, data: { lojaId } }),
  ]);

  console.log('\n📊 Registros atualizados:');
  console.log(`  users:                   ${users.count}`);
  console.log(`  membros:                 ${membros.count}`);
  console.log(`  atas:                    ${atas.count}`);
  console.log(`  reunioes:                ${reunioes.count}`);
  console.log(`  planilhas:               ${planilhas.count}`);
  console.log(`  candidatos:              ${candidatos.count}`);
  console.log(`  promocoes:               ${promocoes.count}`);
  console.log(`  configs gerais:          ${configsGerais.count}`);
  console.log(`  configs etapas:          ${configsEtapas.count}`);
  console.log(`  configs mensalidades:    ${configsMensalidades.count}`);
  console.log(`  controles mensalidades:  ${controles.count}`);

  console.log('\n✅ Backfill concluído com sucesso!');
  console.log(`\n🔑 ID da loja padrão: ${lojaId}`);
  console.log('   Salve esse ID no .env como DEFAULT_LOJA_ID (opcional, para referência)\n');
}

main()
  .catch(e => { console.error('❌ Erro:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
