#!/bin/bash
# Script para limpar credenciais do histórico do Git

set -e  # Para em caso de erro

echo "🚨 ATENÇÃO: Este script vai reescrever o histórico do Git!"
echo "⚠️  Certifique-se de que já trocou TODAS as credenciais:"
echo "   1. ✓ Nova senha do PostgreSQL (Neon)"
echo "   2. ✓ Novo API Secret do Cloudinary"
echo "   3. ✓ Nova JWT_SECRET"
echo "   4. ✓ Nova senha do usuário master"
echo ""
read -p "Você já trocou TODAS as credenciais? (s/n): " confirmacao

if [ "$confirmacao" != "s" ]; then
    echo "❌ Canceling. Troque as credenciais primeiro!"
    exit 1
fi

echo ""
echo "📋 Criando backup do repositório..."
cd ..
if [ -d "recibosabedoria-backup" ]; then
    echo "⚠️  Backup já existe. Removendo backup antigo..."
    rm -rf recibosabedoria-backup
fi
cp -r recibosabedoria recibosabedoria-backup
echo "✅ Backup criado em: ../recibosabedoria-backup"

cd recibosabedoria

echo ""
echo "📝 Criando arquivo com credenciais a serem removidas..."

# Criar arquivo com as strings sensíveis para remover
cat > /tmp/sensitive-data.txt << 'EOF'
***REMOVED***
***REMOVED***
***REMOVED***

***REMOVED***
***REMOVED***

***REMOVED***
***REMOVED***
***REMOVED***
***REMOVED***

***REMOVED***
***REMOVED***
EOF

echo "⚠️  IMPORTANTE: Edite o arquivo /tmp/sensitive-data.txt"
echo "    e adicione quaisquer outras credenciais do Cloudinary que estejam no histórico"
echo ""
read -p "Deseja editar o arquivo agora? (s/n): " editar

if [ "$editar" = "s" ]; then
    ${EDITOR:-nano} /tmp/sensitive-data.txt
fi

echo ""
echo "🧹 Iniciando limpeza do histórico Git..."
echo "   Isso pode demorar alguns minutos..."

# Usar git-filter-repo para substituir as strings sensíveis
git-filter-repo --replace-text /tmp/sensitive-data.txt --force

echo ""
echo "✅ Histórico limpo com sucesso!"
echo ""
echo "📊 Verificando resultado..."
git log --oneline | head -10

echo ""
echo "🔍 Verificando se ainda há credenciais..."
if git log --all -p | grep -q "npg_"; then
    echo "⚠️  AVISO: Ainda encontrei possíveis credenciais no histórico!"
    echo "    Revise manualmente com: git log --all -p | grep -i 'password\\|secret\\|npg_'"
else
    echo "✅ Nenhuma credencial óbvia encontrada no histórico!"
fi

echo ""
echo "📤 Próximos passos:"
echo "   1. Revise o histórico: git log --oneline"
echo "   2. Teste localmente se tudo funciona"
echo "   3. Force push: git push origin --force --all"
echo "   4. Force push tags: git push origin --force --tags"
echo ""
echo "⚠️  ATENÇÃO: O force push vai sobrescrever o histórico remoto!"
echo "    Se outras pessoas trabalham no projeto, coordene com elas primeiro."
