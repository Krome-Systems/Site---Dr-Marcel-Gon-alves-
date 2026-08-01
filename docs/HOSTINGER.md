# Operação na Hostinger

Este documento complementa o README com uma lista objetiva para implantação, verificação e recuperação do site.

## Antes do deploy

1. Use Node.js 22.22 ou 24.x e pnpm 11.9 ou superior.
2. Execute `pnpm install --frozen-lockfile`.
3. Execute `pnpm validate:hostinger`.
4. Execute `pnpm test` e `pnpm build`.
5. Confirme que arquivos `.env*`, `node_modules` e `.next` não estão versionados.

## Configuração da aplicação

No painel da Hostinger, configure:

- Framework: Next.js
- Build: `pnpm build`
- Inicialização: `pnpm start`
- Porta: `3000`
- URL de verificação: `/api/health`

Variáveis esperadas:

- `NEXT_PUBLIC_SITE_URL`: URL HTTPS definitiva.
- `NEXT_PUBLIC_WHATSAPP_NUMBER`: país, DDD e número, somente dígitos.
- `DATABASE_URL`: opcional até que a persistência seja ativada.

## Verificação após o deploy

1. Abra `/api/health` e confirme uma resposta HTTP 200.
2. Abra a página inicial e conclua uma triagem de teste.
   - TDAH: confirme que o resumo separa sinais atuais, infância, duração e áreas de prejuízo.
   - Ansiedade: confirme que a soma varia de 0 a 21 e exibe a faixa correspondente.
3. Confira o link do WhatsApp em celular e desktop.
4. Compartilhe a URL em uma mensagem e confira a imagem social.
5. Verifique os logs da aplicação para erros de inicialização ou conexão.

## Rollback

Se a nova versão não iniciar:

1. Preserve os logs e identifique o primeiro erro do processo.
2. Restaure na Hostinger o último commit que passou em `pnpm build`.
3. Reaplique as mesmas variáveis de ambiente, sem expor seus valores.
4. Valide novamente `/api/health` e a página inicial.

Nunca copie dados clínicos ou credenciais para logs, issues ou commits.

As triagens desta versão são processadas integralmente no navegador e não dependem do banco de dados. O endpoint Node.js e a camada MySQL permanecem preparados para uma futura funcionalidade de persistência, que só deve ser ativada após a definição do fluxo de consentimento e proteção de dados.
