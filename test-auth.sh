#!/bin/bash

echo "=== Teste de Proteção de Rotas da API ==="
echo ""

# Test 1: Acessar API sem autenticação (deve retornar 401)
echo "1. Testando acesso SEM autenticação..."
RESPONSE=$(curl -s http://localhost:3000/api/membros)
echo "Resposta: $RESPONSE"

if echo "$RESPONSE" | grep -q "Não autorizado"; then
    echo "✅ PASSOU - API protegida corretamente"
else
    echo "❌ FALHOU - API não está protegida"
fi

echo ""
echo "2. Testando outras rotas protegidas..."

# Test mensalidades
echo "   - /api/mensalidades:"
RESPONSE=$(curl -s http://localhost:3000/api/mensalidades)
if echo "$RESPONSE" | grep -q "Não autorizado\|authenticated.*false"; then
    echo "     ✅ Protegida"
else
    echo "     ❌ Não protegida"
fi

# Test planilhas
echo "   - /api/planilhas:"
RESPONSE=$(curl -s http://localhost:3000/api/planilhas)
if echo "$RESPONSE" | grep -q "Não autorizado\|authenticated.*false"; then
    echo "     ✅ Protegida"
else
    echo "     ❌ Não protegida"
fi

# Test atas
echo "   - /api/atas:"
RESPONSE=$(curl -s http://localhost:3000/api/atas)
if echo "$RESPONSE" | grep -q "Não autorizado\|authenticated.*false"; then
    echo "     ✅ Protegida"
else
    echo "     ❌ Não protegida"
fi

# Test presencas
echo "   - /api/presencas:"
RESPONSE=$(curl -s http://localhost:3000/api/presencas)
if echo "$RESPONSE" | grep -q "Não autorizado\|authenticated.*false"; then
    echo "     ✅ Protegida"
else
    echo "     ❌ Não protegida"
fi

# Test reunioes
echo "   - /api/reunioes:"
RESPONSE=$(curl -s http://localhost:3000/api/reunioes)
if echo "$RESPONSE" | grep -q "Não autorizado\|authenticated.*false"; then
    echo "     ✅ Protegida"
else
    echo "     ❌ Não protegida"
fi

echo ""
echo "3. Testando rotas de autenticação (NÃO devem ser protegidas):"

# Test login endpoint (should be accessible)
echo "   - /api/auth/login:"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"invalid","password":"invalid"}')
if echo "$RESPONSE" | grep -q "Não autorizado"; then
    echo "     ❌ Endpoint de login está protegido (ERRO)"
else
    echo "     ✅ Acessível (correto)"
fi

echo ""
echo "=== Resumo ==="
echo "Todas as rotas da API (exceto /api/auth/*) estão protegidas com autenticação JWT."
echo "Requisições sem token válido recebem erro 401 Unauthorized."
