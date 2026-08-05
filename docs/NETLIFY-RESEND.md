# Netlify + Resend, do teste local à produção

## O que você precisa

- Uma conta gratuita no Resend.
- Uma conta gratuita na Netlify.
- O projeto enviado ao GitHub.
- Para o primeiro teste, não é necessário comprar domínio nem contratar hospedagem.

A Netlify será a hospedagem e fornecerá um endereço `seu-site.netlify.app`.

## 1. Preparar o Resend para teste

1. Entre no painel do Resend.
2. Abra **API Keys** e clique em **Create API Key**.
3. Dê o nome `Instituto local`.
4. Selecione **Sending access**.
5. Copie a chave exibida e guarde-a. Ela só aparece uma vez.

Sem domínio próprio, use `Instituto Dr. Marcel <onboarding@resend.dev>` como remetente. Nesse modo, o Resend só permite enviar para o mesmo e-mail usado na conta do Resend.

## 2. Testar localmente

Crie um arquivo chamado `.env.local` na raiz do projeto. Ele deve ficar ao lado de `package.json`.

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_WHATSAPP_NUMBER=5571993622929
RESEND_API_KEY=COLE_A_CHAVE_NOVA_AQUI
RESULT_FROM_EMAIL=Instituto Dr. Marcel <onboarding@resend.dev>
# Opcional: use somente se você já souber qual e-mail receberá respostas.
# RESULT_REPLY_TO=seu-email-real@exemplo.com
```

O `.env.local` já é ignorado pelo Git e não deve ser enviado ao GitHub.

Inicie o projeto:

```powershell
pnpm.cmd dev
```

Abra `http://localhost:3000`, conclua uma triagem e use o mesmo e-mail cadastrado no Resend. O e-mail recebido deve conter o PDF anexado.

## 3. Enviar o projeto ao GitHub

```bash
git add .
git commit -m "Send triage PDF by email"
git push origin main
```

Nunca adicione o `.env.local` manualmente ao Git.

## 4. Criar o site na Netlify

1. No painel da Netlify, clique em **Add new project**.
2. Escolha **Import an existing project**.
3. Selecione **GitHub** e autorize o acesso ao repositório.
4. Escolha o repositório do Instituto.
5. Use a branch `main`.
6. Deixe **Base directory**, **Build command** e **Publish directory** vazios/automáticos.
7. Clique em **Deploy**.

Não configure `.next` como Publish directory. A Netlify detecta o Next.js e prepara a função `/api/send-result` automaticamente.

## 5. Cadastrar as variáveis na Netlify

No projeto da Netlify, abra **Project configuration > Environment variables** e adicione:

```env
NEXT_PUBLIC_SITE_URL=https://SEU-SITE.netlify.app
NEXT_PUBLIC_WHATSAPP_NUMBER=5571993622929
RESEND_API_KEY=COLE_A_CHAVE_NOVA_AQUI
RESULT_FROM_EMAIL=Instituto Dr. Marcel <onboarding@resend.dev>
# Opcional: RESULT_REPLY_TO=seu-email-real@exemplo.com
```

Marque `RESEND_API_KEY` como valor secreto, se essa opção estiver disponível. Depois de alterar variáveis, faça um novo deploy em **Deploys > Trigger deploy > Clear cache and deploy site**.

Enquanto estiver usando `onboarding@resend.dev`, o formulário só funcionará quando o visitante informar o e-mail da conta Resend. Isso é adequado para demonstração, não para uso público.

## 6. Liberar o envio para qualquer paciente

Para enviar a qualquer endereço, compre um domínio e adicione-o em **Resend > Domains**. Copie para o painel DNS todos os registros mostrados pelo Resend e aguarde o status **Verified**.

Depois, altere somente estas variáveis na Netlify:

```env
NEXT_PUBLIC_SITE_URL=https://seu-dominio.com.br
RESULT_FROM_EMAIL=Instituto Dr. Marcel <resultados@seu-dominio.com.br>
RESULT_REPLY_TO=contato@seu-dominio.com.br
```

Faça um novo deploy após a alteração.

## Erros comuns

- **403 no Resend:** tentou enviar com `onboarding@resend.dev` para um e-mail diferente do dono da conta.
- **503 no site:** `RESEND_API_KEY` ou `RESULT_FROM_EMAIL` não foi cadastrada.
- **502 no site:** chave inválida, remetente não autorizado ou falha na entrega do Resend.
- **Not Found na Netlify:** foi configurada uma Publish directory manual, normalmente `.next`. Remova-a e refaça o deploy.
