// scripts/test-all.js
// Script de testes automatizados completos
// Uso: node scripts/test-all.js

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASSOU' : '❌ FALHOU';
  const color = passed ? 'green' : 'red';
  log(`  ${status}: ${name}${details ? ` - ${details}` : ''}`, color);
  return passed;
}

// Armazena cookies de autenticação
let authCookies = {};

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

async function makeRequest(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Adicionar cookies se existirem
  if (authCookies[options.user]) {
    headers['Cookie'] = authCookies[options.user];
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    });

    // Capturar cookies de resposta
    const setCookie = response.headers.get('set-cookie');
    if (setCookie && options.saveCookiesAs) {
      authCookies[options.saveCookiesAs] = setCookie;
    }

    const data = await response.json().catch(() => null);

    return {
      status: response.status,
      ok: response.ok,
      data,
      headers: response.headers
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      data: null,
      error: error.message
    };
  }
}

// ========================================
// TESTES DE AUTENTICAÇÃO
// ========================================

async function testAuth() {
  log('\n🔐 TESTES DE AUTENTICAÇÃO', 'cyan');
  let passed = 0;
  let total = 0;

  // Teste 1: Login com credenciais inválidas
  total++;
  const invalidLogin = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'invalid', password: 'wrongpassword' })
  });
  passed += logTest('Login com credenciais inválidas retorna 401', invalidLogin.status === 401);

  // Teste 2: Login com credenciais válidas (admin)
  total++;
  const adminLogin = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    saveCookiesAs: 'admin'
  });
  passed += logTest('Login admin com credenciais corretas',
    adminLogin.ok && adminLogin.data?.success === true,
    adminLogin.data?.message || adminLogin.data?.error
  );

  // Teste 3: Login Venerável
  total++;
  const veneravelLogin = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'Veneravel', password: 'veneravel123' }),
    saveCookiesAs: 'veneravel'
  });
  passed += logTest('Login Veneravel',
    veneravelLogin.ok && veneravelLogin.data?.success === true,
    veneravelLogin.data?.message || veneravelLogin.data?.error
  );

  // Teste 4: Login Secretário
  total++;
  const secretarioLogin = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'Secretario', password: 'secretario123' }),
    saveCookiesAs: 'secretario'
  });
  passed += logTest('Login Secretario',
    secretarioLogin.ok && secretarioLogin.data?.success === true,
    secretarioLogin.data?.message || secretarioLogin.data?.error
  );

  // Teste 5: Login Tesoureiro
  total++;
  const tesoureiroLogin = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'Tesoureiro', password: 'tesoureiro123' }),
    saveCookiesAs: 'tesoureiro'
  });
  passed += logTest('Login Tesoureiro',
    tesoureiroLogin.ok && tesoureiroLogin.data?.success === true,
    tesoureiroLogin.data?.message || tesoureiroLogin.data?.error
  );

  // Teste 6: Rota /me sem autenticação
  total++;
  const meUnauth = await makeRequest('/api/auth/me');
  passed += logTest('Rota /me sem auth retorna 401', meUnauth.status === 401);

  // Teste 7: Rota /me com autenticação
  total++;
  const meAuth = await makeRequest('/api/auth/me', { user: 'admin' });
  passed += logTest('Rota /me com auth retorna dados do usuário',
    meAuth.ok && meAuth.data?.username,
    meAuth.data?.username
  );

  return { passed, total };
}

// ========================================
// TESTES DE RATE LIMITING
// ========================================

async function testRateLimiting() {
  log('\n⏱️  TESTES DE RATE LIMITING', 'cyan');
  let passed = 0;
  let total = 0;

  // Fazer 6 tentativas de login inválidas (limite é 5)
  log('  Fazendo 6 tentativas de login inválidas...', 'yellow');

  let lastResponse;
  for (let i = 1; i <= 6; i++) {
    lastResponse = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'ratelimit_test', password: 'wrong' }),
      headers: {
        'x-forwarded-for': '192.168.99.99' // IP fictício para não afetar outros testes
      }
    });

    if (i <= 5) {
      log(`    Tentativa ${i}: status ${lastResponse.status}`, 'yellow');
    }
  }

  total++;
  passed += logTest('Rate limiting bloqueia após 5 tentativas',
    lastResponse.status === 429,
    `Status: ${lastResponse.status}`
  );

  return { passed, total };
}

// ========================================
// TESTES DE MEMBROS (CRUD)
// ========================================

