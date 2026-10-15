# Auditoria de isolamento de contexto — Frontend #162

Data: 15/10/2026. Complexidade e risco: críticos. Escopo: estado/cache e operações
assíncronas no frontend; autorização e integridade persistida permanecem na API.

## Mapa e evidências

| Fluxo | Evidência no código | Isolamento |
| --- | --- | --- |
| Sessão/cache global | `src/features/auth/useAuthSession.ts:11`, `:55`, `:68`, `:92` | Identidade de sessão, usuário e clínica; limpa React Query e avança epoch nas transições/logout. BroadcastChannel invalida apenas o contexto correspondente. |
| Estado de telas/hooks/formulários | `src/app/AppContent.tsx:36` | Subárvore remontada por clínica, usuário e epoch; descarta filtros, seleções e modais. |
| Pacientes e catálogos | `src/shared/queryKeys.ts:4`, `src/features/patients/usePatientsDomainQueries.ts:103` | Chaves privadas usam o JWT como namespace; cabeçalhos de clínica derivam desse token. Não há reutilização via placeholderData/keepPreviousData nestes fluxos. |
| Agenda | `src/features/events/useAgendaEvents.ts:15`, `:40`, `:47`; `useAgendaRecipients.ts:15` | Cache local por clínica/usuário/token/filtros; requestId/cleanup descartam resultados antigos; renderização confere a chave atual. |
| Relatórios/faturamento | `src/features/reports/useReportsPage.ts:30`; `src/features/billing/BillingPage.tsx:80`; `BillingHistoryPage.tsx:51`, `:63` | Queries por token, filtro médico existente e remontagem por contexto. |
| Fotos/blobs | `src/features/users/UserAvatar.tsx:46`, `:64`; `src/shared/components/CompanyLogo.tsx:50`, `:63` | Resultados inativos são descartados e object URLs revogados no cleanup. |
| HTTP privado | `src/services/api.ts:145` | Epoch capturado antes de resolver token e conferido antes do envio, após resposta/renovação e antes de tratar erros ou repetir leituras. |
| Exportações de pacientes | `src/features/patients/export/patientListExporter.ts:50`; `patientFormExporter.ts:240`; `usePatientFormExport.ts:27`; `usePatientExport.ts:89` | Interrompe continuação após identidade, observações, paginação ou geração; não salva arquivo de contexto invalidado. |
| Downloads privados | `src/shared/components/SecureFileDownloadButton.tsx:24`; `src/features/billing/BillingHistoryPage.tsx:123` | Confere epoch e montagem antes de entregar o blob ao navegador. |

Não foi encontrado cache de dados clínicos em variáveis de módulo nos fluxos
investigados. O JWT nas chaves é uma separação de cache em memória, não uma
autoridade de segurança; seleção de clínica e autorização continuam na API.

## Falhas reproduzidas e corrigidas

- Resolver/renovação: operação antiga podia enviar ou repetir uma requisição depois
  da troca; erro 401 tardio ainda podia emitir expiração de sessão.
- Equipe sem `sid`: troca de operador não invalidava estado/cache; logout em outra
  sessão da mesma clínica podia invalidar um operador diferente. Agora usa a
  identidade já definida por `sessionService.sessionIdentity`, preservando a
  renovação normal de access token.
- Exportações/downloads: promises sobreviviam à desmontagem/troca de contexto e
  podiam iniciar downloads antigos. Guards no ponto de continuação/save impedem isso.

Os testes novos reproduziram falhas antes das correções. Os testes de regressão
preservam exportação e renovação no contexto atual.

## Validação

- `npm test -- --maxWorkers=4`: 94 arquivos / 614 testes aprovados.
- `npm run build`: aprovado; aviso preexistente de import estático/dinâmico de observabilidade.
- `npm run audit:architecture`: aprovado; aviso preexistente de tamanho de `types.ts`.
- `git diff --check`: aprovado.
- `npx playwright test --grep 'tenant #162' --workers=1`: 7 cenários aprovados:
  A→B→A em pacientes/relatórios/faturamento/agenda, logout/login com arquivos,
  invalidação e logout entre abas, resposta tardia e ausência de A enquanto B carrega.

## Limites

- E2E usa API simulada e a seleção real da interface; não comprova IDOR, revogação
  de cookies ou autorização no backend de produção.
- Operações já enviadas ao servidor e downloads já entregues ao navegador não
  podem ser desfeitos pelo frontend. A correção descarta continuações invalidadas.
- Sem mudanças em endpoints, regras de negócio, AGENTS.md, dependências ou deploy.
