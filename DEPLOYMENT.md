# Deploy do Hemodinks Front

Frontend React/Vite publicado como SPA. O build final fica em `dist` e toda rota publicada precisa reescrever para `/index.html`.

## Ambientes e URLs

| Ambiente | URL |
| --- | --- |
| Local | `http://localhost:5173` |
| Producao | `https://hemodinks-saude.vercel.app` |
| Confirmation (Render blueprint) | `https://hemodinks-front-confirmation.onrender.com` |
| API local | `http://localhost:5000` |
| Swagger local | `http://localhost:5000/swagger` |
| Scalar local | `http://localhost:5000/scalar` |
| OpenAPI local | `http://localhost:5000/openapi/v1.json` |

Em ambiente publicado, Swagger/Scalar/OpenAPI dependem de `ApiDocumentation__Enabled=true` na API.

## Arquivos de ambiente

Ambiente local:

```powershell
Copy-Item .env.example .env.local
```

Ambiente confirmation local:

```powershell
Copy-Item .env.confirmation.example .env.local
```

## Variaveis

Minimo para qualquer build publicado:

```text
VITE_API_URL=https://<api-publica>
VITE_APP_ENV=production
VITE_APP_VERSION=<versao-ou-sha>
VITE_SENTRY_TRACES_SAMPLE_RATE=0
```

Observabilidade opcional no browser:

```text
VITE_NEW_RELIC_ACCOUNT_ID=<opcional>
VITE_NEW_RELIC_AGENT_ID=<opcional>
VITE_NEW_RELIC_APPLICATION_ID=<opcional>
VITE_NEW_RELIC_BEACON=<opcional>
VITE_NEW_RELIC_ERROR_BEACON=<opcional>
VITE_NEW_RELIC_LICENSE_KEY=<opcional>
VITE_NEW_RELIC_TRUST_KEY=<opcional>
VITE_SENTRY_DSN=<opcional>
VITE_OTEL_EXPORTER_OTLP_ENDPOINT=<opcional>
VITE_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=<opcional>
VITE_OTEL_EXPORTER_OTLP_HEADERS=<opcional>
VITE_OTEL_EXPORTER_OTLP_TRACES_HEADERS=<opcional>
VITE_OTEL_SERVICE_NAME=hemodinks-front
VITE_OTEL_TRACES_SAMPLE_RATE=1
```

Notas:

- `VITE_NEW_RELIC_BEACON` e `VITE_NEW_RELIC_ERROR_BEACON` sao avancadas e podem ficar vazias.
- O build gera `public/otel-runtime-config.json` automaticamente via `scripts/write-otel-runtime-config.mjs`.
- Se o backend OTLP exigir segredo privado, publique um proxy/collector seu em vez de expor a credencial no bundle.

## Validacao antes de deploy

Em maquina nova:

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

Artefatos uteis:

```text
dist/
dist/bundle-stats.html
public/otel-runtime-config.json
reports/lighthouse/
```

## Vercel

`vercel.json` define:

- framework `vite`
- install `npm ci`
- build `npm run build`
- output `dist`
- rewrite SPA para `/index.html`

Workflow atual:

```text
.github/workflows/deploy-vercel.yml
```

O workflow:

- roda em push para `main` e `workflow_dispatch`
- instala Node 22
- executa `npm test`, `npm run build` e `npm run budget`
- so segue para deploy quando `VERCEL_TOKEN`, `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID` existem

