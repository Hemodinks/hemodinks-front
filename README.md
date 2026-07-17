# Hemodinks Front

SPA React/Vite do Hemodinks para operacao assistencial e administrativa. O front cobre autenticacao, redefinicao de senha, dashboard, usuarios, meu cadastro, pacientes, observacoes, faturamento medico, grupos medicos, agenda/notificacoes e configuracao do sistema.

## Stack

- React 19
- TypeScript
- Vite 7
- React Router
- TanStack Query
- Vitest + Testing Library
- Playwright + axe-core
- lucide-react
- jsPDF + jsPDF AutoTable carregados sob demanda
- Sentry, New Relic Browser e OpenTelemetry opcionais para observabilidade
- Lighthouse CI e bundle analyzer para auditoria

## Mapa da documentacao

- `README.md`: onboarding rapido, stack, rotas e fluxo de desenvolvimento
- `TECHNICAL.md`: arquitetura, contratos de API e convencoes de manutencao
- `DEPLOYMENT.md`: deploy, ambientes, CORS e checklist operacional

## URLs

| Recurso | URL |
| --- | --- |
| Front local | `http://localhost:5173` |
| Front producao | `https://hemodinks.gestao-saude.tec.br` |
| Front producao legado | `https://hemodinks-saude.vercel.app` |
| Front confirmation (Render blueprint) | `https://hemodinks-front-confirmation.onrender.com` |
| API local | `http://localhost:5000` |
| Swagger local | `http://localhost:5000/swagger` |
| Scalar local | `http://localhost:5000/scalar` |
| OpenAPI local | `http://localhost:5000/openapi/v1.json` |

Em ambiente publicado, o front conversa com a base configurada em `VITE_API_URL`. Se a API publicada expuser documentacao interativa com `ApiDocumentation__Enabled=true`, os atalhos ficam em:

- `${VITE_API_URL}/swagger`
- `${VITE_API_URL}/scalar`
- `${VITE_API_URL}/openapi/v1.json`

## Requisitos

- Node.js 22
- npm
- Chromium do Playwright para E2E e auditoria de acessibilidade

Bootstrap em maquina nova:

```powershell
npm ci
Copy-Item .env.example .env.local
npx playwright install chromium
```

## Configuracao

O front usa `VITE_API_URL` para localizar a API. Sem essa variavel, o fallback de desenvolvimento e `http://localhost:5000`.

Arquivo base:

```powershell
Copy-Item .env.example .env.local
```

Exemplo local:

```text
VITE_API_URL=http://localhost:5000
VITE_APP_ENV=local
VITE_APP_VERSION=local
VITE_CLINICA_ID=
VITE_CLINICA_SLUG=
VITE_NEW_RELIC_ACCOUNT_ID=
VITE_NEW_RELIC_AGENT_ID=
VITE_NEW_RELIC_APPLICATION_ID=
VITE_NEW_RELIC_BEACON=
VITE_NEW_RELIC_ERROR_BEACON=
VITE_NEW_RELIC_LICENSE_KEY=
VITE_NEW_RELIC_TRUST_KEY=
VITE_OTEL_EXPORTER_OTLP_ENDPOINT=
VITE_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=
VITE_OTEL_EXPORTER_OTLP_HEADERS=
VITE_OTEL_EXPORTER_OTLP_TRACES_HEADERS=
VITE_OTEL_SERVICE_NAME=hemodinks-front
VITE_OTEL_TRACES_SAMPLE_RATE=1
VITE_SENTRY_DSN=
VITE_SENTRY_TRACES_SAMPLE_RATE=0
```

Exemplo confirmation:

```powershell
Copy-Item .env.confirmation.example .env.local
```

Observacoes:

- Em ambiente multi-clinica, o front envia automaticamente `X-Clinica-Slug` ou `X-Clinica-Id` nas chamadas publicas quando `VITE_CLINICA_SLUG` ou `VITE_CLINICA_ID` estiverem preenchidos.
- Em chamadas autenticadas, o front reaproveita os claims `clinicaId` e `clinicaSlug` do JWT para manter o contexto da clinica atual.
- Se o front estiver em um dominio customizado por clinica, como `clinica-a.seudominio.com`, o client tambem tenta inferir o slug pela URL. Hosts compartilhados de plataforma, como `onrender.com` e `vercel.app`, sao ignorados nessa inferencia para evitar falsos positivos.
- `VITE_NEW_RELIC_BEACON` e `VITE_NEW_RELIC_ERROR_BEACON` sao avancadas. Se ficarem vazias, o app usa `bam.nr-data.net`.
- `scripts/write-otel-runtime-config.mjs` gera `public/otel-runtime-config.json` antes de `dev`, `build` e `analyze`.
- Quando o front sobe via `Hemodinks.AppHost`, o script reaproveita `ASPIRE_DASHBOARD_OTLP_HTTP_ENDPOINT_URL` e `OTEL_EXPORTER_OTLP_*` injetados pelo host local.
- Use `VITE_OTEL_*` em build publicado apenas com endpoints e headers seguros para browser.

## Executar

```powershell
npm run dev
```

