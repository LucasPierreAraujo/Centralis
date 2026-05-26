# Guia de Segurança

## ⚠️ ATENÇÃO: Credenciais Expostas no Git

Este repositório teve credenciais expostas em commits anteriores. Siga os passos abaixo para corrigir:

## 🔒 Ações Necessárias IMEDIATAMENTE

### 1. Alterar Senha do Usuário Master

```bash
# Execute o script com novas credenciais
MASTER_USERNAME="novo_usuario" MASTER_PASSWORD="Nova_Senha_Forte_123!" node scripts/createMasterUser.js
```

### 2. Gerar Nova JWT_SECRET

```bash
# Gere uma chave segura (32+ caracteres)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copie o resultado e adicione ao arquivo `.env`:

```env
JWT_SECRET="resultado_do_comando_acima"
```

### 3. Limpar Histórico Git (CUIDADO!)

Para remover as credenciais do histórico do Git:

```bash
# AVISO: Isso reescreve o histórico! Coordene com a equipe antes.

# Instalar BFG Repo-Cleaner ou usar git-filter-repo
git filter-repo --invert-paths --path scripts/createMasterUser.js --path src/lib/auth.js

# Ou usar BFG
java -jar bfg.jar --delete-files createMasterUser.js --delete-files auth.js .git
```

**ALTERNATIVA MAIS SIMPLES**: Se o repositório for privado e você for o único desenvolvedor, considere:
1. Criar um novo repositório
2. Copiar apenas a versão atual do código (sem histórico)
3. Fazer o primeiro commit com as correções já aplicadas

### 4. Revogar Tokens de Acesso

Se este repositório estava público:
- Altere IMEDIATAMENTE todas as senhas
- Revogue tokens de API
- Monitore acessos não autorizados ao banco de dados

## 📋 Checklist de Segurança

- [ ] Nova senha do usuário master criada
- [ ] Nova JWT_SECRET gerada (32+ caracteres)
- [ ] Arquivo `.env` nunca commitado (verificar `.gitignore`)
- [ ] Histórico Git limpo (opcional mas recomendado)
- [ ] Documentação de segurança revisada
- [ ] Todos os desenvolvedores notificados das mudanças

## 🛡️ Boas Práticas

### Variáveis de Ambiente

1. **NUNCA** commite arquivos `.env`
2. Use `.env.example` como template (sem valores reais)
3. Mantenha `.env` no `.gitignore`
4. Use variáveis de ambiente em produção (Vercel, Heroku, etc.)

### Senhas

1. Mínimo de 8 caracteres
2. Use letras maiúsculas, minúsculas, números e símbolos
3. Não use senhas padrão ou comuns
4. Use gerenciadores de senha (1Password, LastPass, Bitwarden)

### JWT Secrets

1. Mínimo de 32 caracteres
2. Use caracteres aleatórios (hex, base64)
3. Nunca reutilize em diferentes ambientes
4. Rotacione periodicamente (a cada 6 meses)

## 🔍 Monitoramento

- Configure GitGuardian ou similar para alertas
- Revise regularmente commits para exposição acidental
- Use hooks pre-commit para validar (ex: detect-secrets)

## 📞 Em Caso de Vazamento

1. **Aja rapidamente**: Altere todas as credenciais IMEDIATAMENTE
2. **Avalie o impacto**: Verifique logs de acesso
3. **Notifique**: Informe usuários se dados foram comprometidos
4. **Documente**: Registre o incidente e ações tomadas
5. **Aprenda**: Implemente medidas para prevenir recorrência

## 🆘 Contato

Em caso de questões sobre segurança, entre em contato com o administrador do sistema.
