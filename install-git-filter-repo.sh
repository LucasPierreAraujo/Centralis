#!/bin/bash
# Script para instalar git-filter-repo

echo "📦 Instalando git-filter-repo..."

cd /tmp
wget -q https://raw.githubusercontent.com/newren/git-filter-repo/main/git-filter-repo

if [ $? -eq 0 ]; then
    chmod +x git-filter-repo
    sudo mv git-filter-repo /usr/local/bin/
    echo "✅ git-filter-repo instalado com sucesso!"
    which git-filter-repo
else
    echo "❌ Erro ao baixar git-filter-repo"
    exit 1
fi
