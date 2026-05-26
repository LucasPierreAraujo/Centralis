# 🧹 Guia: Limpar Credenciais do Histórico Git

## ⚠️ IMPORTANTE: Siga esta ordem EXATAMENTE

### Passo 1: Trocar TODAS as Credenciais Primeiro

Antes de limpar o Git, você PRECISA trocar as credenciais para que as antigas não funcionem mais.

#### 1.1. Neon PostgreSQL

1. Acesse: https://console.neon.tech
2. Selecione seu projeto
3. Vá em **Settings → Reset Password**
4. Clique em **"Reset password"**
5. Copie a nova **Connection String**
6. Cole no arquivo `.env`:
   ```env
   DATABASE_URL="nova_string_aqui"
   ```

#### 1.2. Cloudinary

1. Acesse: https://console.cloudinary.com/settings/security
2. Na seção **"Access Keys"**, clique em **"Regenerate"** ao lado do **API Secret**
3. Confirme a regeneração
4. Copie o novo **API Secret**
5. Atualize no `.env`:
   ```env
   CLOUDINARY_URL="cloudinary://api_key:NOVO_SECRET@cloud_name"
   ```
   Ou as variáveis separadas:
   ```env
   CLOUDINARY_CLOUD_NAME="seu_cloud_name"
   CLOUDINARY_API_KEY="seu_api_key"
   CLOUDINARY_API_SECRET="NOVO_SECRET_AQUI"
   ```

#### 1.3. JWT Secret

```bash
# Gerar nova chave
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copie o resultado e adicione no .env
# JWT_SECRET="resultado_aqui"
```

#### 1.4. Usuário Master

```bash
MASTER_USERNAME="novo_usuario" MASTER_PASSWORD="NovaSenhaForte123!" node scripts/createMasterUser.js
```

---

### Passo 2: Instalar git-filter-repo

```bash
# Tornar o script executável e rodar
chmod +x install-git-filter-repo.sh
./install-git-filter-repo.sh
```

Vai pedir sua senha de sudo.

---

### Passo 3: Executar a Limpeza

```bash
# Tornar o script executável
chmod +x clean-git-history.sh

# Executar
./clean-git-history.sh
```

O script vai:
1. ✅ Criar backup automático em `../recibosabedoria-backup`
2. ✅ Criar arquivo com credenciais para remover
3. ✅ Permitir que você edite e adicione outras credenciais
4. ✅ Limpar o histórico Git
5. ✅ Verificar se ficou algo exposto

---

### Passo 4: Verificar e Testar

```bash
# Ver o histórico limpo
git log --oneline | head -20

# Procurar por possíveis credenciais restantes
git log --all -p | grep -i "password\|secret\|cloudinary\|neon\|npg_" | head -20

# Testar se o app funciona
npm run dev
```

Acesse http://localhost:3000 e teste o login e funcionalidades.

---

### Passo 5: Force Push (CUIDADO!)

⚠️ **ATENÇÃO**: Isso vai sobrescrever o histórico remoto!

```bash
# Push do histórico limpo
git push origin --force --all

# Push das tags
git push origin --force --tags
```

---

## 🆘 Se Algo Der Errado

Se o script falhar ou algo quebrar:

```bash
# Restaurar do backup
cd ..
rm -rf recibosabedoria
mv recibosabedoria-backup recibosabedoria
cd recibosabedoria
```

---

## ✅ Checklist Final

Após a limpeza:

- [ ] Nova senha do PostgreSQL (Neon) funcionando
- [ ] Novo API Secret do Cloudinary funcionando
- [ ] Nova JWT_SECRET funcionando
- [ ] Nova senha do usuário master funcionando
- [ ] Histórico Git limpo (sem credenciais)
- [ ] Force push feito com sucesso
- [ ] App testado e funcionando
- [ ] Backup mantido por segurança

---

## 📞 Troubleshooting

### "git-filter-repo: command not found"

Execute o script de instalação:
```bash
./install-git-filter-repo.sh
```

### "Permission denied"

Torne o script executável:
```bash
chmod +x clean-git-history.sh
```

### Ainda vejo credenciais no histórico

Edite `/tmp/sensitive-data.txt` e adicione as strings que ainda aparecem, depois rode novamente:
```bash
./clean-git-history.sh
```

### Outras pessoas também trabalham neste repo

⚠️ **Coordene com o time ANTES do force push!**

Eles precisarão:
```bash
# Salvar trabalho local
git stash

# Buscar novo histórico
git fetch origin

# Resetar para o novo histórico
git reset --hard origin/main

# Restaurar trabalho
git stash pop
```
