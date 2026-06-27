# Hemodinks Front

Aplicacao web do Hemodinks para administradores, medicos e pacientes. O front e uma SPA em React/Vite com rotas autenticadas, dashboard, usuarios, pacientes, agenda, exportacao de relatorios e integracao com CBHPM.

## Stack

- React 19
- TypeScript
- Vite 7
- React Router
- TanStack Query
- Vitest + Testing Library
- Playwright
- axe-core para auditoria de acessibilidade
- lucide-react
- jsPDF + jsPDF AutoTable carregados sob demanda
- Sentry e New Relic opcionais para observabilidade
- rollup-plugin-visualizer para auditoria de bundle
- LHCI para Lighthouse automatizavel

## URLs

| Recurso | URL |
| --- | --- |
| Front local | `http://localhost:5173` |
| Front producao | `https://hemodinks-saude.vercel.app` |
| API local | `http://localhost:5000` |
| Swagger API local | `http://localhost:5000/swagger` |
| Scalar API local | `http://localhost:5000/scalar` |

## Requisitos

- Node.js 22 recomendado
- npm
- Chromium do Playwright para testes E2E

Em uma maquina nova:

```powershell
npm ci
npx playwright install chromium
```

## Configuracao

O front usa `VITE_API_URL` para localizar a API. Se a variavel nao existir, o codigo usa `http://localhost:5000`.

```powershell
Copy-Item .env.example .env.local
```

Exemplo local:

```text
VITE_API_URL=http://localhost:5000
VITE_APP_ENV=local
VITE_APP_VERSION=local
VITE_NEW_RELIC_ACCOUNT_ID=
VITE_NEW_RELIC_AGENT_ID=
VITE_NEW_RELIC_APPLICATION_ID=
VITE_NEW_RELIC_LICENSE_KEY=
VITE_NEW_RELIC_TRUST_KEY=
VITE_SENTRY_DSN=
VITE_SENTRY_TRACES_SAMPLE_RATE=0
```

Exemplo producao/homologacao:

```text
VITE_API_URL=https://<api-publica>
VITE_APP_ENV=production
VITE_APP_VERSION=<sha-ou-versao>
VITE_NEW_RELIC_ACCOUNT_ID=<account-id-opcional>
VITE_NEW_RELIC_AGENT_ID=<agent-id-opcional>
VITE_NEW_RELIC_APPLICATION_ID=<application-id-opcional>
VITE_NEW_RELIC_LICENSE_KEY=<license-key-opcional>
VITE_NEW_RELIC_TRUST_KEY=<trust-key-opcional>
VITE_SENTRY_DSN=<dsn-opcional>
VITE_SENTRY_TRACES_SAMPLE_RATE=0
```

Preencha os valores `VITE_NEW_RELIC_*` com os IDs mostrados em `Browser monitoring > Install with NPM`. Se eles nao existirem, o app segue normalmente sem inicializar o agent do New Relic.

## Executar

```powershell
npm run dev
```

O Vite sobe em `http://localhost:5173` por padrao. O script usa `--host 0.0.0.0`, entao tambem aceita acesso pela rede local.

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | inicia o Vite em modo desenvolvimento |
| `npm run build` | roda TypeScript e gera `dist` |
| `npm run analyze` | gera build com relatorio em `dist/bundle-stats.html` |
| `npm run budget` | valida limites de tamanho do bundle gerado |
| `npm run audit:a11y` | roda a auditoria axe nas rotas principais |
| `npm run audit:lighthouse` | roda build e auditoria Lighthouse via LHCI |
| `npm test` | roda testes unitarios/integracao com Vitest |
| `npm run test:e2e` | roda testes E2E com Playwright |
| `npm run preview` | serve o build gerado em `dist` |

## Rotas

| Rota | Tela |
| --- | --- |
| `/` | redireciona para dashboard |
| `/dashboard` | painel inicial |
| `/usuarios` | listagem/cadastro/edicao de usuarios |
| `/pacientes` | listagem/cadastro/edicao/exportacao de pacientes |
| `/agenda` | agenda e cadastro de eventos |

## Funcionalidades

