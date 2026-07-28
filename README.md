# Instituto Dr. Marcel Gonçalves

Site institucional e plataforma de triagens educativas do Instituto Dr. Marcel Gonçalves. A aplicação usa Next.js em Node.js e está preparada para implantação como Node.js Web App na Hostinger.

## Requisitos

- Node.js 22.13 ou superior
- pnpm 11.9 ou superior
- Git

## Instalação local

```bash
pnpm install
pnpm dev
```

No Windows PowerShell com execução de scripts restrita, use `pnpm.cmd`.

A aplicação fica disponível em `http://localhost:3000`.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e configure:

- `NEXT_PUBLIC_SITE_URL`: endereço público do site.
- `NEXT_PUBLIC_WHATSAPP_NUMBER`: número do WhatsApp com país e DDD.
- `DATABASE_URL`: conexão MySQL/MariaDB; só é necessária quando houver persistência.

Na Hostinger, cadastre os valores em **Websites → Node.js → Environment Variables**. Nunca envie `.env.local` ao Git.

## Comandos

```bash
pnpm build
pnpm start
pnpm lint
pnpm test
```

O endpoint `/api/health` confirma que o back-end Node.js está respondendo.

## Implantação na Hostinger

Use um plano **Business Web Hosting** ou **Cloud** com suporte a Node.js Web Apps.

1. Envie esta branch para o GitHub e, quando aprovada, integre-a à `main`.
2. No hPanel, acesse **Websites → Add Website → Node.js Web App**.
3. Importe o repositório do GitHub.
4. Selecione:
   - Framework: `Next.js`
   - Node.js: `22.x`
   - Package manager: `pnpm`
   - Build command: `pnpm build`
   - Start command: `pnpm start`
   - Porta: `3000`
5. Cadastre `NEXT_PUBLIC_SITE_URL` e `NEXT_PUBLIC_WHATSAPP_NUMBER`.
6. Se o banco for utilizado, crie um banco MySQL no hPanel e cadastre `DATABASE_URL`.
7. Faça o deploy e valide `/` e `/api/health`.

Não envie `node_modules`, `.next` ou arquivos `.env*`.

## Banco de dados

A camada de dados usa Drizzle ORM com MySQL/MariaDB. O schema permanece vazio intencionalmente: dados de triagem são dados sensíveis e só devem ser persistidos depois da definição de consentimento, finalidade, retenção, controle de acesso e demais requisitos da LGPD.

Para gerar migrações após adicionar tabelas:

```bash
pnpm db:generate
```

## Estrutura

- `app/`: interface, rotas e endpoints do Next.js
- `app/api/health/`: verificação do back-end
- `db/`: cliente e schema MySQL com Drizzle
- `drizzle/`: migrações versionadas
- `public/`: imagens e arquivos públicos

## Segurança clínica

Resultados de rastreios nunca devem ser apresentados como diagnóstico. O conteúdo não substitui avaliação médica. Antes de armazenar nomes, e-mails ou respostas, implemente consentimento explícito, política de privacidade, controle de acesso, criptografia, logs e rotina de exclusão.
