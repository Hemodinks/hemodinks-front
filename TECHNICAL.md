# Documentacao Tecnica

## Visao geral

O Hemodinks Front e uma SPA React/Vite organizada por dominios. A aplicacao concentra autenticacao, navegacao, shell visual e modais globais em `src/app`, enquanto cada modulo funcional vive em `src/features`.

Principios atuais:

- manter a interface modular por dominio
- usar TanStack Query para leituras remotas e invalidacao previsivel
- manter estados de formulario/lista em hooks pequenos
- carregar telas e modais pesados sob demanda
- privilegiar comportamento real em mobile
- validar fluxos criticos com Vitest, Playwright, axe e Lighthouse

Decisoes e excecoes de seguranca de dependencias sao registradas em
[`SECURITY.md`](./SECURITY.md). O registro inclui escopo, controles compensatorios e
criterios de remocao da excecao.

## Estrutura

```text
src/
  app/
  features/
    auth/
    billing/
      attendance/
      invoicing/
      prices/
      receivables/
      styles/
    dashboard/
      styles/
    events/
      styles/
    medicalGroups/
    patients/
    settings/
    users/
  layout/
  services/
  shared/
    components/
    domain/
    hooks/
    utils/
    queryKeys.ts
  styles/
```

Responsabilidades:

| Caminho                                   | Responsabilidade                                                                    |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| `src/services/api.ts`                     | cliente HTTP centralizado com axios, tratamento comum de erros e auth bearer        |
| `src/services/*Service.ts`                | contratos por endpoint/modulo                                                       |
| `src/app/AppContent.tsx`                  | sessao, regras de acesso por perfil, navegacao e orquestracao dos dominios          |
| `src/app/useAppChrome.ts`                 | dashboard summary, notificacoes e configuracao do sistema                           |
| `src/routes.ts`                           | mapeamento entre `AppView` e paths da SPA                                           |
| `src/queryClient.ts`                      | configuracao global do TanStack Query                                               |
| `src/otel.ts`                             | traces OTLP no browser com runtime config                                           |
| `src/newRelic.ts`                         | inicializacao opcional do Browser agent do New Relic                                |
| `src/observability.ts`                    | Sentry opcional e associacao do usuario logado                                      |
| `src/shared/queryKeys.ts`                 | chaves padronizadas de cache                                                        |
| `src/shared/components/ui.tsx`            | API publica das primitives, implementadas em `uiActions`, `uiFields` e `uiFeedback` |
| `src/shared/utils/formatters.ts`          | API publica dos formatadores separados por identidade, data, moeda, perfil e lookup |
| `src/shared/components/ErrorBoundary.tsx` | fallback visual para erros inesperados                                              |
| `src/layout`                              | App shell, sidebar, topbar e navegacao global                                       |

## Rotas e navegacao

Rotas publicas:

| Path                        | Uso                                      |
| --------------------------- | ---------------------------------------- |
| `/`                         | login ou redirecionamento para dashboard |
| `/reset-password?token=...` | confirmacao de reset de senha            |

Rotas internas:

| Path                  | View interna    | Observacao                                                   |
| --------------------- | --------------- | ------------------------------------------------------------ |
| `/dashboard`          | `dashboard`     | indisponivel para controller                                 |
| `/usuarios`           | `users`         | apenas administrador                                         |
| `/meu-cadastro`       | `profile`       | medico e paciente                                            |
| `/pacientes`          | `patients`      | todos os perfis autenticados; paciente entra em modo leitura |
| `/faturamento-medico` | `billing`       | administrador, medico e controller                           |
| `/grupos-medicos`     | `medicalGroups` | apenas administrador                                         |
| `/agenda`             | `agenda`        | indisponivel para controller                                 |
| `/configuracoes`      | `settings`      | todos os perfis autenticados                                 |

`useRouteView` sincroniza URL, permissoes e view ativa. Se a rota nao for permitida para o perfil atual, a aplicacao redireciona para uma view valida.

## Autenticacao, reset e sessao

`useAuthSession` controla a sessao do usuario:

