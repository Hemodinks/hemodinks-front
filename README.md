# Hemodinks Front

SPA React/Vite do Hemodinks para operacao assistencial e administrativa. O front cobre autenticacao multiclinica, redefinicao de senha, dashboard, usuarios, meu cadastro, pacientes, observacoes, faturamento medico, grupos medicos, agenda/notificacoes, configuracao da conta e administracao de clinicas.

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
| Front homologacao | `https://hemodinks-homologacao.gestao-saude.tec.br` |
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

- No login multi-clinica, o front consulta as clinicas ativas, exige uma selecao e envia o `X-Clinica-Slug` escolhido apenas para autenticar.
- Em chamadas autenticadas, o tenant vem dos claims `clinicaId` e `clinicaSlug` do JWT. A troca usa `/api/session/selecionar-clinica` e substitui o token.
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
| `/configuracoes` | tema e troca de senha |
| `/clinicas` | CRUD, identidade visual e troca segura de clinica para SuperAdministrador |

## Perfis e acesso

| Perfil | Acesso principal |
| --- | --- |
| Administrador | dashboard, usuarios, pacientes, faturamento, grupos medicos, agenda e configuracoes |
| SuperAdministrador | todos os modulos administrativos, CRUD de clinicas e troca segura de tenant |
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
- configuracao do nome e da foto no CRUD exclusivo de clinicas
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
      export/       # schema e adaptadores PDF/XLSX
    settings/
    users/
  layout/
  services/
  shared/
    components/ui/  # primitivas visuais coesas
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
- `src/types.ts` preserva a API pública enquanto contratos extensos são divididos em `src/types`.
- `src/features/users/useUsersDomain.ts` cobre listagem, autoedicao, upload de arquivos e troca de senha.
- `src/features/billing/BillingPage.tsx` compoe a tela financeira a partir de `GET /api/faturamentos-medicos`.
- `src/features/settings/SystemSettingsPage.tsx` administra marca, tema e senha.
- `src/observability.ts`, `src/newRelic.ts` e `src/otel.ts` inicializam a telemetria opcional.

Mais detalhes em [TECHNICAL.md](./TECHNICAL.md).

Guarda arquitetural: `npm run audit:architecture`. Validacao completa local: `npm run verify` e `npm run test:e2e`.

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

Detalhes de Azure Static Web Apps, confirmation e checklist operacional em [DEPLOYMENT.md](./DEPLOYMENT.md).

# Tutoriais interativos

