# Área de Membros (versão para GitHub Pages)

Este projeto é uma **versão 100% front-end** de uma área de membros, pensada para rodar no **GitHub Pages** (ou qualquer hospedagem estática).
Toda a lógica (usuários, cursos, módulos, progresso, logs) é simulada e persistida no **localStorage** do navegador.

## O que funciona
- Cadastro (nome, e-mail, senha)
- Login (e redirecionamento por role: admin / student)
- Painel Admin: CRUD completo de usuários, cursos e módulos; mudar role; bloquear/desbloquear; logs de auditoria
- Painel Student: ver cursos e módulos; marcar progresso (concluído)
- Seed inicial: usuário admin criado automaticamente: **admin@local / admin123**

## Limitações importantes
- Não há backend real — tudo roda no browser. Isto é intencional para permitir hospedagem no GitHub Pages.
- Senhas são armazenadas em texto (apenas para demo). **Não use isto para dados reais.**
- Para um sistema real (produção) você deve ter backend (Node/Express + PostgreSQL ou equivalente) e não usar localStorage para autenticação.
- Todos os textos estão em português e o tema usa preto + vermelho.

## Como publicar no GitHub Pages
1. Crie um repositório no GitHub.
2. Faça commit de todos os arquivos para o branch `main` (ou `gh-pages`).
3. Vá em *Settings → Pages* e selecione a branch que contém os arquivos (root).
4. Aguarde e abra `https://<seu-usuario>.github.io/<seu-repo>/public_login.html` (ou apenas `index.html` vai redirecionar).

## Como testar localmente
Basta abrir `public_login.html` no navegador (ou servir com um servidor estático simples).

## Notas de segurança
Este é um ambiente de demonstração. Se quiser, eu posso:
- transformar isso em front + backend real (deploy em Render/Railway) e deixar o front hospedado no GitHub Pages;
- ou ajustar o front para não armazenar senhas em texto e usar tokens simulados com expiração.

Se quiser que eu gere diretamente o ZIP pronto para enviar ao GitHub, me avisa — já posso criar o arquivo e te fornecer o link para download.