async function testMembros() {
  log('\n👥 TESTES DE MEMBROS (CRUD)', 'cyan');
  let passed = 0;
  let total = 0;
  let membroTestId = null;

  // Teste 1: Listar membros sem autenticação
  total++;
  const listUnauth = await makeRequest('/api/membros');
  passed += logTest('Listar membros sem auth retorna 401', listUnauth.status === 401);

  // Teste 2: Listar membros com autenticação
  total++;
  const listAuth = await makeRequest('/api/membros', { user: 'admin' });
  passed += logTest('Listar membros com auth',
    listAuth.ok && Array.isArray(listAuth.data),
    `${listAuth.data?.length || 0} membros encontrados`
  );

  // Teste 3: Criar membro (admin tem permissão)
  total++;
  const novoMembro = {
    nome: 'TESTE AUTOMATIZADO ' + Date.now(),
    grau: 'APRENDIZ',
    status: 'ATIVO',
    cim: 'TEST' + Date.now()
  };

  const createMembro = await makeRequest('/api/membros', {
    method: 'POST',
    body: JSON.stringify(novoMembro),
    user: 'admin'
  });

  if (createMembro.ok && createMembro.data?.membro?.id) {
    membroTestId = createMembro.data.membro.id;
  }

  passed += logTest('Criar membro (admin)',
    createMembro.ok && createMembro.data?.success === true,
    createMembro.data?.error || `ID: ${membroTestId}`
  );

  // Teste 4: Criar membro sem campos obrigatórios
  total++;
  const createIncomplete = await makeRequest('/api/membros', {
    method: 'POST',
    body: JSON.stringify({ nome: 'Sem grau' }),
    user: 'admin'
  });
  passed += logTest('Criar membro sem campos obrigatórios retorna 400',
    createIncomplete.status === 400,
    createIncomplete.data?.error
  );

  // Teste 5: Secretário pode criar membro
  total++;
  const createSecretario = await makeRequest('/api/membros', {
    method: 'POST',
    body: JSON.stringify({
      nome: 'MEMBRO VIA SECRETARIO ' + Date.now(),
      grau: 'COMPANHEIRO',
      status: 'ATIVO'
    }),
    user: 'secretario'
  });
  passed += logTest('Secretário pode criar membro',
    createSecretario.ok,
    createSecretario.data?.error || 'Criado com sucesso'
  );

  // Limpeza: excluir membro criado pelo secretário se criou
  if (createSecretario.ok && createSecretario.data?.membro?.id) {
    await makeRequest('/api/membros', {
      method: 'DELETE',
      body: JSON.stringify({ id: createSecretario.data.membro.id }),
      user: 'admin'
    });
  }

  // Teste 6: Atualizar membro
  if (membroTestId) {
    total++;
    const updateMembro = await makeRequest('/api/membros', {
      method: 'PUT',
      body: JSON.stringify({
        id: membroTestId,
        nome: 'TESTE ATUALIZADO ' + Date.now(),
        grau: 'COMPANHEIRO',
        status: 'ATIVO'
      }),
      user: 'admin'
    });
    passed += logTest('Atualizar membro',
      updateMembro.ok && updateMembro.data?.success === true,
      updateMembro.data?.error || 'Atualizado'
    );
  }

  // Teste 7: Excluir membro
  if (membroTestId) {
    total++;
    const deleteMembro = await makeRequest('/api/membros', {
      method: 'DELETE',
      body: JSON.stringify({ id: membroTestId }),
      user: 'admin'
    });
    passed += logTest('Excluir membro',
      deleteMembro.ok && deleteMembro.data?.success === true,
      deleteMembro.data?.error || 'Excluído'
    );
  }

  return { passed, total };
}

// ========================================
// TESTES DE PERMISSÕES
// ========================================

