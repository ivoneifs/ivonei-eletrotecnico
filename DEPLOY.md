# 🚀 GUIA DE DEPLOY — CRM Secretária no Coolify

## ✅ O que já está pronto

O projeto CRM está completo em:
```
C:\Users\User\.gemini\antigravity\scratch\crm-secretaria\
```

Estrutura:
```
crm-secretaria/
├── index.html          ← App principal
├── Dockerfile          ← Para deploy via Docker
├── nginx.conf          ← Config do servidor web
├── css/
│   └── app.css         ← Design system premium
└── js/
    ├── data.js         ← Cliente Supabase + API
    ├── dashboard.js    ← Painel de métricas
    ├── contacts.js     ← Gestão de contatos
    ├── kanban.js       ← Pipeline drag & drop
    ├── calendar.js     ← Agenda mês/semana/dia
    └── app.js          ← Roteamento principal
```

---

## 🔑 Credenciais Supabase (já configuradas no código)

- **URL:** `https://gzrmhqueubxpqvlmfxxb.supabase.co`
- **Chave:** `eyJhbGciOiJIUzI1NiIsInR5cCI6...` (JWT anon)

---

## 🚀 OPÇÃO 1 — Deploy via GitHub → Coolify (Recomendado)

### Passo 1: Criar repositório no GitHub
1. Acesse https://github.com/new
2. Nome: `crm-secretaria`
3. Marque como **Privado** (opcional)
4. Clique em **Create repository**

### Passo 2: Fazer push do código
Abra o PowerShell na pasta `C:\Users\User\.gemini\antigravity\scratch\crm-secretaria` e execute:

```powershell
git init
git add .
git commit -m "feat: CRM Secretária inicial"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/crm-secretaria.git
git push -u origin main
```

### Passo 3: Conectar ao Coolify
1. Acesse **https://painel.appsbrasil.store/**
2. Clique em **New Project** → **New Resource**
3. Escolha **Docker** → **Dockerfile**
4. Em "Git Repository", cole: `https://github.com/SEU_USUARIO/crm-secretaria`
5. Branch: `main`
6. Em **Domain**, coloque: `crm.appsbrasil.store`
7. Clique em **Deploy** 🚀

---

## 🚀 OPÇÃO 2 — Deploy Direto no VPS via SSH

Se tiver acesso SSH ao VPS, execute:

```bash
# 1. Copiar arquivos para o VPS
scp -r C:\Users\User\.gemini\antigravity\scratch\crm-secretaria user@VPS_IP:~/crm-secretaria

# 2. No VPS, buildar e rodar Docker
cd ~/crm-secretaria
docker build -t crm-secretaria .
docker run -d -p 3010:80 --name crm-secretaria --restart always crm-secretaria

# 3. Configurar DNS no Coolify
# Aponte crm.appsbrasil.store → IP do VPS
```

---

## 🌐 URL Final Esperada

Após o deploy:
> **https://crm.appsbrasil.store**

---

## 🗃️ Banco de Dados (já configurado)

O Supabase já tem:
- `crm_contacts` — contatos/clientes  
- `crm_deals` — pipeline Kanban
- `crm_events` — agenda/agendamentos
- RLS liberado para acesso público (anon)
