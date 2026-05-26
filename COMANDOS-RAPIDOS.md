# ⚡ Comandos Rápidos - Limpeza Git

Execute na ordem:

## 1️⃣ Abrir dashboards para trocar credenciais

```bash
# Neon
xdg-open https://console.neon.tech

# Cloudinary
xdg-open https://console.cloudinary.com/settings/security
```

## 2️⃣ Gerar nova JWT_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3️⃣ Instalar git-filter-repo

```bash
chmod +x install-git-filter-repo.sh && ./install-git-filter-repo.sh
```

## 4️⃣ Limpar histórico Git

```bash
chmod +x clean-git-history.sh && ./clean-git-history.sh
```

## 5️⃣ Verificar

```bash
git log --all -p | grep -i "npg_\|cloudinary" | head -5
```

## 6️⃣ Force Push

```bash
git push origin --force --all && git push origin --force --tags
```

---

## 🔄 Se precisar desfazer

```bash
cd .. && rm -rf recibosabedoria && mv recibosabedoria-backup recibosabedoria && cd recibosabedoria
```
