# Inicialização do HemoDinks

## Fluxo inspecionado

- `App` monta roteamento, React Query e o provedor de consentimento. Páginas jurídicas públicas não montam o conteúdo operacional.
- Sem sessão, `useLoginFlow` consulta `GET /api/public/clinicas`. Essa é uma lista pública para seleção; ainda não há clínica autorizada nem painel sendo preparado. Não há health check separado no bootstrap.
- O login envia credenciais e o slug selecionado ao endpoint existente. A API valida credenciais, associação, perfil e licença; pode devolver um desafio de identificação de equipe. Senha/PIN temporários continuam com suas telas obrigatórias.
- A sessão é mantida em `sessionStorage`. Expiração do JWT e respostas 401 autenticadas seguem `AUTH_EXPIRED_EVENT`, limpeza da sessão/cache e retorno ao login. Não foi introduzido refresh token. A API possui middleware de sessão e endpoints próprios de renovação; o front inspecionado não os usa neste bootstrap. O desafio de equipe/PIN foi preservado, sem introduzir etapas de 2FA inexistentes.
- Após os requisitos de credenciais, `GET /api/legal-acceptances/current` passa pelos middlewares autenticados de sessão e clínica antes de consultar os termos. Essa leitura é a barreira existente que libera `operationalSession`. Por isso a mensagem agrega sessão, clínica e termos; o navegador não consegue medir separadamente os middlewares internos.
- Preferências de privacidade são sincronizadas pelo provedor existente. Depois da barreira jurídica, resumo do dashboard, configurações, pacientes e catálogos de hospitais/convênios/fornecedores são consultados conforme os hooks existentes. Administradores também consultam dados cadastrais da clínica, contagem de grupos e médicos. Usuários/grupos/listagens dependem da rota e permissões. Licença médica ausente mantém a hidratação e o fallback existentes.
- Leituras independentes já são executadas pelo React Query em paralelo. Nenhuma dependência de autenticação, clínica ou aceite foi paralelizada indevidamente.

## Problemas e correções

1. O modal alternava quatro frases a cada 2,6 segundos, inclusive preparação de painel antes do login. Agora a mensagem corresponde à leitura pendente e a barra é indeterminada, sem percentual ou conclusão fictícia.
2. As leituras não tinham prazo máximo. O bootstrap público e autenticado possuem deadline de 60 segundos, cancelamento e proteção contra respostas atrasadas. As demais leituras JSON usam timeout HTTP para que também saiam do loading global.
3. Não havia recuperação da consulta pública nem aviso progressivo. O aviso surge após 12 segundos; após 35 segundos a ação cancela a tentativa pendente e inicia uma nova. Falhas/timeout encerram o loading e apresentam recuperação. Não há polling ou retry automático nessas duas leituras; cliques concorrentes não criam novas tentativas enquanto a anterior está dentro do prazo inicial.
4. A leitura jurídica não cancelava tentativas anteriores. Isso permitia concorrência entre retries. A correção mantém o resultado vinculado ao escopo e descarta resultados cancelados. O componente de sessão já era remontado por usuário/clínica/token; essa proteção e a limpeza de cache foram preservadas. Não foi encontrado motivo para alterar a resolução de tenant na API.
5. A camada HTTP descartava status/código ao converter erros. Isso impedia reconhecer com segurança 403 no resumo. `ApiError` mantém esses metadados; o comportamento de expiração e as mensagens de autorização permanecem. Detalhes de falha do bootstrap são substituídos por mensagens fixas.
6. O resumo podia repetir até três vezes uma falha, e a detecção de 403 buscava texto que o próprio serviço já havia traduzido. A política compartilhada de leitura não repete 4xx, mantém no máximo um retry para falhas transitórias e usa o backoff existente do React Query. Cada leitura JSON tem 60 segundos; com retry, a espera operacional pode chegar a aproximadamente 121 segundos. Uploads, downloads e chamadas externas não receberam esse timeout de leitura JSON.
7. Autenticação, identificação de equipe e gravação de aceite receberam timeout HTTP de 60 segundos, sem retry automático de escrita. Isso não modifica validação de credenciais nem regras do servidor. Timeout do navegador não garante desfazer processamento já iniciado no servidor.