O frontend possui uma infraestrutura reutilizável de missões guiadas com [Driver.js](https://driverjs.com/) e narração local pela Web Speech API (`SpeechSynthesisUtterance`, `pt-BR`). A primeira missão implementada é **Relatórios — consulta analítica e filtros**, com sete etapas.

O acesso fica na gaveta **Como usar** da tela de Relatórios. O tutorial usa apenas seletores `data-tour`, mantém o alvo acionável, não simula cliques no modo interativo, interrompe a fala anterior ao trocar de etapa e encerra com uma mensagem segura se algum alvo não estiver disponível. As preferências de conclusão e “Não mostrar novamente” ficam somente no `localStorage` do navegador.

## Levantamento funcional e missões recomendadas

O aplicativo é um SaaS multiclínica com rotas protegidas por sessão, perfil, licença e módulos contratados. Os perfis identificados no frontend são SuperAdministrador, Administrador, Médico, Controlador, Equipe e Paciente. O menu libera Painel, Usuários/Meu cadastro, Pacientes-Cirurgias, Faturamento/Relatórios, Grupos médicos, Agenda, Clínicas e Configuração conforme essas permissões.

| Missão | Objetivo | Etapas estimadas | Situação |
| --- | --- | ---: | --- |
| Seleção de clínica e login | Escolher o tenant e entrar com segurança | 5 | Planejada |
| Cadastro de clínica | Configurar identidade, plano, módulos, limites e administrador | 7 | Planejada |
| Equipe e identificação | Criar equipe, vincular membros e configurar identificação/PIN | 7 | Planejada |
| Cadastro de paciente | Informar dados cadastrais, vínculos e documentos sanitizados | 6 | Planejada |
| Atendimento/cirurgia | Registrar hospital, cirurgião, convênio e procedimentos | 7 | Planejada |
| Gestão de faturamento | Consultar pendências, valores e detalhes financeiros | 6 | Planejada |
| Relatórios e filtros | Combinar filtros e interpretar resumo e resultados | 7 | **Implementada** |
| Exportação PDF/XLSX | Escolher escopo e gerar arquivos de relatório | 4 | Planejada |
| Pesquisa Full-Text | Pesquisar termos e refinar resultados | 4 | Planejada |
| Usuários e perfis | Cadastrar usuário e aplicar o perfil adequado | 7 | Planejada |
| Troca de clínica | Selecionar outro tenant permitido na mesma sessão | 4 | Planejada |
| Agenda e notificações | Criar evento, lembrete e destinatários | 7 | Planejada |

Os demais tutoriais não foram implementados nesta etapa, para que o padrão de Relatórios possa ser validado antes da expansão.

## Arquitetura e replicação

- `src/features/tutorials/TutorialProvider.tsx`: ciclo de vida do Driver.js, fala, controles, conclusão e falhas amigáveis.
- `src/features/tutorials/tutorialTypes.ts`: contrato das configurações.
- `src/features/tutorials/tutorialRegistry.ts`: registro central e tipado.
- `src/features/tutorials/configs/reportsTutorial.ts`: configuração isolada da missão de Relatórios.
- `src/features/tutorials/tutorialStorage.ts`: preferências locais, sem dados clínicos.
- `src/features/tutorials/speech.ts`: narração gratuita em português do Brasil.
- `src/features/tutorials/tutorials.css`: aparência, foco, alvo animado, mobile e `prefers-reduced-motion`.

Para adicionar uma missão:

1. Adicione `data-tour="nome-estavel"` aos alvos reais; não use classes visuais como seletores.
2. Crie um arquivo em `src/features/tutorials/configs/` com uma etapa por objetivo. Use `action: 'click'` quando a ação real for obrigatória e `action: 'continue'` para conteúdo informativo.
3. Registre a configuração em `tutorialRegistry.ts` e libere o ID no `TutorialProvider` somente quando a permissão funcional correspondente estiver ativa.
4. Exponha a missão na ajuda contextual da rota e acrescente a cobertura Playwright.
5. Use apenas textos e opções fictícias de homologação. Nunca coloque pacientes, usuários, e-mails, documentos, tokens ou informações clínicas reais na configuração.

## Testes dos tutoriais

```bash
npm run test:e2e -- --grep "tutorial"
npm run audit:architecture
npm test
npm run build
```

Os testes cobrem existência dos alvos `data-tour`, bloqueio de avanço antes da ação, conclusão, voltar, repetir narração, sair, alvo ausente, desktop/mobile e restrição por perfil. O projeto não possui um script ESLint; `audit:architecture`, TypeScript no `build`, Vitest e Playwright formam a validação disponível.

## Gravação passiva em homologação

A gravação usa viewport e vídeo de `1920x1080`, espera entre as etapas e armazena os WebM em `artifacts/tutorials/test-results`. A autenticação roda antes, com vídeo desligado; portanto a senha não aparece na gravação. A sessão temporária também fica sob `artifacts/tutorials/.auth`, caminho ignorado pelo Git.

Use exclusivamente uma conta e uma clínica fictícias e sanitizadas:

```powershell
$env:TUTORIAL_BASE_URL='https://homologacao.exemplo.com'
$env:TUTORIAL_CLINIC='slug-ou-id-ficticio'
$env:TUTORIAL_EMAIL='usuario-ficticio@exemplo.com'
$env:TUTORIAL_PASSWORD='senha-da-conta-ficticia'
$env:TUTORIAL_STEP_DELAY_MS='1800'
npm run record:tutorials:reports
```

`npm run record:tutorials` grava todas as missões registradas no arquivo de gravação. Cada nova funcionalidade deve receber um teste próprio e, consequentemente, um WebM separado. Não publique os arquivos de sessão em artefatos compartilhados; conserve apenas os vídeos finais.