- o token JWT fica apenas em memoria do React
- o hook remove `hemodinks.session` do `localStorage` ao iniciar
- um refresh completo da pagina encerra a sessao atual

Fluxos suportados:

- login por `POST /api/users/authenticate`
- reset por email via `POST /api/users/password/reset`
- confirmacao por token via `POST /api/users/password/reset/confirm`
- troca obrigatoria de senha quando `precisaTrocarSenha=true`
- troca voluntaria de senha dentro de `SystemSettingsPage`

O fluxo `/reset-password` gera `Idempotency-Key` no cliente para tornar o retry seguro no endpoint de confirmacao.

## Configuracao global de dados

Configuracao padrao em `src/queryClient.ts`:

- `staleTime`: 30 segundos
- `gcTime`: 5 minutos
- `refetchOnWindowFocus`: false
- `queries.retry`: 1
- `mutations.retry`: 0

Queries padronizadas em `src/shared/queryKeys.ts`:

- `systemSettings`
- `dashboardSummary`
- `dashboardNotifications`
- `users`
- `medicalUsers`
- `medicalGroups`
- `pacientes`
- `pacienteObservacoes`
- `hospitais`
- `convenios`
- `opmeFornecedores`
- `cbhpm`
- `billingAttendances`
- `billingInvoicing`
- `billingReceivables`
- `billingPrices`

Observacoes:

- invalidacoes devem usar `queryKeys`, nunca arrays soltos
- `useAppChrome` mantem `systemSettings` com `staleTime` de 5 minutos e leitura sem token
- a tela de faturamento usa query propria (`billingRecords`) porque agrega todas as paginas de `GET /api/faturamentos-medicos`

## Modulos

### Dashboard

Arquivos principais:

- `src/features/dashboard/DashboardContainer.tsx`
- `src/features/dashboard/DashboardModuleGrid.tsx`
- `src/features/dashboard/dashboardModules.tsx`
- `src/features/dashboard/dashboardModuleOrder.ts`
- `src/app/useAppChrome.ts`

Responsabilidades:

- cards de resumo
- contadores operacionais
- notificacoes do dashboard
- integracao com agenda e observacoes nao lidas
- ordenacao local de modulos do painel via `localStorage`

### Usuarios e meu cadastro

Arquivos principais:

- `src/features/users/useUsersDomain.ts`
- `src/features/users/useUserList.ts`
- `src/features/users/useUserForm.ts`
- `src/features/users/UserList.tsx`
- `src/features/users/UserForm.tsx`

Responsabilidades:

- CRUD administrativo de usuarios
- autoedicao em `/meu-cadastro`
- foto de perfil por `GET /api/users/{id}/foto-perfil`
- upload e exclusao de documentos do cadastro medico
- troca de senha do usuario autenticado

### Pacientes

Arquivos principais:

- `src/features/patients/usePatientsDomain.ts`
- `src/features/patients/usePatientList.ts`
- `src/features/patients/usePatientForm.ts`
- `src/features/patients/usePatientsDomainQueries.ts`
- `src/features/patients/patientQueryResults.ts`
- `src/features/patients/useCbhpmLookup.ts`
- `src/features/patients/PatientObservacoesModal.tsx`
- `src/features/patients/patientExport.ts`

Responsabilidades:

- listagem, busca, filtros e paginacao
- formulario clinico/administrativo
- convenios, hospitais, fornecedores OPME e medicos como lookups
- procedimentos CBHPM e procedimentos associados
- upload de arquivos do paciente
- observacoes com resposta e marcacao de leitura
- exportacao XLSX/PDF

### Faturamento medico

Arquivo principal:

- `src/features/billing/BillingPage.tsx`
- `src/features/billing/attendance`
- `src/features/billing/invoicing`
- `src/features/billing/receivables`
- `src/features/billing/prices`

Responsabilidades:

- ler `GET /api/faturamentos-medicos`
- agregar todos os resultados por filtro
- transformar dados de pacientes em indicadores financeiros
- detalhar cirurgia, glosa, anexos, procedimento e checklist

### Grupos medicos

Arquivos principais:

