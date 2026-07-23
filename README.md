# Instituto Dr. Marcel Gonçalves

Base técnica do novo site institucional do Instituto Dr. Marcel Gonçalves. O projeto foi preparado para conteúdo institucional, integração com WhatsApp e evolução do motor de rastreios clínicos sem acoplar a regra de negócio à interface.

## Requisitos

- Node.js 22.13 ou superior
- pnpm 11.9 ou superior
- Git

## Desenvolvimento local

```bash
pnpm install
pnpm dev
```

A aplicação fica disponível em `http://localhost:3000`.

## Validação

```bash
pnpm build
pnpm lint
```

## Estrutura

- `app/`: páginas, componentes e estilos da interface
- `db/`: schema e acesso a dados com Drizzle
- `drizzle/`: migrações versionadas
- `worker/`: entrada compatível com Cloudflare Workers
- `public/`: imagens e demais arquivos públicos
- `.openai/hosting.json`: configuração de hospedagem do projeto

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha somente os valores necessários. Arquivos locais de ambiente não entram no Git.

## GitHub

O fluxo principal usa a branch `main`. Depois de criar o repositório remoto:

```bash
git remote add origin URL_DO_REPOSITORIO
git push -u origin main
```

## Diretrizes clínicas

Resultados de rastreios nunca devem ser apresentados como diagnóstico. Toda tela de resultado deve informar que se trata de probabilidade ou indicação de rastreio e que o conteúdo não substitui avaliação médica.

