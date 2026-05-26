# 🚀 Executar Limpeza do Git - AGORA

## ✅ Status Atual

- [x] Commit de segurança feito
- [x] Scripts prontos e executáveis
- [ ] Instalar git-filter-repo
- [ ] Executar limpeza do histórico
- [ ] Force push

---

## 📋 Passos para Executar (3 comandos)

### 1️⃣ Instalar git-filter-repo

```bash
./install-git-filter-repo.sh
```

Vai pedir sua senha de sudo.

---

### 2️⃣ Executar limpeza do histórico

```bash
./clean-git-history.sh
```

O script vai:
- ✅ Criar backup automático em `../recibosabedoria-backup`
- ✅ Perguntar se você já trocou as credenciais (pode responder **"s"** já que você assumiu o risco)
- ✅ Permitir editar o arquivo de strings a remover (opcional)
- ✅ Limpar o histórico
- ✅ Verificar se ainda há credenciais

---

### 3️⃣ Force push (depois de verificar)

```bash
# Verificar se o histórico está limpo
git log --all -p | grep -i "Sabedoria2025\|***REMOVED***" | head -5

# Se não mostrar nada, está limpo! Pode fazer o push:
git push origin seguranca --force
```

---

## 🆘 Se Algo Der Errado

Restaurar do backup:

```bash
cd ..
rm -rf recibosabedoria
mv recibosabedoria-backup recibosabedoria
cd recibosabedoria
```

---

## 📊 Resumo do que será removido do histórico:

- ❌ `***REMOVED***` (senha do usuário master)
- ❌ `***REMOVED***` (username)
- ❌ `***REMOVED***` (JWT fallback)
- ❌ `***REMOVED***` (senha do Neon)
- ❌ `ep-purple-sky-addacw16-pooler...` (host do Neon)

---

## ✅ Após a Limpeza

Você terá:
- ✅ Histórico limpo
- ✅ Código com validações de segurança
- ✅ Backup seguro em caso de problema
- ✅ Repositório pronto para continuar

**Está tudo pronto! É só executar os 3 comandos acima.** 🎯
