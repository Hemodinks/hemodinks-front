# Hemodinks Front

SPA React/Vite do Hemodinks para operacao assistencial e administrativa. O front cobre autenticacao multiclinica (incluindo equipes), redefinicao de senha, dashboard, usuarios, meu cadastro, pacientes/cirurgias, observacoes, faturamento medico, historico e relatorios, grupos medicos, agenda/notificacoes, tutoriais interativos, opcoes/monitoramento e administracao de clinicas.

## Stack

- React 19
- TypeScript
- Vite 7
- React Router 7
- TanStack Query 5 (sem store global)
- axios (somente via `src/services/api.ts`)
- Vitest 4 + Testing Library
- Playwright 1.60 + axe-core (E2E, matriz responsiva e E2E com API real)
- Driver.js para tutoriais interativos
- lucide-react
- jsPDF + jsPDF AutoTable carregados sob demanda
- New Relic Browser opcional para observabilidade
- Lighthouse CI e bundle analyzer para auditoria

## Mapa da documentacao

- `README.md`: onboarding rapido, stack, rotas e fluxo de desenvolvimento
- `TECHNICAL.md`: arquitetura, contratos de API e convencoes de manutencao
- `DEPLOYMENT.md`: deploy, ambientes, CORS e checklist operacional
- `TUTORIALS.md`: autoria, Azure Speech, áudio incremental, Playwright e gravação dos tutoriais
- `AGENTS.md`: regras para agentes de codigo (invariantes, comandos e escopo)
- `docs/`: registros de issues, QA, redesigns e auditorias (historico)
- Matriz de perfis x permissoes: `hemodinks-api/docs/MATRIZ_PERFIS_PERMISSOES.md`

## URLs