## Segurança e apresentação

`ClinicaResolutionService` resolve requisições autenticadas pelos claims do usuário, sem trocar tenant por header/subdomínio. `ClinicaResolutionMiddleware` verifica clínica ativa e associação ativa, inclusive regras de equipe. `AuthenticationSessionMiddleware` valida sessão e associação e sincroniza claims de perfil. Nenhum desses arquivos foi alterado.

Nenhuma regra de autenticação, autorização, ClinicaId, perfil, permissão ou negócio foi removida ou flexibilizada. Mudaram apenas limites de espera, recuperação, apresentação e identificação técnica de falhas no front. Não existe cache novo, troca manual de clínica, liberação antecipada de dados ou reutilização de resultado entre sessões.

A apresentação reutiliza `LoadingOverlay`, cores e responsividade existentes. O formulário fica inerte durante sua leitura inicial; o retry recebe foco e funciona por teclado. Há anúncio de estado, progresso indeterminado e suporte a movimento reduzido. `aria-busy` fica na barra, evitando reter os anúncios da região `aria-live` até o desaparecimento do modal. O carregamento termina assim que a resposta válida chega, sem atraso cosmético para exibir “Tudo pronto”.

## Cold start: evidências e limites

No repositório da API, `docs/production-blue-green-runbook.md` documenta `minReplicas=0` por revisão e cold start na primeira chamada ao label. Isso é evidência de configuração documentada de scale-to-zero, não medição da configuração Azure atualmente em produção.

`Program.cs` aguarda `InitializeDatabaseAsync` antes de servir tráfego. `DatabaseStartupInitializer` consulta migrations pendentes mesmo quando a aplicação automática está desabilitada; migrations, seeds e manutenção adicional dependem de ambiente/configuração. A primeira conexão com SQL e essa consulta podem prolongar o início. Em produção, migrations e manutenção são desabilitadas por padrão, salvo configuração explícita.

`/livez` e `/healthz`/`/readyz` já existem; readiness inclui o banco. Não foi adicionada uma chamada redundante antes da consulta pública que já acessa o banco. Não foi confirmado Azure SQL Serverless/auto-pause nem medida a duração real do cold start. Nenhum recurso, escala, banco ou infraestrutura Azure foi alterado.

## Observabilidade

Os spans `bootstrap.public_clinics` e `bootstrap.session_clinic_legal` usam o OpenTelemetry API já instalado e o provider existente. Registram duração e resultado (`success`, `error`, `timeout`, `cancelled`), sem senha, token, slug, ClinicaId ou dados pessoais/clínicos. Não inicializam um novo exporter nem alteram consentimento de análise.

O primeiro span mede o tempo da leitura pública até a resposta, incluindo rede/API/banco; não é uma medição isolada de disponibilidade da API. O segundo mede a validação autenticada combinada. Não são inventadas métricas separadas para permissões e clínica que chegam na mesma resposta. A soma entre fases não deve incluir o tempo que a pessoa passa preenchendo o login. Para decompor o cold start, correlacionar com traces/logs de request e startup já existentes na API.

## Validação