- login com JWT e persistencia local de sessao
- troca obrigatoria de senha no primeiro acesso
- reset de senha
- dashboard com resumo e notificacoes
- CRUD de usuarios
- CRUD de pacientes
- upload, listagem e exclusao de arquivos
- filtros administrativos de pacientes
- agenda com calendario e eventos
- modal CBHPM com filtros por codigo, procedimento e porte
- selecao de procedimentos CBHPM no cadastro/edicao de paciente
- exportacao de pacientes em XLSX e PDF
- tema claro/escuro
- Error Boundary com fallback visual
- observabilidade opcional via Sentry e New Relic Browser
- layout responsivo testado em 360px, 390px e 768px
- modais com fechamento por ESC, foco inicial e restauracao de foco
- componentes base aplicados em listas, formularios, agenda e modais principais

## Arquitetura Resumida

O projeto segue uma divisao por dominio em `src/features`:

```text
src/
  features/
    auth/
    dashboard/
    events/
    patients/
    users/
  layout/
  shared/
  styles/
```

Pontos principais:

- `src/App.tsx` orquestra sessao, rotas, layout e modais globais.
- `src/main.tsx` sobe o Browser agent do New Relic antes do bootstrap do React quando as envs existem.
- `src/routes.ts` mapeia as rotas da SPA.
- `src/queryClient.ts` centraliza configuracao do TanStack Query.
- `src/observability.ts` inicializa Sentry quando `VITE_SENTRY_DSN` existe.
- `src/newRelic.ts` concentra a configuracao opcional do Browser monitoring.
- `src/shared/queryKeys.ts` centraliza chaves de cache.
- `src/shared/components/ui.tsx` concentra componentes base de UI.
- `src/shared/components/ErrorBoundary.tsx` captura erros inesperados da arvore React.
- `src/features/users/useUsersDomain.ts` coordena o dominio de usuarios.
- `src/features/patients/usePatientsDomain.ts` coordena o dominio de pacientes.
- hooks menores (`useUserList`, `useUserForm`, `usePatientList`, `usePatientForm`, `usePatientLookups`, `useCbhpmLookup`) isolam estados de lista, formulario e lookups.
- paginas e modais principais sao carregados com `React.lazy`.
- bibliotecas pesadas de PDF sao carregadas apenas no momento da exportacao PDF.

Mais detalhes em [TECHNICAL.md](./TECHNICAL.md).

## Cache e API

O front usa TanStack Query para leituras principais e mutacoes de usuarios/pacientes.

Cache atual:

- dashboard summary
- notificacoes
- usuarios
- pacientes
- usuarios medicos
- hospitais
- convenios
- CBHPM

As invalidacoes passam por `queryKeys`, evitando chaves duplicadas ou inconsistentes.

## CBHPM

Endpoint usado pelo modal:

```http
GET /api/cbhpm?page=1&pageSize=10&codigo=&procedimento=&porte=
Authorization: Bearer <token>
```

Ao selecionar um item, o formulario de paciente recebe:

- `cbhpmCodigo`
- `cbhpmPorte`
- `procedimento`
- `procedimentos`

O backend continua responsavel por validar o codigo antes de salvar.

## Testes e Qualidade

Rodar a suite principal:

```powershell
npm test
npm run build
npm run budget
npm run test:e2e
npm run analyze
npm run audit:lighthouse
```

Cobertura atual:

- testes unitarios/integracao para API e App
- E2E de login pelo formulario
- E2E de navegacao autenticada
- E2E de responsividade mobile em telas criticas
- E2E de cadastro e edicao de usuario
- E2E de cadastro e edicao de paciente
- E2E de cadastro de evento na agenda
- E2E de permissao por perfil
- E2E de exportacao XLSX e PDF
- auditoria axe para violacoes serias/criticas de acessibilidade
- budget de bundle para chunk principal e CSS
- Lighthouse autenticado via LHCI nas rotas internas principais
- evidencias visuais desktop/mobile das telas e formularios principais
- auditoria de bundle via `dist/bundle-stats.html`

## Deploy

Detalhes de Vercel, Render, homologacao e checklist de validacao em [DEPLOYMENT.md](./DEPLOYMENT.md).
