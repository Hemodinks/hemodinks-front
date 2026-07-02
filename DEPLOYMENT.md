# Deploy do Hemodinks Front

Frontend React/Vite publicado como SPA. O build final fica em `dist` e todas as rotas devem reescrever para `/index.html`.

## Ambientes

| Ambiente | URL |
| --- | --- |
| Local | `http://localhost:5173` |
| Producao | `https://hemodinks-saude.vercel.app` |
| API local | `http://localhost:5000` |
| Swagger local | `http://localhost:5000/swagger` |
| Scalar local | `http://localhost:5000/scalar` |

## Variaveis

Variavel obrigatoria em ambientes publicados:

```text
VITE_API_URL=https://<api-publica>
VITE_APP_ENV=production
VITE_APP_VERSION=<versao-ou-sha>
VITE_NEW_RELIC_ACCOUNT_ID=<account-id-opcional>
VITE_NEW_RELIC_AGENT_ID=<agent-id-opcional>
VITE_NEW_RELIC_APPLICATION_ID=<application-id-opcional>
VITE_NEW_RELIC_LICENSE_KEY=<license-key-opcional>
VITE_NEW_RELIC_TRUST_KEY=<trust-key-opcional>
VITE_SENTRY_DSN=<dsn-opcional>
VITE_SENTRY_TRACES_SAMPLE_RATE=0
```

Localmente o fallback do codigo e `http://localhost:5000`, mas o recomendado e manter `.env.local`:

```powershell
Copy-Item .env.example .env.local
```

Homologacao de confirmation:

```text
VITE_API_URL=https://hemodinks-api-confirmation.onrender.com
```

## Validacao Antes de Deploy

Em uma maquina nova, instale tambem o navegador do Playwright:

```powershell
npm ci
npx playwright install chromium
```

Checklist local recomendado:

```powershell
npm test
npm run build
npm run budget
npm run test:e2e
npm run audit:a11y
npm run analyze
npm run audit:lighthouse
```

O comando `npm run analyze` gera:

```text
dist/bundle-stats.html
```

Esse arquivo ajuda a confirmar se dependencias pesadas, como `jspdf`, continuam separadas em chunks carregados sob demanda.

## Vercel

`vercel.json` define:

- framework `vite`
- install `npm ci`
- build `npm run build`
- output `dist`
- rewrite SPA para `/index.html`

