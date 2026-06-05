# Deploy do Hemodinks Front

Frontend React/Vite publicado como SPA.

## URLs

| Recurso | URL |
| --- | --- |
| Desenvolvimento local | `http://localhost:5173` |
| Producao atual | `https://hemodinks-saude.vercel.app` |
| API local | `http://localhost:5000` |
| Swagger API | `https://<api-publica>/swagger` |
| Scalar API | `https://<api-publica>/scalar` |

## Variavel da API

Configure:

```text
VITE_API_URL=https://<api-publica>
```

Localmente, o padrao do codigo e `http://localhost:5000`. Para sobrescrever:

```powershell
Copy-Item .env.example .env.local
```

## Vercel

`vercel.json` define:

- framework `vite`
- install `npm ci`
- build `npm run build`
- output `dist`
- rewrite SPA para `/index.html`

Secrets/variaveis no Vercel ou GitHub Actions:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
VITE_API_URL
```

O workflow `.github/workflows/deploy-vercel.yml` roda testes, gera build e publica em producao quando houver push na `main` ou execucao manual.

## Render

`render.yaml` define um Static Site:

- build `npm ci && npm run build`
- publish path `./dist`
- rewrite SPA para `/index.html`

Variavel obrigatoria:

```text
VITE_API_URL=https://<api-publica>
```

## Validacao

```powershell
npm ci
npm test
npm run build
npm run preview
```

Fluxos que devem ser testados apos deploy:

- login
- dashboard
- listagem de usuarios
- cadastro/edicao de paciente
- popup CBHPM com filtros por codigo, procedimento e porte
- selecao de procedimento compondo o payload do paciente
- upload/listagem/exclusao de arquivos

## CORS

A API ja permite por padrao:

```text
https://hemodinks-saude.vercel.app
```

Para preview deployments da Vercel ou outros dominios, adicione no backend:

```text
Cors__AllowedOrigins__0=https://hemodinks-saude.vercel.app
Cors__AllowedOrigins__1=https://<preview>.vercel.app
```