- `npm test -- --maxWorkers=2 --reporter=dot`: **293 testes aprovados em 49 arquivos**. Uma execução anterior em concorrência padrão teve timeout na espera por uma listagem do teste existente de troca de clínica; os dois casos passaram isoladamente e a suíte completa passou com dois workers. Permanecem avisos de `act(...)` em testes existentes do App.
- `npx playwright test --grep 'bootstrap:'`: **17 aprovados**, incluindo inicialização lenta, aviso, teclado/retry, timeout, erros 500/503, sessão expirada via 401, contexto inválido/403, bloqueio de requests antes da validação, headers do tenant, seis perfis, nova sessão sem reutilização de dados anteriores e acessibilidade em 390px/light e 1280px/dark com movimento reduzido. Relógio controlado e interceptação HTTP substituem esperas arbitrárias.
- Na execução E2E completa, o cenário de 401 revelou uma espera insuficiente no teste: o login inicial ainda podia estar visível antes da resposta de validação. A asserção agora aguarda a resposta 401 e a mensagem de sessão expirada, antes de verificar armazenamento e redirecionamento.
- `npx playwright test`, execução final após os ajustes: **49 aprovados, 12 ignorados, nenhuma falha**. Os 12 ignorados são cenários opcionais de gravação de tutoriais, condicionados a `TUTORIAL_LOCAL_RECORDING=1` ou `TUTORIAL_LIBRARY_RECORDING=1`; não pertencem à validação funcional normal. Os testes de autenticação, navegação, perfis, privacidade, responsividade e acessibilidade existentes passaram junto com os 17 novos E2E de bootstrap.
- `npm run build`: TypeScript e build Vite aprovados.
- `npm run audit:architecture`: 254 arquivos verificados, sem violações.
- `dotnet test ../hemodinks-api/HemodinksAPI.Tests/HemodinksAPI.Tests.csproj --no-restore --verbosity quiet`: **352 aprovados, 2 falhas, 1 ignorado**. As duas falhas foram reproduzidas isoladamente: `EventReminderProcessorConcurrencyTests.ProcessDueReminders_ClaimsEventBeforeSendingAcrossReplicas` e `LegacyFinancialBackfillMigrationTests.Migration_backfills_valid_legacy_values_and_audits_invalid_originals`. Ambas falham porque **SQL Server Full-Text Search não está instalado na instância local**, durante migrations; não foram corrigidas por estarem fora do escopo e a API não foi modificada.
- O caso ignorado `PatientUserTenantSqlServerTests.SqlServer_RejectsCrossClinicPatientAndUserRelationships` foi executado novamente com `HEMODINKS_TEST_LOCALDB=1`: **aprovado**, usando apenas o banco descartável criado pelo próprio teste.
- Os E2E usam API interceptada, portanto validam o comportamento do navegador; a matriz de autorização e os testes de tenant da API complementam a cobertura do servidor. Não houve teste contra Azure/produção nem medição real de cold start.

## Arquivos alterados/criados

| Área | Arquivos |
| --- | --- |
| Integração do app | `src/app/AppContent.tsx`, `src/app/AppPublicContent.tsx`, `src/app/useAppChrome.ts`, `src/layout/AppShell.tsx` |
| Login | `src/features/auth/LoginScreen.tsx`, `src/features/auth/useLoginFlow.ts`, `src/features/auth/auth.css` |
| Barreira jurídica | `src/features/legal/LegalAcceptanceGate.tsx`, `src/features/legal/useLegalAcceptance.ts` |
| Transporte e retry | `src/services/api.ts`, `src/services/authService.ts`, `src/services/clinicsService.ts`, `src/services/legalAcceptanceService.ts`, `src/queryClient.ts` |
| Componentes e hook compartilhados | `src/shared/components/LoadingOverlay.tsx`, `src/shared/components/BootstrapLoading.tsx` (novo), `src/shared/hooks/useBootstrapRequest.ts` (novo) |
| Testes | `src/App.test.tsx`, `src/services/api.test.ts`, `src/queryClient.test.ts` (novo), `src/shared/components/BootstrapLoading.test.tsx` (novo), `src/shared/hooks/useBootstrapRequest.test.ts` (novo), `e2e/hemodinks.spec.ts` |
| Documentação | `docs/initial-loading.md` (novo) |

Os logs da execução ficam em `reports/bootstrap/` (diretório ignorado pelo Git); screenshots E2E ficam em `test-results/`. Nenhum commit, merge, deploy ou alteração de infraestrutura foi feito.