- `src/features/medicalGroups/useMedicalGroupsDomain.ts`
- `src/features/medicalGroups/MedicalGroupsPage.tsx`

Responsabilidades:

- CRUD de grupos medicos
- uso de medicos disponiveis por escopo
- apoio a notificacoes da agenda

### Agenda e notificacoes

Arquivo principal:

- `src/features/events/AgendaContainer.tsx`
- `src/features/events/useAgendaController.ts`
- `src/features/events/AgendaCalendarSection.tsx`
- `src/features/events/AgendaEventForm.tsx`

Responsabilidades:

- calendario mensal
- CRUD de eventos
- notificacao para usuario, perfil medico, usuarios especificos e grupos medicos
- contadores de notificacao nao lida
- marcacao de notificacoes da agenda como lidas

### Configuracao do sistema

Arquivo principal:

- `src/features/settings/SystemSettingsPage.tsx`

Responsabilidades:

- nome da empresa
- foto da empresa
- tema claro/escuro
- troca de senha

## Observabilidade

Arquivos:

- `src/newRelic.ts`
- `src/observability.ts`
- `src/otel.ts`
- `scripts/write-otel-runtime-config.mjs`

Variaveis reconhecidas:

```text
VITE_APP_ENV
VITE_APP_VERSION
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
VITE_SENTRY_DSN
VITE_SENTRY_TRACES_SAMPLE_RATE
```

Comportamento:

- `src/main.tsx` tenta subir New Relic antes do bootstrap do React
- `src/observability.ts` associa usuario ao contexto do Sentry
- `src/otel.ts` le `public/otel-runtime-config.json` e so inicializa se existir endpoint valido
- sem as envs completas, as integracoes ficam desativadas sem bloquear o app

## UI, acessibilidade e responsividade

`src/shared/components/Modal.tsx` padroniza:

- `role="dialog"`
- `aria-modal="true"`
- fechamento por `ESC`
- clique no backdrop
- foco inicial
- restauracao de foco ao fechar

Pontos acompanhados por teste:

- ausencia de scroll horizontal global em `360px`, `390px` e `768px`
- formularios longos
- agenda em mobile
- modais principais
- telas autenticadas mais criticas

## Contratos de API usados pelo front

Base URL:

```text
VITE_API_URL
```

Fallback local:

```text
http://localhost:5000
```

Endpoints consumidos:

