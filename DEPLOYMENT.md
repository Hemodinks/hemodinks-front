# Deploy do Hemodinks Front

Frontend React/Vite publicado como SPA. O build final fica em `dist` e toda rota publicada precisa reescrever para `/index.html`.

## Ambientes e URLs

| Ambiente | URL |
| --- | --- |
| Local | `http://localhost:5173` |
| Producao | `https://hemodinks.gestao-saude.tec.br` |
| Homologacao | `https://hemodinks-homologacao.gestao-saude.tec.br` |
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

## Azure Static Web Apps: producao

`public/staticwebapp.config.json` define o fallback SPA, os headers de seguranca e as regras de cache. O arquivo e copiado para a raiz de `dist` pelo build do Vite.

O workflow `.github/workflows/azure-static-web-apps-white-grass-0d59a4410.yml`:

- roda apenas em `push` para `main` ou acionamento manual selecionando a `main`
- executa testes, build e budget antes da publicacao
- publica `dist` no Azure Static Web Apps
- nao cria preview nem deploy de producao em pull requests

Segredos necessarios:

```text
AZURE_STATIC_WEB_APPS_API_TOKEN_WHITE_GRASS_0D59A4410
VITE_API_URL
VITE_SENTRY_DSN
```

O workflow de CI (`.github/workflows/ci.yml`) continua sendo o gate dos PRs e pushes. Lighthouse fica separado em `.github/workflows/lighthouse.yml` e deve ser iniciado manualmente quando necessario.

O arquivo `src/vercel.json` mantém desabilitado o projeto Vercel legado de produção. O `vercel.json` da raiz pertence à homologação e habilita deploy automático somente para a branch `developer`.

## Vercel: homologacao

`vercel.json` define o projeto `hemodinks-front-confirmation`:

- framework `vite`
- install `npm ci`
- build `npm run build && npm run budget`
- output `dist`
- deploy Git habilitado somente para `developer`
- rewrite SPA de `/(.*)` para `/index.html`
- headers de segurança e cache dos assets

Variaveis principais:

```text
VITE_API_URL=https://hemodinks-api-confirmation.onrender.com
VITE_APP_ENV=confirmation
VITE_APP_VERSION=<versao-ou-sha>
VITE_SENTRY_TRACES_SAMPLE_RATE=0
```

Use `.env.confirmation.example` para reproduzir esse build localmente.

Não use **Redeploy** em um deployment antigo que ainda contenha redirects ou rewrites inválidos. Crie um deployment a partir da versão mais recente da branch `developer`; a Vercel aplicará o `vercel.json` correspondente ao novo commit.

## CORS esperado na API

A API precisa permitir a origem do front publicado.

Producao:

```text
Cors__AllowedOrigins__0=https://hemodinks.gestao-saude.tec.br
```

Homologacao Vercel:

```text
Cors__AllowedOrigins__0=https://hemodinks-homologacao.gestao-saude.tec.br
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