Secrets/variaveis esperadas:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
VITE_API_URL
VITE_NEW_RELIC_ACCOUNT_ID
VITE_NEW_RELIC_AGENT_ID
VITE_NEW_RELIC_APPLICATION_ID
VITE_NEW_RELIC_LICENSE_KEY
VITE_NEW_RELIC_TRUST_KEY
VITE_SENTRY_DSN
VITE_SENTRY_TRACES_SAMPLE_RATE
```

`VITE_APP_ENV=production` e `VITE_APP_VERSION=<sha>` sao definidos pelo workflow. Cadastre `VITE_SENTRY_DSN` e, se quiser Browser monitoring no front, as `VITE_NEW_RELIC_*` nos secrets do GitHub e tambem no painel da Vercel caso o build seja disparado diretamente por la.

Workflow atual:

```text
.github/workflows/deploy-vercel.yml
```

Ele roda em push para `main` ou `workflow_dispatch`, instala Node 22, executa `npm test`, `npm run build`, `npm run budget` e faz o deploy Vercel quando os secrets existem.

O workflow de CI (`.github/workflows/ci.yml`) roda tambem Playwright E2E e Lighthouse. Use esse pipeline como gate principal para pull requests e pushes em `main`/`developer`.

## Render

`render.yaml` define um Static Site:

- service: `hemodinks-front`
- branch: `main`
- build `npm ci && npm run build && npm run budget`
- publish path `./dist`
- rewrite SPA para `/index.html`
- headers `X-Frame-Options: sameorigin` e `X-Content-Type-Options: nosniff`

Variaveis:

```text
NODE_VERSION=22.12.0
VITE_API_URL=https://<api-publica>
VITE_APP_ENV=production
VITE_APP_VERSION=<versao-ou-sha>
VITE_NEW_RELIC_ACCOUNT_ID=<account-id-opcional>
VITE_NEW_RELIC_AGENT_ID=<agent-id-opcional>
VITE_NEW_RELIC_APPLICATION_ID=<application-id-opcional>
VITE_NEW_RELIC_LICENSE_KEY=<license-key-opcional>
VITE_NEW_RELIC_TRUST_KEY=<trust-key-opcional>
VITE_SENTRY_DSN=<dsn-opcional>
VITE_SENTRY_TRACES_SAMPLE_RATE=0
```

## Render Homologacao: Confirmation

`render.confirmation.yaml` define um Static Site separado:

- service: `hemodinks-front-confirmation`
- branch: `developer`
- build `npm ci && npm run build && npm run budget`
- publish path `./dist`
- rewrite SPA para `/index.html`

Variavel de referencia:

```text
VITE_API_URL=https://hemodinks-api-confirmation.onrender.com
VITE_APP_ENV=confirmation
VITE_APP_VERSION=<versao-ou-sha>
VITE_NEW_RELIC_ACCOUNT_ID=<account-id-opcional>
VITE_NEW_RELIC_AGENT_ID=<agent-id-opcional>
VITE_NEW_RELIC_APPLICATION_ID=<application-id-opcional>
VITE_NEW_RELIC_LICENSE_KEY=<license-key-opcional>
VITE_NEW_RELIC_TRUST_KEY=<trust-key-opcional>
VITE_SENTRY_DSN=<dsn-opcional>
VITE_SENTRY_TRACES_SAMPLE_RATE=0
```

O arquivo `.env.confirmation.example` contem o mesmo valor para build local ou configuracao manual.

Para Sentry em Render, cadastre `VITE_SENTRY_DSN` como secret/environment variable no servico. Para New Relic Browser, copie os valores da tela `Browser monitoring > Install with NPM` para as `VITE_NEW_RELIC_*`. Sem esses valores, o front publica normalmente, mas sem enviar telemetria do Browser monitoring.

No backend de homologacao, libere a origem do front:

```text
Cors__AllowedOrigins__0=https://hemodinks-front-confirmation.onrender.com
```

## Smoke Test Apos Deploy

Validar no navegador:

- login com usuario real
- dashboard carregando resumo
- notificacoes abrindo e fechando
- listagem de usuarios
- cadastro/edicao de usuario
- listagem de pacientes
- filtros de pacientes
- cadastro/edicao de paciente
- modal CBHPM com busca e selecao
- exportacao XLSX
- exportacao PDF
- agenda em desktop e mobile
- tema claro/escuro
- modais fechando com ESC
- layout sem scroll horizontal em 360px, 390px e 768px
- fallback do Error Boundary
- evento de erro chegando ao Sentry quando `VITE_SENTRY_DSN` estiver configurado
- page views e requests aparecendo no New Relic Browser quando `VITE_NEW_RELIC_*` estiverem configuradas

## CORS

A API precisa permitir a origem do front publicado.

Producao:

```text
Cors__AllowedOrigins__0=https://hemodinks-saude.vercel.app
```

Preview ou outros dominios:

```text
Cors__AllowedOrigins__1=https://<preview>.vercel.app
```

Homologacao Render:

```text
Cors__AllowedOrigins__0=https://hemodinks-front-confirmation.onrender.com
```

## Troubleshooting

Se a tela ficar em branco em uma rota direta, verifique a rewrite SPA para `/index.html`.

Se login ou dados falharem em producao, confira `VITE_API_URL` no ambiente publicado e as origens CORS no backend.

Se o E2E falhar em maquina nova, rode:

```powershell
npx playwright install chromium
```

Se o bundle crescer, rode:

```powershell
npm run analyze
```

Abra `dist/bundle-stats.html` e confira se bibliotecas pesadas continuam em chunks separados.
