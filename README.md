# Ultimate Members (Single-root advanced system)

Este repositório contém um sistema avançado de área de membros com TODOS os arquivos **na raiz** (sem pastas), pronto para testes locais.

## Características principais
- Node.js + Express + PostgreSQL
- Autenticação JWT com refresh tokens (rotativo)
- Roles: admin e student
- Painel admin: CRUD de usuários, cursos, módulos; logs de auditoria
- Painel student: listagem de cursos, módulos, marcação de progresso
- Uploads via multer (memória)
- Segurança básica: helmet, CORS e rate-limit
- Dockerfile e docker-compose para ambiente local com Postgres

## Como rodar (local)
1. Copie os arquivos para uma pasta.
2. Crie `.env` a partir de `.env.example` e ajuste `DATABASE_URL`.
3. Instale dependências:
```bash
npm install
```
4. Crie banco e rode migrations:
```bash
psql $DATABASE_URL -f db.sql
psql $DATABASE_URL -f seed.sql
```
5. Inicie o servidor:
```bash
npm start
```
6. Acesse:
- Login: `http://localhost:3000/public_login.html`
- Register: `http://localhost:3000/public_register.html`

## Docker (opcional)
```bash
docker-compose up --build
```

## Observações de segurança
- Em produção troque os segredos JWT e configure HTTPS.
- Prefira cookies httpOnly para tokens em aplicações reais.
- Configure serviços de e-mail, S3 e Stripe caso vá usar essas integrações.

