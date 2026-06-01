# Deploy do Hemodinks Front

Este projeto esta pronto para publicar em Vercel, Render e GitHub Actions.

## Variavel da API

Configure a mesma variavel em todos os ambientes:

```text
VITE_API_URL=https://sua-api-publica
```

Em desenvolvimento local, copie `.env.example` para `.env.local` se quiser sobrescrever o padrao `http://localhost:5000`.

## Vercel

O arquivo `vercel.json` define:

- framework `vite`
- install `npm ci`
- build `npm run build`
- output `dist`
- rewrite de SPA para `/index.html`

Para deploy pelo GitHub Actions, cadastre estes secrets no repositorio:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
VITE_API_URL
```

O workflow `.github/workflows/deploy-vercel.yml` roda testes, gera build pelo Vercel CLI e publica em producao quando houver push na `main` ou execucao manual.

## Render

O arquivo `render.yaml` define um Static Site:

- runtime `static`
- branch `main`
- build `npm ci && npm run build`
- publish path `./dist`
- rewrite de SPA para `/index.html`
- deploy automatico somente quando os checks passam

Ao sincronizar o Blueprint no Render, preencha `VITE_API_URL` no dashboard.

Para deploy manual via GitHub Actions, crie o secret:

```text
RENDER_DEPLOY_HOOK_URL
```

O workflow `.github/workflows/deploy-render.yml` valida testes/build e chama o deploy hook do Render quando executado manualmente.

## GitHub Actions

Workflows disponiveis:

- `CI`: roda em push, pull request e manualmente com `npm test` e `npm run build`.
- `Deploy Vercel`: publica em producao na Vercel quando os secrets existirem.
- `Deploy Render`: dispara deploy hook manual do Render quando o secret existir.

Se algum secret de deploy ainda nao existir, o workflow correspondente avisa e encerra sem falhar.