O Vite sobe em `http://localhost:5173` com `--host 0.0.0.0`.

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | inicia o Vite em desenvolvimento |
| `npm run build` | roda TypeScript e gera `dist` |
| `npm run analyze` | gera build com relatorio em `dist/bundle-stats.html` |
| `npm run budget` | valida limites de tamanho do bundle |
| `npm run audit:a11y` | roda Playwright com axe nas rotas criticas |
| `npm run audit:lighthouse` | roda build e LHCI autenticado |
| `npm test` | roda testes unitarios e de integracao |
| `npm run test:e2e` | roda testes E2E com Playwright |
| `npm run preview` | serve o build gerado em `dist` |

## Rotas

| Rota | Uso |
| --- | --- |
| `/` | login ou redirecionamento para dashboard quando a sessao existe |
| `/reset-password?token=...` | confirmacao de reset de senha por token |
| `/dashboard` | painel inicial |
| `/usuarios` | listagem e cadastro de usuarios |
| `/meu-cadastro` | autoatendimento do medico ou paciente |
| `/pacientes` | listagem, cadastro, observacoes e exportacoes de pacientes |
| `/faturamento-medico` | leitura financeira consolidada a partir dos pacientes |
| `/grupos-medicos` | grupos de medicos usados em notificacoes da agenda |
| `/agenda` | agenda e notificacoes internas |
| `/configuracoes` | marca da empresa, tema e troca de senha |

## Perfis e acesso

| Perfil | Acesso principal |
| --- | --- |
| Administrador | dashboard, usuarios, pacientes, faturamento, grupos medicos, agenda e configuracoes |
| Medicos | dashboard, meu cadastro, pacientes, faturamento, agenda e configuracoes |
| Controller | pacientes, faturamento e configuracoes |
| Paciente | meu cadastro, pacientes em modo leitura e configuracoes |

## Funcionalidades

- login com JWT
- sessao mantida apenas em memoria do React
- troca obrigatoria de senha no primeiro acesso
- reset de senha por email/token quando a API publica esse fluxo
- fallback de reset para senha padrao quando a API estiver nesse modo
- dashboard com resumo, notificacoes e contadores operacionais
- CRUD de usuarios com foto de perfil e anexos do cadastro medico
- tela "Meu cadastro" para medico e paciente
- CRUD de pacientes com vinculo medico, convenio, hospital, OPME e procedimentos CBHPM
- observacoes por paciente com leitura, resposta e contadores de nao lidas
- exportacao de pacientes em XLSX e PDF
- faturamento medico derivado dos dados de pacientes e procedimentos
- grupos medicos usados como destinatarios de notificacao
- agenda com eventos, lembretes e notificacoes internas
- configuracao do nome e da foto da empresa
- tema claro/escuro
- Error Boundary com fallback visual
- observabilidade opcional via Sentry, New Relic Browser e OTLP

## Arquitetura resumida

```text
src/
  app/
  features/
    auth/
    billing/
    dashboard/
    events/
    medicalGroups/
    patients/
    settings/
    users/
  layout/
  services/
  shared/
  styles/
```

Pontos principais:

- `src/app/AppContent.tsx` concentra autenticacao, regras de acesso por perfil, navegacao e composicao dos dominios.
- `src/app/useAppChrome.ts` carrega resumo, notificacoes e configuracao do sistema.
- `src/features/auth/useAuthSession.ts` limpa `localStorage` e mantem a sessao apenas em memoria.
- `src/queryClient.ts` define `staleTime`, `gcTime` e retries globais.
- `src/shared/queryKeys.ts` centraliza chaves de cache.
- `src/features/patients/usePatientsDomain.ts` coordena formulario, listagem, lookups, observacoes e exportacoes.
- `src/features/users/useUsersDomain.ts` cobre listagem, autoedicao, upload de arquivos e troca de senha.
- `src/features/billing/BillingPage.tsx` compoe a tela financeira a partir de `GET /api/faturamentos-medicos`.
- `src/features/settings/SystemSettingsPage.tsx` administra marca, tema e senha.
- `src/observability.ts`, `src/newRelic.ts` e `src/otel.ts` inicializam a telemetria opcional.

Mais detalhes em [TECHNICAL.md](./TECHNICAL.md).

## Cache e API

O front usa TanStack Query para leituras principais e invalidacao consistente.

Cache atual:

- configuracao do sistema
- dashboard summary
- dashboard notifications
- usuarios
- usuarios medicos
- grupos medicos
- pacientes
- observacoes de pacientes
- hospitais
- convenios
- fornecedores OPME
- CBHPM

Observacoes:

- a tela de faturamento usa uma query propria (`billingRecords`) e carrega paginas de `GET /api/faturamentos-medicos` ate compor a visao agregada
- a tela de notificacoes marca avisos da agenda como lidos via `POST /api/events/notifications/mark-read`
- a confirmacao de reset envia `Idempotency-Key` em `POST /api/users/password/reset/confirm`

## Testes e qualidade

Suite principal:

```powershell
npm test
npm run build
npm run budget
npm run test:e2e
npm run audit:a11y
npm run analyze
npm run audit:lighthouse
```

Cobertura atual inclui:

- testes unitarios e de integracao para `App`, `api.ts`, utilitarios de pacientes e faturamento
- E2E de login, reset, navegacao autenticada e regras por perfil
- E2E de usuarios, pacientes, agenda e mobile
- axe para acessibilidade seria/critica
- Lighthouse autenticado via LHCI
- budget de bundle e analise visual do build

## Deploy

Detalhes de Vercel, Render, confirmation e checklist operacional em [DEPLOYMENT.md](./DEPLOYMENT.md).