| Recurso | URL |
| --- | --- |
| Front local | `http://localhost:5173` |
| Front producao | `https://hemodinks.gestao-saude.tec.br` |
| Front homologacao | `https://hemodinks-homologacao.gestao-saude.tec.br` (Vercel, branch `developer`) |
| API local | `http://localhost:5000` |
| API homologacao | `https://hemodinks-api-1-90nb.onrender.com` |
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
```

Exemplo confirmation:

```powershell
Copy-Item .env.confirmation.example .env.local
```

Observacoes:

- No login multi-clinica, o front consulta as clinicas ativas, exige uma selecao e envia o `X-Clinica-Slug` escolhido apenas para autenticar.
- Em chamadas autenticadas, o tenant vem dos claims `clinicaId` e `clinicaSlug` do JWT. A troca usa `/api/session/selecionar-clinica` e substitui o token.
- Se o front estiver em um dominio customizado por clinica, como `clinica-a.seudominio.com`, o client tambem tenta inferir o slug pela URL. Hosts compartilhados de plataforma, como `onrender.com` e `vercel.app`, sao ignorados nessa inferencia para evitar falsos positivos.
- `VITE_NEW_RELIC_BEACON` e `VITE_NEW_RELIC_ERROR_BEACON` sao avancadas. Se ficarem vazias, o app usa `bam.nr-data.net`.

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
| `npm test` | roda testes unitarios e de integracao (Vitest) |
| `npm run verify` | `audit:architecture` + testes + build (obrigatorio quando mexer em mais de um modulo) |
| `npm run audit:architecture` | limite de 550 linhas e fronteiras `shared/`/`services/` |
| `npm run test:e2e` | roda testes E2E com Playwright |
| `npm run test:e2e:responsive` | E2E em 390, 820 e 1440 px |
| `npm run test:e2e:real` | E2E contra a API real e SQL sintetico (ver `docs/real-api-e2e.md`) |
| `npm run tutorial:*` / `record:tutorials*` | producao de audio e videos dos tutoriais (ver `TUTORIALS.md`) |
| `npm run preview` | serve o build gerado em `dist` |

## Rotas

| Rota | Uso |
| --- | --- |
| `/` | login ou redirecionamento para dashboard quando a sessao existe |
| `/reset-password?token=...` | confirmacao de reset de senha por token |
| `/termos-de-uso` | documento público de Termos de Uso |
| `/politica-de-privacidade` | documento público de Política de Privacidade |
| `/dashboard` | painel inicial (`/` redireciona quando ha sessao) |
| `/usuarios` | listagem e cadastro de usuarios (`/usuarios/novo`, `/usuarios/<id>`) |
| `/meu-cadastro` | autoatendimento do medico ou paciente |
| `/pacientes` | pacientes/cirurgias: listagem, cadastro (`/pacientes/novo`, `/pacientes/<id>`), observacoes, filtros (tipo e status da cirurgia) e exportacoes |
| `/faturamento-medico` | leitura financeira consolidada a partir dos pacientes |
| `/historico-faturamento` | histórico mensal, destaques trimestrais, gráficos e arquivos de faturamento |
| `/relatorios` | relatorios analiticos com filtros e exportacao PDF/XLSX |
| `/tutoriais-interativos` | biblioteca de videos e missoes guiadas |
| `/grupos-medicos` | grupos de medicos usados em notificacoes da agenda (`/grupos-medicos/novo`, `/grupos-medicos/<id>`) |
| `/agenda` | agenda e notificacoes internas |
| `/opcoes` (alias `/configuracoes`) | configurações da conta e monitoramento técnico de erros |
| `/clinicas` | SuperAdministrador: CRUD, identidade visual, troca de clinica e painel de usuarios online (sessoes ativas de todas as clinicas); Administrador: a propria clinica e suas equipes |

## Perfis e acesso

| Perfil | Acesso principal no menu |
| --- | --- |
| Administrador | painel, usuarios, pacientes (inclui exclusao), faturamento/historico/relatorios, grupos medicos, agenda, clinica propria e opcoes |
| SuperAdministrador | tudo do Administrador, CRUD de clinicas, troca de clinica, usuarios online e modulos nao contratados |
| Medicos | painel, meu cadastro, pacientes, faturamento/historico/relatorios e agenda |
| Controller | pacientes (licenca), faturamento/historico/relatorios, grupos medicos e agenda |
| Equipe | usuarios (membros), pacientes, faturamento/historico/relatorios e agenda; sem operador identificado fica somente leitura |
| Pacientes | meu cadastro, pacientes em modo leitura e agenda |

Todos os perfis veem os tutoriais interativos. Itens operacionais dependem do modulo contratado no plano `Parcial`.
O front e apenas UX: a autorizacao e da API (matriz completa em `hemodinks-api/docs/MATRIZ_PERFIS_PERMISSOES.md`).

## Funcionalidades

- login com JWT por clinica, selecao de clinica e identificacao de operador de equipe (selecao ou PIN)
- token apenas em memoria; renovacao pelo cookie `HttpOnly` (`/api/session/renovar`), atividade entre abas e logout
- troca obrigatoria de senha no primeiro acesso
- reset de senha por email/token quando a API publica esse fluxo
- dashboard com resumo, notificacoes e contadores operacionais
- CRUD de usuarios com foto de perfil e anexos do cadastro medico
- tela "Meu cadastro" para medico e paciente
- CRUD de pacientes/cirurgias com vinculo medico, convenio, hospital, OPME, procedimentos CBHPM, tipo da cirurgia e status (consolidada quando a data da consolidacao esta preenchida)
- observacoes por paciente com leitura, resposta e contadores de nao lidas
- exportacao de pacientes, faturamento e relatorios em XLSX e PDF no navegador, respeitando os filtros (inclusive tipo e status da cirurgia)
- relatorios analiticos com filtros combinados
- faturamento medico derivado dos dados de pacientes e procedimentos
- histórico de faturamento por data de atendimento, com dashboard trimestral, gráfico de barras mensal e gráfico circular trimestral
- destaques verde/vermelho para maior e menor faturamento de cada trimestre e composição financeira no accordion mensal
- tooltips acessíveis nos gráficos e arquivos vinculados por ano/mês
- grupos medicos usados como destinatarios de notificacao
- agenda com eventos, lembretes e notificacoes internas
- configuracao do nome e da foto no CRUD exclusivo de clinicas
- tema claro/escuro, iniciando no escuro quando ainda não existe preferência salva
- monitoramento técnico paginado com inspeção de fluxo, query e limpeza confirmada dos logs
- calculadora e ajuda contextual (`ContextualTools`)
- tutoriais interativos com Driver.js, narração em MP3 estático (fallback Web Speech) e biblioteca de vídeos
- Error Boundary com fallback visual
- observabilidade opcional via New Relic Browser
- consentimento versionado para preferências locais e observabilidade opcional, sem bloquear a sessão necessária

## Arquitetura resumida

```text
src/
  app/            # orquestracao, permissoes (appAccess.ts), rotas lazy
  features/
    auth/ billing/ calculator/ clinics/ dashboard/ events/ legal/
    medicalGroups/ patients/ privacy/ reports/ settings/ tutorials/ users/
      export/     # schemas e exportadores PDF/XLSX por dominio
  layout/         # Sidebar, ContextualTools
  services/       # HTTP e sessao (api.ts); nunca axios direto em componente
  shared/
    components/   # ui.tsx, Modal, DateInput, ComboboxField, filtros
    export/       # infraestrutura comum de exportacao
    navigation/   # APP_MODULES (apresentacao)
  routes.ts       # VIEW_PATHS
  styles/