Segredos do workflow:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
VITE_API_URL
VITE_SENTRY_DSN
```

Variaveis definidas pelo workflow:

```text
VITE_APP_ENV=production
VITE_APP_VERSION=<sha>
VITE_SENTRY_TRACES_SAMPLE_RATE=<vars do ambiente GitHub>
```

Variaveis opcionais de observabilidade que devem ficar no projeto Vercel quando o build depender delas:

```text
VITE_NEW_RELIC_ACCOUNT_ID
VITE_NEW_RELIC_AGENT_ID
VITE_NEW_RELIC_APPLICATION_ID
VITE_NEW_RELIC_BEACON
VITE_NEW_RELIC_ERROR_BEACON
VITE_NEW_RELIC_LICENSE_KEY
VITE_NEW_RELIC_TRUST_KEY
VITE_OTEL_EXPORTER_OTLP_ENDPOINT
VITE_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
VITE_OTEL_EXPORTER_OTLP_HEADERS
VITE_OTEL_EXPORTER_OTLP_TRACES_HEADERS
VITE_OTEL_SERVICE_NAME
VITE_OTEL_TRACES_SAMPLE_RATE
```

O workflow de CI (`.github/workflows/ci.yml`) continua sendo o gate principal para PRs e pushes, pois ele roda tambem E2E e Lighthouse.

## Render producao

`render.yaml` define um Static Site:

- service: `hemodinks-front`
- branch: `main`
- build `npm ci && npm run build && npm run budget`
- publish path `./dist`
- rewrite SPA para `/index.html`
- headers `X-Frame-Options: sameorigin` e `X-Content-Type-Options: nosniff`

Variaveis do blueprint:

```text
NODE_VERSION=22.12.0
VITE_APP_ENV=production
VITE_SENTRY_TRACES_SAMPLE_RATE=0
```

Variaveis que precisam ser preenchidas manualmente:

```text
VITE_API_URL=https://<api-publica>
VITE_APP_VERSION=<versao-ou-sha>
VITE_NEW_RELIC_ACCOUNT_ID=<opcional>
VITE_NEW_RELIC_AGENT_ID=<opcional>
VITE_NEW_RELIC_APPLICATION_ID=<opcional>
VITE_NEW_RELIC_LICENSE_KEY=<opcional>
VITE_NEW_RELIC_TRUST_KEY=<opcional>
VITE_SENTRY_DSN=<opcional>
```

## Render homologacao: confirmation

`render.confirmation.yaml` define um Static Site separado:

- service: `hemodinks-front-confirmation`
- branch: `developer`
- build `npm ci && npm run build && npm run budget`
- publish path `./dist`
- rewrite SPA para `/index.html`

Variaveis principais:

```text
NODE_VERSION=22.12.0
VITE_API_URL=https://hemodinks-api-confirmation.onrender.com
VITE_APP_ENV=confirmation
VITE_APP_VERSION=<versao-ou-sha>
VITE_SENTRY_TRACES_SAMPLE_RATE=0
```

Use `.env.confirmation.example` para reproduzir esse build localmente.

## CORS esperado na API

A API precisa permitir a origem do front publicado.

Producao:

```text
Cors__AllowedOrigins__0=https://hemodinks-saude.vercel.app
```

Preview Vercel ou outros dominios:

```text
Cors__AllowedOrigins__1=https://<preview>.vercel.app
```

Confirmation Render:

```text
Cors__AllowedOrigins__0=https://hemodinks-front-confirmation.onrender.com
```

Se a API confirmation tambem aceitar a homologacao Vercel, ela pode manter:

```text
Cors__AllowedOrigins__1=https://hemodinks-homologacao.vercel.app
```

## Smoke test apos deploy

Validar no navegador:

- login
- reset de senha por token, se a API estiver com esse fluxo habilitado
- dashboard carregando resumo
- notificacoes abrindo, marcando como lidas e atualizando contadores
- usuarios e meu cadastro
- listagem e formulario de pacientes
- observacoes de pacientes
- faturamento medico
- grupos medicos
- agenda e notificacoes
- configuracao da empresa, tema e troca de senha
- exportacao XLSX e PDF
- layout sem scroll horizontal em `360px`, `390px` e `768px`
- fallback do Error Boundary
- eventos de Sentry/New Relic/OTLP quando configurados

## Troubleshooting

Se a tela ficar em branco em rota direta, confirme a rewrite SPA para `/index.html`.

Se login ou consultas falharem, revise `VITE_API_URL` e as origens CORS da API publicada.

Se o E2E falhar em maquina nova:

```powershell
npx playwright install chromium
```

Se o bundle crescer ou o build ficar lento:

```powershell
npm run analyze
```

Abra `dist/bundle-stats.html` e confira se `jspdf` e outros pacotes pesados continuam em chunks separados.

Se a telemetria OTLP nao aparecer, confira `public/otel-runtime-config.json` no build gerado e valide se o endpoint publicado aceita chamadas de browser.
