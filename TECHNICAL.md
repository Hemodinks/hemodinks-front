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

### Camadas e direcao de dependencias

A arquitetura usa modulos verticais por funcionalidade e quatro papeis inspirados em Clean Architecture:

1. **Dominio/dados puros**: tipos, schemas, normalizacao e regras deterministicas; nao acessa React, DOM ou HTTP.
2. **Aplicacao**: hooks e casos de uso que coordenam regras e portas de dados.
3. **Infraestrutura**: `services` HTTP e adaptadores de arquivo/telemetria.
4. **Apresentacao**: paginas, componentes e layout; delega operacoes aos hooks/casos de uso.

A direcao permitida e apresentacao -> aplicacao -> dominio, com infraestrutura injetada ou chamada pela aplicacao. `shared` e `services` nao podem depender de `app` ou `features`. O comando `npm run audit:architecture` verifica essas fronteiras e impede novos arquivos de producao acima de 550 linhas, avisando a partir de 500.

O modulo `features/reports` segue a mesma direcao: `ReportsPage` apenas compoe a tela, `useReportsPage` orquestra estado e consulta, `reportFilters` concentra regras puras e `export/` possui os adaptadores PDF/XLSX. A rota `/relatorios` herda a autorizacao de faturamento (`canAccessReports = canAccessBilling`).

## Estrutura

```text
src/
  app/            # AppContent, appAccess.ts, lazyModules.tsx, appViewMeta
  features/
    auth/ billing/ calculator/ clinics/ dashboard/ events/ legal/
    medicalGroups/ patients/ privacy/ reports/ settings/ tutorials/ users/
  layout/         # Sidebar, ContextualTools, contextualFlows
  services/       # api.ts + *Service.ts
  shared/
    components/   # ui.tsx (barrel), ui/*, Modal, DateInput, ComboboxField, filtros
    export/       # infraestrutura comum de PDF/XLSX
    hooks/ navigation/ privacy/ utils/
    queryKeys.ts  surgeryType.ts  surgeryStatus.ts
  types/
  routes.ts
  styles/
```

Responsabilidades:

| Caminho | Responsabilidade |
| --- | --- |
| `src/services/api.ts` | cliente HTTP centralizado com axios, tratamento comum de erros e auth bearer |
| `src/services/*Service.ts` | contratos por endpoint/modulo |
| `src/app/AppContent.tsx` | composicao de navegacao, permissoes e dominios |
| `src/features/auth/useLoginFlow.ts` | caso de uso de login, identificacao de equipe e reset de senha |
| `src/features/auth/useSessionLifecycle.ts` | expiracao da sessao e hidratacao da licenca medica |
| `src/app/useAppChrome.ts` | dashboard summary, notificacoes e configuracao do sistema |
| `src/routes.ts` | mapeamento entre `AppView` e paths da SPA |
| `src/queryClient.ts` | configuracao global do TanStack Query |
| `src/newRelic.ts` | inicializacao opcional do Browser agent do New Relic |
| `src/shared/queryKeys.ts` | chaves padronizadas de cache |
| `src/shared/components/ui.tsx` | API publica (barrel) das primitivas de UI reutilizadas |
| `src/shared/components/ui/*` | implementacoes coesas das primitivas de UI |
| `src/features/patients/export/*` | schemas puros e adaptadores PDF/XLSX de pacientes |
| `src/features/reports/*` | relatorios: `useReportsPage`, `reportFilters`, `reportData` e `export/` |
| `src/shared/surgeryType.ts` / `surgeryStatus.ts` | tipo e status da cirurgia (mesma regra da API) e opcoes dos filtros |
| `src/shared/navigation/appModules.ts` | titulos, rotulos e icones dos modulos (apresentacao) |
| `src/features/tutorials/*` | missoes Driver.js, narracao e biblioteca de videos |
| `src/features/patients/usePatientFileActions.ts` | estado e ações de anexos isolados do domínio principal |
| `src/features/billing/billingTypes.ts` | contratos puros do faturamento |
| `src/features/billing/billingAnalytics.ts` | filtros, totais e agrupamentos financeiros puros |
| `src/features/billing/billingHistory.ts` | agrupamento por ano/mes e destaques de maior/menor faturamento trimestral |
| `src/features/billing/BillingHistoryPage.tsx` | consulta historica, accordions e arquivos vinculados aos meses |
| `src/features/billing/BillingHistoryInsights.tsx` | dashboard trimestral, graficos e resumos financeiros mensais |
| `src/features/settings/MonitoringPage.tsx` | consulta paginada e limpeza dos logs tecnicos da clinica |
| `src/layout/contextualFlows.ts` | conteudo do menu contextual "Como usar" por tela |
| `src/shared/utils/dateFormatters.ts` | conversões e validações de datas sem dependência visual |
| `src/types/*` | contratos de domínio separados, reexportados por `src/types.ts` |
| `src/shared/components/ErrorBoundary.tsx` | fallback visual para erros inesperados |
| `src/layout` | App shell, sidebar, topbar e navegacao global |