```

Pontos principais:

- `src/app/AppContent.tsx` compoe regras de acesso, navegacao e dominios; login e ciclo de sessao ficam em hooks de aplicacao dedicados.
- `src/features/auth/useLoginFlow.ts` coordena login, equipe e reset de senha.
- `src/features/auth/useSessionLifecycle.ts` isola expiracao do token e hidratacao de licenca.
- `src/app/useAppChrome.ts` carrega resumo, notificacoes e configuracao do sistema.
- `src/features/auth/useAuthSession.ts` limpa `localStorage` e mantem a sessao apenas em memoria.
- `src/queryClient.ts` define `staleTime`, `gcTime` e retries globais.
- `src/shared/queryKeys.ts` centraliza chaves de cache.
- `src/features/patients/usePatientsDomain.ts` coordena formulario, listagem, lookups, observacoes e exportacoes.
- `src/features/patients/export` separa schema de dados, escrita XLSX, PDFs e disparo de download.
- `src/features/patients/usePatientFileActions.ts` isola seleção, validação e abertura de anexos.
- `src/features/billing/billingAnalytics.ts` mantém filtros e consolidações financeiras como funções puras.
- `src/features/billing/billingHistory.ts` agrupa os registros por data de atendimento e calcula os destaques trimestrais.
- `src/features/billing/BillingHistoryPage.tsx` coordena abas, accordions e arquivos mensais; `BillingHistoryInsights.tsx` renderiza dashboard, gráficos, tooltips e composição do mês.
- `src/types.ts` preserva a API pública enquanto contratos extensos são divididos em `src/types`.
- `src/features/users/useUsersDomain.ts` cobre listagem, autoedicao, upload de arquivos e troca de senha.
- `src/features/billing/BillingPage.tsx` compoe a tela financeira a partir de `GET /api/faturamentos-medicos`.
- `src/features/settings/OptionsPage.tsx` alterna entre configurações e monitoramento; `SystemSettingsPage.tsx` administra tema e senha, e `MonitoringPage.tsx` apresenta os erros técnicos da clínica.
- `src/newRelic.ts` inicializa a telemetria opcional (New Relic Browser), após consentimento de análise.

Mais detalhes em [TECHNICAL.md](./TECHNICAL.md).

Guarda arquitetural: `npm run audit:architecture`. Validacao completa local: `npm run verify`, `npm run test:e2e` e, se mudou visual, `npm run test:e2e:responsive`.

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
- o histórico reutiliza essa visão agregada e consulta os documentos mensais separadamente por `billingHistoryFiles`
- a tela de notificacoes marca avisos da agenda como lidos via `POST /api/events/notifications/mark-read`
- a confirmacao de reset envia `Idempotency-Key` em `POST /api/users/password/reset/confirm`

## Testes e qualidade

Suite principal:

```powershell
npm run verify
npm run budget
npm run test:e2e
npm run audit:a11y
npm run analyze
npm run audit:lighthouse
npm run test:performance
```

`audit:lighthouse` gera um build de produção para auditoria com API fictícia local
em `127.0.0.1:5199`, restaura uma sessão sintética pelo fluxo existente e mede
dashboard, usuários, pacientes e agenda. Não utiliza a API configurada em `.env`.
O servidor local serve assets com gzip; os relatórios ficam em `reports/lighthouse`.
`test:performance` verifica o budget e os contratos dos dados fictícios.

Cobertura atual inclui:

- testes unitarios e de integracao para `App`, `api.ts`, utilitarios de pacientes e faturamento
- E2E de login, reset, navegacao autenticada e regras por perfil
- E2E de usuarios, pacientes, agenda, tutoriais e matriz responsiva (390/820/1440)
- E2E com API real e SQL sintetico no CI (`Web + real API E2E`)
- axe para acessibilidade seria/critica
- Lighthouse autenticado via LHCI
- budget de bundle e analise visual do build

## Deploy

Producao: Azure Static Web Apps (deploy pelo CI na `main`). Homologacao: Vercel a partir da `developer`. Detalhes e checklist em [DEPLOYMENT.md](./DEPLOYMENT.md).

## Tutoriais interativos

Existem 12 missoes em `src/features/tutorials/configs/` (login e clinica, cadastro de clinica, equipe e identificacao,
cadastro de paciente, cirurgia, gestao de faturamento, relatorios, exportacao, pesquisa Full-Text, usuarios e perfis,
troca de clinica, agenda e notificacoes), acessiveis em `/tutoriais-interativos` e pela ajuda contextual. Autoria,
narracao (Azure Speech/Piper), gravacao e publicacao dos videos estao em [TUTORIALS.md](./TUTORIALS.md).