async function testPermissions() {
  log('\n🔒 TESTES DE PERMISSÕES', 'cyan');
  let passed = 0;
  let total = 0;

  // Teste 1: Tesoureiro NÃO pode criar membros
  total++;
  const tesoureiroMembros = await makeRequest('/api/membros', {
    method: 'POST',
    body: JSON.stringify({
      nome: 'TESTE TESOUREIRO',
      grau: 'APRENDIZ',
      status: 'ATIVO'
    }),
    user: 'tesoureiro'
  });
  passed += logTest('Tesoureiro NÃO pode criar membros',
    tesoureiroMembros.status === 403,
    `Status: ${tesoureiroMembros.status}`
  );

  // Teste 2: Tesoureiro pode acessar financeiro
  total++;
  const tesoureiroFinanceiro = await makeRequest('/api/planilhas', { user: 'tesoureiro' });
  passed += logTest('Tesoureiro pode acessar financeiro',
    tesoureiroFinanceiro.ok,
    `Status: ${tesoureiroFinanceiro.status}`
  );

  // Teste 3: Secretário NÃO pode acessar financeiro
  total++;
  const secretarioFinanceiro = await makeRequest('/api/planilhas', { user: 'secretario' });
  passed += logTest('Secretário NÃO pode acessar financeiro',
    secretarioFinanceiro.status === 403,
    `Status: ${secretarioFinanceiro.status}`
  );

  // Teste 4: Secretário pode acessar atas
  total++;
  const secretarioAtas = await makeRequest('/api/atas', { user: 'secretario' });
  passed += logTest('Secretário pode acessar atas',
    secretarioAtas.ok,
    `Status: ${secretarioAtas.status}`
  );

  // Teste 5: Admin pode acessar tudo
  total++;
  const adminMembros = await makeRequest('/api/membros', { user: 'admin' });
  const adminPlanilhas = await makeRequest('/api/planilhas', { user: 'admin' });
  const adminAtas = await makeRequest('/api/atas', { user: 'admin' });

  passed += logTest('Admin pode acessar tudo',
    adminMembros.ok && adminPlanilhas.ok && adminAtas.ok,
    `Membros: ${adminMembros.status}, Planilhas: ${adminPlanilhas.status}, Atas: ${adminAtas.status}`
  );

  // Teste 6: Venerável pode acessar tudo
  total++;
  const veneravelMembros = await makeRequest('/api/membros', { user: 'veneravel' });
  const veneravelPlanilhas = await makeRequest('/api/planilhas', { user: 'veneravel' });
  const veneravelAtas = await makeRequest('/api/atas', { user: 'veneravel' });

  passed += logTest('Venerável pode acessar tudo',
    veneravelMembros.ok && veneravelPlanilhas.ok && veneravelAtas.ok,
    `Membros: ${veneravelMembros.status}, Planilhas: ${veneravelPlanilhas.status}, Atas: ${veneravelAtas.status}`
  );

  return { passed, total };
}

// ========================================
// TESTES DE ATAS
// ========================================

async function testAtas() {
  log('\n📄 TESTES DE ATAS', 'cyan');
  let passed = 0;
  let total = 0;

  // Teste 1: Listar atas
  total++;
  const listAtas = await makeRequest('/api/atas', { user: 'admin' });
  passed += logTest('Listar atas',
    listAtas.ok && Array.isArray(listAtas.data),
    `${listAtas.data?.length || 0} atas encontradas`
  );

  // Teste 2: Buscar ata específica (se existir)
  if (listAtas.data?.length > 0) {
    total++;
    const ataId = listAtas.data[0].id;
    const getAta = await makeRequest(`/api/atas/${ataId}`, { user: 'admin' });
    passed += logTest('Buscar ata específica',
      getAta.ok,
      `Número: ${getAta.data?.numero || 'N/A'}`
    );
  }

  return { passed, total };
}

// ========================================
// TESTES DE PLANILHAS FINANCEIRAS
// ========================================

async function testPlanilhas() {
  log('\n💰 TESTES DE PLANILHAS FINANCEIRAS', 'cyan');
  let passed = 0;
  let total = 0;

  // Teste 1: Listar planilhas
  total++;
  const listPlanilhas = await makeRequest('/api/planilhas', { user: 'admin' });
  passed += logTest('Listar planilhas financeiras',
    listPlanilhas.ok && Array.isArray(listPlanilhas.data),
    `${listPlanilhas.data?.length || 0} planilhas encontradas`
  );

  // Teste 2: Criar planilha duplicada (deve falhar)
  if (listPlanilhas.data?.length > 0) {
    total++;
    const planilhaExistente = listPlanilhas.data[0];
    const createDuplicada = await makeRequest('/api/planilhas', {
      method: 'POST',
      body: JSON.stringify({
        mes: planilhaExistente.mes,
        ano: planilhaExistente.ano,
        valorMensalidade: 100,
        saldoInicialCaixa: 0,
        saldoInicialTronco: 0
      }),
      user: 'admin'
    });
    passed += logTest('Criar planilha duplicada retorna erro',
      createDuplicada.status === 400,
      createDuplicada.data?.error
    );
  }

  return { passed, total };
}

// ========================================
// TESTES DE VALIDAÇÕES
// ========================================

