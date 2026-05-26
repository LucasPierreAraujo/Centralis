// scripts/testPermissions.js
// Script para testar o sistema de permissões

const { hasPermission } = require('../src/lib/authMiddleware');

console.log('🧪 Testando Sistema de Permissões\n');

// Testes para ADMIN
console.log('👑 ADMIN:');
console.log('  membros:', hasPermission('ADMIN', 'membros') ? '✅' : '❌');
console.log('  atas:', hasPermission('ADMIN', 'atas') ? '✅' : '❌');
console.log('  presencas:', hasPermission('ADMIN', 'presencas') ? '✅' : '❌');
console.log('  financeiro:', hasPermission('ADMIN', 'financeiro') ? '✅' : '❌');
console.log('  mensalidades:', hasPermission('ADMIN', 'mensalidades') ? '✅' : '❌');
console.log('  recibo:', hasPermission('ADMIN', 'recibo') ? '✅' : '❌');

// Testes para TESOUREIRO
console.log('\n💰 TESOUREIRO:');
console.log('  membros (write):', hasPermission('TESOUREIRO', 'membros') ? '✅' : '❌ (esperado)');
console.log('  membros (read):', hasPermission('TESOUREIRO', 'membros:read') ? '✅ (via membros:read)' : '❌');
console.log('  atas:', hasPermission('TESOUREIRO', 'atas') ? '✅' : '❌ (esperado)');
console.log('  presencas:', hasPermission('TESOUREIRO', 'presencas') ? '✅' : '❌ (esperado)');
console.log('  financeiro:', hasPermission('TESOUREIRO', 'financeiro') ? '✅' : '❌');
console.log('  mensalidades:', hasPermission('TESOUREIRO', 'mensalidades') ? '✅' : '❌');
console.log('  recibo:', hasPermission('TESOUREIRO', 'recibo') ? '✅' : '❌');

// Testes para SECRETARIO
console.log('\n📝 SECRETARIO:');
console.log('  membros:', hasPermission('SECRETARIO', 'membros') ? '✅' : '❌');
console.log('  atas:', hasPermission('SECRETARIO', 'atas') ? '✅' : '❌');
console.log('  presencas:', hasPermission('SECRETARIO', 'presencas') ? '✅' : '❌');
console.log('  financeiro:', hasPermission('SECRETARIO', 'financeiro') ? '✅' : '❌ (esperado)');
console.log('  mensalidades:', hasPermission('SECRETARIO', 'mensalidades') ? '✅' : '❌ (esperado)');
console.log('  recibo:', hasPermission('SECRETARIO', 'recibo') ? '✅' : '❌ (esperado)');

console.log('\n✅ Testes de permissões concluídos!\n');