| Metodo   | Path                                              | Uso                               |
| -------- | ------------------------------------------------- | --------------------------------- |
| `POST`   | `/api/users/authenticate`                         | login                             |
| `POST`   | `/api/users/password/reset`                       | solicitar reset                   |
| `POST`   | `/api/users/password/reset/confirm`               | confirmar reset por token         |
| `GET`    | `/api/dashboard/summary`                          | resumo dashboard                  |
| `GET`    | `/api/dashboard/notifications`                    | notificacoes do dashboard         |
| `GET`    | `/api/users/`                                     | listar usuarios                   |
| `GET`    | `/api/users/{id}`                                 | detalhe ou meu cadastro           |
| `GET`    | `/api/users/{id}/foto-perfil`                     | foto de perfil                    |
| `POST`   | `/api/users/`                                     | criar usuario                     |
| `PUT`    | `/api/users/{id}`                                 | editar usuario                    |
| `DELETE` | `/api/users/{id}`                                 | excluir usuario                   |
| `PUT`    | `/api/users/{id}/password`                        | trocar senha                      |
| `POST`   | `/api/users/{id}/arquivos`                        | upload de documento medico        |
| `DELETE` | `/api/users/{id}/arquivos/{arquivoId}`            | excluir documento medico          |
| `GET`    | `/api/pacientes/`                                 | listar pacientes                  |
| `GET`    | `/api/pacientes/{id}`                             | detalhe do paciente               |
| `POST`   | `/api/pacientes/`                                 | criar paciente                    |
| `PUT`    | `/api/pacientes/{id}`                             | editar paciente                   |
| `DELETE` | `/api/pacientes/{id}`                             | excluir paciente                  |
| `POST`   | `/api/pacientes/{id}/arquivos`                    | upload de anexo                   |
| `DELETE` | `/api/pacientes/{id}/arquivos/{arquivoId}`        | excluir anexo                     |
| `GET`    | `/api/pacientes/{id}/observacoes`                 | listar observacoes                |
| `POST`   | `/api/pacientes/{id}/observacoes`                 | criar observacao                  |
| `POST`   | `/api/pacientes/{id}/observacoes/marcar-lidas`    | marcar observacoes lidas          |
| `GET`    | `/api/faturamentos-medicos/`                      | base do faturamento medico        |
| `GET`    | `/api/grupos-medicos/`                            | listar grupos medicos             |
| `GET`    | `/api/grupos-medicos/{id}`                        | detalhe do grupo                  |
| `POST`   | `/api/grupos-medicos/`                            | criar grupo                       |
| `PUT`    | `/api/grupos-medicos/{id}`                        | editar grupo                      |
| `DELETE` | `/api/grupos-medicos/{id}`                        | excluir grupo                     |
| `GET`    | `/api/grupos-medicos/medicos`                     | medicos elegiveis por escopo      |
| `GET`    | `/api/events/`                                    | listar eventos                    |
| `GET`    | `/api/events/medical-users`                       | medicos da agenda                 |
| `GET`    | `/api/events/notification-recipients`             | usuarios e grupos permitidos      |
| `POST`   | `/api/events/notifications/mark-read`             | marcar notificacoes da agenda     |
| `POST`   | `/api/events/`                                    | criar evento                      |
| `PUT`    | `/api/events/{id}`                                | editar evento                     |
| `POST`   | `/api/events/{id}/complete`                       | concluir evento                   |
| `DELETE` | `/api/events/{id}`                                | excluir evento                    |
| `GET`    | `/api/hospitais/`                                 | lookup de hospitais               |
| `GET`    | `/api/convenios/`                                 | lookup de convenios               |
| `GET`    | `/api/opme/`                                      | lookup de fornecedores OPME       |
| `GET`    | `/api/cbhpm/`                                     | busca CBHPM                       |
| `GET`    | `/api/configuracoes-sistema/current`              | configuracao da empresa           |
| `GET`    | `/api/configuracoes-sistema/current/foto-empresa` | logo/foto da empresa              |
| `PUT`    | `/api/configuracoes-sistema/current`              | atualizar configuracao da empresa |

## Convencoes de manutencao

- use `queryKeys` para qualquer cache novo
- trate o TanStack Query como fonte unica de dados remotos; `useState` fica restrito a formularios, filtros, selecao e modais
- consuma features por seus `index.ts`; imports profundos ficam reservados ao carregamento dinamico
- mantenha containers como compositores; estado e comandos ficam em controllers/hooks e blocos visuais em componentes proprios
- centralize chamadas HTTP em `src/services`
- preserve imports pesados em `import()` quando o uso for eventual
- mantenha labels e `aria-label` em controles interativos
- ao adicionar rota nova, atualize `src/routes.ts`, `README.md` e este documento
- ao mexer em faturamento, pacientes ou agenda, rode E2E
- ao mexer em observabilidade, valide `public/otel-runtime-config.json` gerado no build
- a cobertura minima obrigatoria e de 70% para statements/lines e 60% para branches/functions
- atualizacoes patch/minor do npm sao agrupadas semanalmente pelo Dependabot; majors exigem migracao dedicada

## Organizacao de testes e estilos

- testes do cliente HTTP ficam separados em `api.auth`, `api.patients`, `api.users` e `api.settings-context`
- testes integrados do App ficam separados por sessao, agenda/configuracoes, usuarios e pacientes
- suporte E2E fica em `e2e/support`, dividido entre fixtures, builders, mock da API e assertions
- estilos de agenda e dashboard ficam em subpastas `styles`
- estilos financeiros ficam em `src/features/billing/styles`, mantendo fachadas CSS com imports ordenados

## Checklist para mudancas grandes

```powershell
npm test
npm run test:coverage
npm run lint
npm run architecture:check
npm run format:check
npm run build
npm run budget
npm run test:e2e
npm run audit:a11y
npm run analyze
npm run audit:lighthouse
```