async function testValidations() {
  log('\n✅ TESTES DE VALIDAÇÕES', 'cyan');
  let passed = 0;
  let total = 0;

  // Teste 1: Criar usuário com senha curta
  total++;
  const shortPassword = await makeRequest('/api/usuarios', {
    method: 'POST',
    body: JSON.stringify({
      username: 'teste_senha_curta',
      password: '123',
      permissions: ['membros']
    }),
    user: 'admin'
  });
  passed += logTest('Senha curta (< 8 chars) retorna erro',
    shortPassword.status === 400,
    shortPassword.data?.error
  );

  // Teste 2: Criar usuário sem permissões
  total++;
  const noPermissions = await makeRequest('/api/usuarios', {
    method: 'POST',
    body: JSON.stringify({
      username: 'teste_sem_perms',
      password: 'senhasegura123',
      permissions: []
    }),
    user: 'admin'
  });
  passed += logTest('Usuário sem permissões retorna erro',
    noPermissions.status === 400,
    noPermissions.data?.error
  );

  // Teste 3: Permissões inválidas
  total++;
  const invalidPerms = await makeRequest('/api/usuarios', {
    method: 'POST',
    body: JSON.stringify({
      username: 'teste_perms_invalidas',
      password: 'senhasegura123',
      permissions: ['permissao_falsa']
    }),
    user: 'admin'
  });
  passed += logTest('Permissões inválidas retornam erro',
    invalidPerms.status === 400,
    invalidPerms.data?.error
  );

  return { passed, total };
}

// ========================================
// TESTES DE UPLOAD
// ========================================

async function testUpload() {
  log('\n📤 TESTES DE UPLOAD', 'cyan');
  let passed = 0;
  let total = 0;

  // Teste 1: Upload sem autenticação
  total++;
  const uploadUnauth = await makeRequest('/api/upload', {
    method: 'POST',
    body: JSON.stringify({ file: 'data:image/png;base64,fake' })
  });
  passed += logTest('Upload sem auth retorna 401', uploadUnauth.status === 401);

  // Teste 2: Upload de arquivo inválido
  total++;
  const uploadInvalid = await makeRequest('/api/upload', {
    method: 'POST',
    body: JSON.stringify({ file: 'arquivo_invalido_sem_data_uri' }),
    user: 'admin'
  });
  passed += logTest('Upload de arquivo inválido retorna 400',
    uploadInvalid.status === 400,
    uploadInvalid.data?.error
  );

  // Teste 3: Upload de arquivo muito grande (simulated)
  total++;
  // Criar string base64 > 6.85MB
  const bigFile = 'data:image/png;base64,' + 'A'.repeat(7 * 1024 * 1024);
  const uploadBig = await makeRequest('/api/upload', {
    method: 'POST',
    body: JSON.stringify({ file: bigFile }),
    user: 'admin'
  });
  passed += logTest('Upload de arquivo grande retorna 400',
    uploadBig.status === 400,
    uploadBig.data?.error
  );

  return { passed, total };
}

// ========================================
// RELATÓRIO FINAL
// ========================================

async function runAllTests() {
  log('═══════════════════════════════════════════════════════════', 'blue');
  log('         TESTES AUTOMATIZADOS - RECIBO SABEDORIA', 'blue');
  log('═══════════════════════════════════════════════════════════', 'blue');
  log(`\n🌐 URL Base: ${BASE_URL}`, 'yellow');
  log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`, 'yellow');

  const results = [];

  // Executar todos os testes
  results.push({ name: 'Autenticação', ...await testAuth() });
  results.push({ name: 'Rate Limiting', ...await testRateLimiting() });
  results.push({ name: 'Membros (CRUD)', ...await testMembros() });
  results.push({ name: 'Permissões', ...await testPermissions() });
  results.push({ name: 'Atas', ...await testAtas() });
  results.push({ name: 'Planilhas', ...await testPlanilhas() });
  results.push({ name: 'Validações', ...await testValidations() });
  results.push({ name: 'Upload', ...await testUpload() });

  // Relatório final
  log('\n═══════════════════════════════════════════════════════════', 'blue');
  log('                    RELATÓRIO FINAL', 'blue');
  log('═══════════════════════════════════════════════════════════', 'blue');

  let totalPassed = 0;
  let totalTests = 0;

  for (const result of results) {
    totalPassed += result.passed;
    totalTests += result.total;
    const pct = Math.round((result.passed / result.total) * 100);
    const color = pct === 100 ? 'green' : pct >= 70 ? 'yellow' : 'red';
    log(`  ${result.name}: ${result.passed}/${result.total} (${pct}%)`, color);
  }

  log('\n───────────────────────────────────────────────────────────', 'blue');
  const totalPct = Math.round((totalPassed / totalTests) * 100);
  const finalColor = totalPct === 100 ? 'green' : totalPct >= 80 ? 'yellow' : 'red';
  log(`  TOTAL: ${totalPassed}/${totalTests} testes passaram (${totalPct}%)`, finalColor);
  log('═══════════════════════════════════════════════════════════\n', 'blue');

  // Exit code baseado nos resultados
  process.exit(totalPassed === totalTests ? 0 : 1);
}

// Executar
runAllTests().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