## Rotas e navegacao

Rotas publicas:

| Path | Uso |
| --- | --- |
| `/` | login (selecao de clinica e equipe) ou redirecionamento para dashboard |
| `/reset-password?token=...` | confirmacao de reset de senha |
| `/termos-de-uso` | Termos de Uso |
| `/politica-de-privacidade` | Politica de Privacidade |

Rotas internas (`src/routes.ts`; acesso calculado em `src/app/appAccess.ts` e distribuído às telas autenticadas por
`AppAccessProvider`/`useAppAccess()` em `src/app/AppAccessContext.tsx`, sem fallback permissivo fora do provider):

| Path | View interna | Quem ve |
| --- | --- | --- |
| `/dashboard` | `dashboard` | quem tem a licenca `Dashboard.Visualizar` (medico sempre) |
| `/usuarios` | `users` | Administrador, SuperAdministrador e Equipe, com modulo `usuarios` |
| `/meu-cadastro` | `profile` | Medico e Paciente |
| `/pacientes` | `patients` | licenca `Pacientes.Visualizar` (medico sempre) e modulo `pacientes`; Paciente e equipe sem operador em leitura |
| `/faturamento-medico` | `billing` | Administrador, SuperAdministrador, Medico, Controller e Equipe com modulo `faturamento` |
| `/historico-faturamento` | `billingHistory` | mesmas regras do faturamento |
| `/relatorios` | `reports` | mesmas regras do faturamento |
| `/tutoriais-interativos` | `tutorials` | qualquer sessao |
| `/grupos-medicos` | `medicalGroups` | Administrador, SuperAdministrador e Controller, com modulo `grupos-medicos` |
| `/agenda` | `agenda` | todos os perfis com modulo `agenda` |
| `/opcoes` | `settings` | Administrador e SuperAdministrador; `/configuracoes` permanece como alias legado |
| `/clinicas` | `clinics` | Administrador (propria clinica) e SuperAdministrador |

O SuperAdministrador ignora o plano `Parcial` na interface; os demais perfis so veem modulos contratados.
A exclusao de pacientes aparece apenas para Administrador e SuperAdministrador (a API tambem permite ao Medico).

`useRouteView` sincroniza URL, permissoes e view ativa. Se a rota nao for permitida para o perfil atual, a aplicacao redireciona para uma view valida.

Formularios com rota propria (#202): pacientes, usuarios e grupos medicos usam `<base>/novo` (cadastro) e `<base>/<id>`
(edicao/visualizacao), por exemplo `/pacientes/novo` e `/pacientes/42`. A URL e a fonte de verdade de `moduleMode` e do
registro aberto (`parseModuleRoute`/`getFormPath` em `src/routes.ts`); por isso voltar/avancar, recarregar e link compartilhado
reabrem a mesma tela. Regras:

- a sub-rota herda a permissao do modulo; segmento invalido (`/pacientes/abc`, `/pacientes/0`, `/agenda/novo`) e rota
  desconhecida e cai no fallback;
- `<base>/novo` exige tambem permissao de criar (`canCreatePatients`, `canCreateUsers`); sem ela abre a lista do modulo, antes de renderizar o formulario;
- o formulario e aberto uma vez por rota por `useFormRouteSync`; se o registro da URL nao puder ser carregado, volta para a
  lista com o erro (nunca deixa um formulario vazio numa URL de edicao);
- troca de clinica e logout navegam para o painel e limpam o cache; a API continua sendo a barreira de acesso ao registro;
- `/meu-cadastro` segue sendo o proprio formulario do usuario logado;
- `public/staticwebapp.config.json` aplica `noindex` e `no-cache` tambem em `/pacientes/*`, `/usuarios/*` e `/grupos-medicos/*`.

## Autenticacao, reset e sessao

`useAuthSession` controla a sessao do usuario:

- o token JWT fica apenas em memoria do React; nunca em `localStorage`/`sessionStorage`
- o hook remove `hemodinks.session` legado do `localStorage` ao iniciar
- ao recarregar a pagina, `POST /api/session/restaurar` recupera a sessao pelo cookie `HttpOnly` quando ela ainda esta ativa no servidor
- `POST /api/session/renovar` (ou `/renovar-equipe`) renova o JWT antes do vencimento; `/api/session/atividade` registra interacao local no maximo uma vez por minuto; abas compartilham sinais via BroadcastChannel e Web Locks
- `POST /api/session/sair` revoga a sessao; trocar de clinica (`/api/session/selecionar-clinica`) limpa o `queryClient`

Fluxos suportados:

- contexto do login por `POST /api/users/login-context` e login por `POST /api/users/authenticate`
- identificacao do operador da equipe por `POST /api/equipe-auth/identificar` (selecao ou PIN)
- senha temporaria concluida por `POST /api/users/password/temporary/complete`
- troca de e-mail com confirmacao (`/api/users/email/change*`)
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

Observacoes:

- invalidacoes devem usar `queryKeys`, nunca arrays soltos
- `useAppChrome` mantem `systemSettings` com `staleTime` de 5 minutos e leitura sem token
- a tela de faturamento usa query propria (`billingRecords`) porque agrega todas as paginas de `GET /api/faturamentos-medicos`
- o historico reutiliza os registros agregados de faturamento e mantem uma query separada (`billingHistoryFiles`) para documentos mensais, ambas com `staleTime` de 30 segundos

## Modulos

### Dashboard

Arquivos principais:

- `src/features/dashboard/DashboardPage.tsx`
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
- `src/features/patients/usePatientLookups.ts`
- `src/features/patients/useCbhpmLookup.ts`
- `src/features/patients/PatientObservacoesModal.tsx`
- `src/features/patients/usePatientExport.ts` e `export/`

Responsabilidades:

- listagem, busca, filtros e paginacao
- formulario clinico/administrativo
- convenios, hospitais, fornecedores OPME e medicos como lookups
- procedimentos CBHPM e procedimentos associados
- upload de arquivos do paciente
- observacoes com resposta e marcacao de leitura
- filtros por tipo da cirurgia e status da cirurgia (`statusCirurgia`: Todas / Consolidadas / Não consolidadas), enviados a API
- indicador do status no cadastro: consolidada quando a data da consolidacao esta preenchida
- exportacao XLSX/PDF da listagem e da ficha

### Faturamento medico

Arquivos principais:

- `src/features/billing/BillingPage.tsx`
- `src/features/billing/BillingHistoryPage.tsx`
- `src/features/billing/BillingHistoryInsights.tsx`
- `src/features/billing/billingHistory.ts`
- `src/features/billing/billingAnalytics.ts`
- `src/services/billingService.ts`

Responsabilidades:

- ler `GET /api/faturamentos-medicos`
- agregar todos os resultados por filtro
- transformar dados de pacientes em indicadores financeiros
- detalhar cirurgia, glosa, anexos, procedimento e checklist
- organizar o historico por ano e pelos 12 meses da data de atendimento
- manter somente um accordion mensal aberto por vez
- exibir, no mes aberto, total bruto, glosas, liquido, atendimentos pagos e pendentes
- calcular o maior e o menor faturamento de cada trimestre por ano; empates usam a quantidade de registros como criterio secundario
- aplicar verde claro ao maior mes e vermelho claro ao menor mes do trimestre, tanto no dashboard quanto no accordion correspondente
- alternar entre as abas `Historico` e `Graficos`, com selecao do ano analisado
- apresentar grafico de barras com faturamento mensal e grafico circular com participacao trimestral no total anual
- fornecer tooltips por mouse e teclado com ano, mes, trimestre, valor e percentual
- listar, enviar, baixar e excluir arquivos associados ao ano/mes; envio e exclusao dependem de perfil administrativo ou controller

Os graficos sao implementados sem biblioteca externa. As barras usam HTML/CSS e o grafico circular usa setores SVG com `strokeDasharray`, permitindo que toda a fatia seja interativa. Trimestres zerados permanecem consultaveis pela legenda, mas nao criam uma fatia invisivel. Os dados exibidos sao derivados dos mesmos `BillingRecord` usados pela tabela, evitando divergencia entre indicadores, graficos e detalhamento.

### Relatorios

Arquivos principais:

- `src/features/reports/ReportsPage.tsx`, `useReportsPage.ts`, `reportFilters.ts`, `reportData.ts`
- `src/features/reports/export/*`

Responsabilidades:

- carregar a base de faturamento (`loadBillingPatients`) com tipo e status da cirurgia enviados a API
- filtros combinados (periodo, medico, convenio, hospital, procedimento, situacao, tipo e status da cirurgia)
- resumo, lista detalhada e exportacao PDF/XLSX com a linha de contexto dos filtros

### Clinicas e equipes

- `src/features/clinics/*`: CRUD de clinicas (SuperAdministrador), dados da propria clinica (Administrador), plano, modulos, identidade visual e equipes (`/api/platform/clinicas/*`)

### Tutoriais, ajuda e calculadora

- `src/features/tutorials/*`: 12 missoes Driver.js e biblioteca em `/tutoriais-interativos` (ver `TUTORIALS.md`)
- `src/layout/ContextualTools.tsx` e `contextualFlows.ts`: ajuda "Como usar" e calculadora

### LGPD

- `src/features/legal/*` e `src/features/privacy/*`: aceite dos termos (`/api/legal-acceptances/current`), preferencias de privacidade e consentimento de analise antes do New Relic

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

- `src/features/events/AgendaPage.tsx`

Responsabilidades:

- visoes mensal, semanal e lista (`agendaViews.ts`), com eventos de dia inteiro
- CRUD de eventos e envio de e-mail do evento (`/api/events/{id}/email-notification`)
- notificacao para usuario, perfil medico, usuarios especificos e grupos medicos
- contadores de notificacao nao lida
- marcacao de notificacoes da agenda como lidas

### Opcoes, tema e monitoramento

Arquivos principais:

- `src/features/settings/OptionsPage.tsx`
- `src/features/settings/SystemSettingsPage.tsx`
- `src/features/settings/MonitoringPage.tsx`
- `src/shared/hooks/useThemePreference.ts`
- `src/services/monitoringService.ts`

Responsabilidades:

- navegacao interna entre `Configuracoes` e `Monitoramento`
- tema claro/escuro, com tema escuro como fallback inicial quando ainda nao existe `hemodinks.theme` no `localStorage`
- persistencia da escolha explicita do usuario, inclusive do tema claro
- troca de senha
- consulta paginada dos erros tecnicos da clinica, com 25 registros por pagina
- eventos de seguranca (`/api/monitoramento/seguranca`)
- exibicao de modulo, descricao, timestamp, metodo, linha, usuario, operacao de banco, request ID e fluxo de classes
- exibicao opcional da query relacionada dentro de `details`
- atualizacao manual da listagem e limpeza confirmada dos logs atuais; novos erros continuam sendo registrados

## Observabilidade

Arquivos:

- `src/newRelic.ts`

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
```

Comportamento:

- `src/main.tsx` tenta subir New Relic antes do bootstrap do React
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
- contraste WCAG 2 AA no tema escuro, incluindo acoes globais e estados selecionados
- tooltips dos graficos acessiveis por mouse, foco de teclado e rotulos para tecnologia assistiva
- conteudo contextual de `Como usar` para Historico, Graficos e Monitoramento

O tema escuro usa tons de acao mais fechados para manter contraste minimo de `4.5:1` em textos pequenos. Os setores do grafico circular possuem pontos focaveis, e as barras mensais tambem entram na ordem de tabulacao.

### Ajuda contextual "Como usar"

`src/layout/ContextualFlowDrawer.tsx` renderiza uma gaveta de ajuda conforme a `AppView` ativa. O conteudo declarativo fica em `src/layout/contextualFlows.ts`, separado dos componentes funcionais para permitir revisao e teste sem acoplar regras de interface.

Na view `billingHistory`, a ajuda cobre consulta mensal, destaques trimestrais, graficos/tooltips e arquivos. Na view `settings`, cobre tema, senha, consulta do monitoramento e limpeza de logs. O drawer mantem somente um topico aberto por vez e pode apresentar missoes interativas quando a tela possui tutorial registrado.

## Contratos de API usados pelo front

Base URL:

```text
VITE_API_URL
```

Fallback local:

```text
http://localhost:5000
```

Endpoints consumidos (extraidos de `src/services` e `src/features`):

| Area | Metodo | Path |
| --- | --- | --- |
| Sessao | `POST` | `/api/session/atividade` |
| Sessao | `POST` | `/api/session/renovar` |
| Sessao | `POST` | `/api/session/renovar-equipe` |
| Sessao | `POST` | `/api/session/restaurar` |
| Sessao | `POST` | `/api/session/sair` |
| Sessao | `POST` | `/api/session/selecionar-clinica` |
| Usuarios e autenticacao | `GET` | `/api/users` |
| Usuarios e autenticacao | `POST` | `/api/users` |
| Usuarios e autenticacao | `POST` | `/api/users/authenticate` |
| Usuarios e autenticacao | `POST` | `/api/users/email/change` |
| Usuarios e autenticacao | `POST` | `/api/users/email/change/cancel` |
| Usuarios e autenticacao | `POST` | `/api/users/email/change/confirm` |
| Usuarios e autenticacao | `POST` | `/api/users/login-context` |
| Usuarios e autenticacao | `POST` | `/api/users/password/reset` |
| Usuarios e autenticacao | `POST` | `/api/users/password/reset/confirm` |
| Usuarios e autenticacao | `POST` | `/api/users/password/temporary/complete` |
| Usuarios e autenticacao | `GET` | `/api/users/{id}` |
| Usuarios e autenticacao | `PUT` | `/api/users/{id}` |
| Usuarios e autenticacao | `DELETE` | `/api/users/{id}` |
| Usuarios e autenticacao | `POST` | `/api/users/{id}/arquivos` |
| Usuarios e autenticacao | `DELETE` | `/api/users/{id}/arquivos/{id}` |
| Usuarios e autenticacao | `GET` | `/api/users/{id}/arquivos/{id}/download` |
| Usuarios e autenticacao | `GET` | `/api/users/{id}/foto-perfil` |
| Usuarios e autenticacao | `PUT` | `/api/users/{id}/password` |
| Usuarios e autenticacao | `PUT` | `/api/users/{id}/password/reset` |
| Equipes | `POST` | `/api/equipe-auth/identificar` |
| Equipes | `PUT` | `/api/equipe-auth/pin` |
| Equipes | `GET` | `/api/equipes` |
| Clinicas (plataforma) | `GET` | `/api/platform/clinicas` |
| Clinicas (plataforma) | `POST` | `/api/platform/clinicas` |
| Clinicas (plataforma) | `GET` | `/api/platform/clinicas/{id}` |
| Clinicas (plataforma) | `PUT` | `/api/platform/clinicas/{id}` |
| Clinicas (plataforma) | `DELETE` | `/api/platform/clinicas/{id}` |
| Clinicas (plataforma) | `GET` | `/api/platform/clinicas/{id}/equipes` |
| Clinicas (plataforma) | `GET` | `/api/platform/clinicas/{id}/equipes/usuarios` |
| Clinicas (plataforma) | `PUT` | `/api/platform/clinicas/{id}/equipes/{id}` |
| Clinicas (plataforma) | `POST` | `/api/platform/clinicas/{id}/equipes/{id}/membros` |
| Clinicas (plataforma) | `DELETE` | `/api/platform/clinicas/{id}/equipes/{id}/membros/{id}` |
| Clinicas (plataforma) | `POST` | `/api/platform/clinicas/{id}/equipes/{id}/operadores/{id}/pin` |
| Clinicas (plataforma) | `GET` | `/api/public/clinicas` |
| Clinicas (plataforma) | `GET` | `/api/public/clinicas/{slug}/foto` |
| Identidade visual | `GET` | `/api/configuracoes-sistema/current` |
| Identidade visual | `GET` | `/api/configuracoes-sistema/current/foto-empresa` |
| LGPD | `GET` | `/api/legal-acceptances/current` |
| LGPD | `POST` | `/api/legal-acceptances/current` |
| LGPD | `GET` | `/api/privacy-preferences/current` |
| LGPD | `PUT` | `/api/privacy-preferences/current` |
| Licenca | `GET` | `/api/licencas/current` |
| Dashboard | `GET` | `/api/dashboard/notifications` |
| Dashboard | `GET` | `/api/dashboard/summary` |
| Pacientes e cirurgias | `GET` | `/api/pacientes` |
| Pacientes e cirurgias | `POST` | `/api/pacientes` |
| Pacientes e cirurgias | `GET` | `/api/pacientes/{id}` |
| Pacientes e cirurgias | `PUT` | `/api/pacientes/{id}` |
| Pacientes e cirurgias | `DELETE` | `/api/pacientes/{id}` |
| Pacientes e cirurgias | `POST` | `/api/pacientes/{id}/arquivos` |
| Pacientes e cirurgias | `DELETE` | `/api/pacientes/{id}/arquivos/{id}` |
| Pacientes e cirurgias | `GET` | `/api/pacientes/{id}/arquivos/{id}/download` |
| Pacientes e cirurgias | `GET` | `/api/pacientes/{id}/observacoes` |
| Pacientes e cirurgias | `POST` | `/api/pacientes/{id}/observacoes` |
| Pacientes e cirurgias | `POST` | `/api/pacientes/{id}/observacoes/marcar-lidas` |
| Faturamento medico | `GET` | `/api/faturamentos-medicos` |
| Faturamento medico | `GET` | `/api/faturamentos-medicos/historico/arquivos` |
| Faturamento medico | `DELETE` | `/api/faturamentos-medicos/historico/arquivos/{id}` |
| Faturamento medico | `GET` | `/api/faturamentos-medicos/historico/arquivos/{id}/download` |
| Faturamento medico | `POST` | `/api/faturamentos-medicos/historico/{id}/{id}/arquivos` |
| Grupos medicos | `GET` | `/api/grupos-medicos` |
| Grupos medicos | `POST` | `/api/grupos-medicos` |
| Grupos medicos | `GET` | `/api/grupos-medicos/medicos` |
| Grupos medicos | `GET` | `/api/grupos-medicos/{id}` |
| Grupos medicos | `PUT` | `/api/grupos-medicos/{id}` |
| Grupos medicos | `DELETE` | `/api/grupos-medicos/{id}` |
| Agenda | `GET` | `/api/events` |
| Agenda | `POST` | `/api/events` |
| Agenda | `GET` | `/api/events/medical-users` |
| Agenda | `GET` | `/api/events/notification-recipients` |
| Agenda | `POST` | `/api/events/notifications/mark-read` |
| Agenda | `PUT` | `/api/events/{id}` |
| Agenda | `DELETE` | `/api/events/{id}` |
| Agenda | `POST` | `/api/events/{id}/complete` |
| Agenda | `GET` | `/api/events/{id}/email-notification` |
| Agenda | `POST` | `/api/events/{id}/email-notification` |
| Catalogos (lookups) | `GET` | `/api/cbhpm` |
| Catalogos (lookups) | `GET` | `/api/convenios` |
| Catalogos (lookups) | `GET` | `/api/hospitais` |
| Catalogos (lookups) | `GET` | `/api/opme` |
| Opcoes e monitoramento | `GET` | `/api/monitoramento/erros` |
| Opcoes e monitoramento | `DELETE` | `/api/monitoramento/erros` |
| Opcoes e monitoramento | `GET` | `/api/monitoramento/seguranca` |
| Infraestrutura | `GET` | `/api/warmup` |

`systemSettingsService.updateSystemSettings` ainda chama `PUT /api/configuracoes-sistema/current`, que a API nao
expoe mais; a funcao nao e usada pela interface (nome e foto pertencem a clinica, em `/api/platform/clinicas/{id}`).

## Convencoes de manutencao

- use `queryKeys` para qualquer cache novo
- centralize chamadas HTTP em `src/services`
- preserve imports pesados em `import()` quando o uso for eventual
- mantenha labels e `aria-label` em controles interativos
- ao adicionar rota nova, atualize `src/routes.ts`, `src/app/appAccess.ts`, `README.md` e este documento
- nao implemente regra diferente da API para o mesmo requisito (ex.: `surgeryStatus.ts` espelha a derivacao do backend)
- ao mexer em faturamento, pacientes ou agenda, rode E2E

## Checklist para mudancas grandes

```powershell
npm run verify
npm run budget
npm run test:e2e
npm run test:e2e:responsive
npm run audit:a11y
npm run analyze
npm run audit:lighthouse
```
