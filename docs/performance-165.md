# Auditoria de performance — issue #165

Execução manual solicitada em 21/10/2026, sobre `developer` (`d49ba9b`).
Complexidade e risco moderados: atualização de consultas após ações do usuário,
medição de bundles e infraestrutura local de auditoria. Sem dependência de mudança
na API ou banco. Nenhuma alteração em autenticação, permissões ou chaves de tenant.

## Evidências e correções

- `src/features/users/useUsersDomain.ts:136` e
  `src/features/patients/usePatientsDomainQueries.ts:288`: a invalidação automática
  aguardava um refetch e o loader solicitava outro. Agora a invalidação usa
  `refetchType: 'none'` e o loader realiza a atualização explícita.
- `src/features/users/useUserCrudActions.ts:101` e
  `src/features/patients/usePatientCrudActions.ts:95`: operações de escrita também
  invalidavam lista/resumo com refetch antes de chamar seus loaders. A invalidação
  dessas chaves preserva páginas stale e deixa a atualização a cargo dos loaders.
- `scripts/check-bundle-budget.mjs:10`: o verificador antigo media somente o
  primeiro CSS (5,77 KiB). Agora soma CSS inicial e JS inicial/preloads sem contar
  links duplicados, além de verificar cada chunk JS, inclusive os adiados.
- `scripts/lighthouse-auth.cjs:1`: a sessão injetada em localStorage era removida
  pelo bootstrap atual. O novo servidor local fornece restauração sintética pela
  API existente e a preparação exige o heading da tela e ausência de erros JS/API.
  Os dados incluem dez usuários, dez pacientes e um evento; não são dados reais.
- Os testes E2E novos revelaram que o mock genérico de pacientes não implementava
  DELETE. O mock passou a remover o registro; a assertion de remoção foi mantida.

## Requests medidos

Contagens após a ação, excluindo a carga inicial, com hooks reais e QueryClient:

| Ação | Antes | Depois |
| --- | ---: | ---: |
| Refresh de usuários, pacientes ou lookup ativo | 2 | 1 |
| Recarregar lista após exclusão de usuário/paciente | 3 | 1 |
| Recarregar resumo após exclusão | 2 | 1 |

Os testes verificam também invalidação das páginas inativas, preservação do cache
de outra clínica e ausência de requests de pacientes/CBHPM sem permissão.
Os casos anteriores falharam com contagens 3/4 incluindo a carga inicial e passaram
após a correção. E2E confirma refresh/exclusão em 390 e 1440 px.

## Bundle e Lighthouse

Baseline de bundle: `npm run analyze` e `npm run budget` executados antes das
correções de produto. Comparação autenticada usa builds de produção, mesma API
sintética, Chromium do Playwright, perfil mobile padrão do Lighthouse, gzip e uma
execução por rota. O baseline autenticado foi coletado com o build anterior à
correção das consultas; o build final recompila essas correções.

Os relatórios do script antigo e a coleta diagnóstica sem gzip não são usados
como comparativo. Compressão foi configuração do servidor de auditoria aplicada
a ambos os lados, não uma otimização entregue à aplicação ou ao ambiente remoto.

| Rota | Performance antes/depois | LCP ms antes/depois | TBT ms antes/depois | CLS antes/depois | A11y final |
| --- | ---: | ---: | ---: | ---: | ---: |
| /dashboard | 80 / 80 | 4352 / 4053 | 172 / 255 | 0.011 / 0.000 | 100 |
| /usuarios | 86 / 85 | 3608 / 3608 | 178 / 183 | 0.011 / 0.011 | 100 |
| /pacientes | 85 / 85 | 3607 / 3607 | 198 / 198 | 0.011 / 0.011 | 100 |
| /agenda | 78 / 85 | 4658 / 3607 | 196 / 185 | 0.011 / 0.011 | 100 |

Lighthouse 12.6.1, RTT 150 ms, throughput 1638,4 Kbps e CPU 4x. Todas as assertions existentes passaram na comparação com gzip.

| Bundle (KiB) | Antes (build auditável) | Depois (build auditável) | Limite |
| --- | ---: | ---: | ---: |
| Entrada JS raw / gzip | 249,89 / 80,20 | 250,20 / 80,22 | 380 / 120 |
| JS inicial raw / gzip | 566,25 / 179,70 | 566,56 / 179,72 | 650 / 200 |
| CSS inicial raw | 63,23 | 63,23 | 70 |
| Maior chunk JS raw / gzip | 469,80 / 155,78 | 469,80 / 155,78 | 550 / 180 |

O pequeno acréscimo de JS corresponde às opções explícitas de invalidação; não houve redução de bundle. O build final padrão analisado separadamente passou com 250,24 KiB de entrada, 566,60 KiB de JS inicial e 63,23 KiB de CSS inicial.

Evidências locais (ignoradas pelo Git): `reports/performance-165/baseline/`, `after/`, `comparison.json`, `baseline-lighthouse.log`, `after-lighthouse.log`, `budget-after-audit.txt`, `budget-final.txt` e `analyze-final.log`. Treemap final: `dist/bundle-stats.html`.


## Verificação e limites

- `npm test -- --maxWorkers=2`: 722 testes aprovados em 112 arquivos.
- `npm run test:performance`: 11 testes aprovados, incluindo limites negativos,
  CSS ausente, preload, chunk adiado e contratos das fixtures.
- E2E: 13 cenários existentes aprovados (cadastro/edição, sessão e isolamento)
  e os quatro novos cenários de performance aprovados após corrigir o mock.
- Build de produção (`tsc -b` + `vite build`), `npm run analyze`,
  `npm run budget` e `npm run audit:lighthouse`: aprovados.
- Auditoria de arquitetura aprovada; permanece o aviso preexistente de tamanho
  de `src/types.ts` (523 linhas). Diff verificado sem erros de whitespace.

Comandos E2E usados: `npx playwright test e2e/hemodinks.spec.ts --grep 'performance:|cadastra e edita usuario|cadastra e edita paciente|tenant|isolamento' --workers=2`,
depois `--grep 'performance:' --workers=2` após a correção do mock e
`--grep 'combina busca e filtro' --workers=1` para paginação/filtros.
Os 401/403 emitidos pelos cenários negativos eram respostas simuladas esperadas;
não foram observados erros inesperados de JavaScript nos fluxos executados.

Não foi encontrado loop infinito nos hooks investigados. A consulta de pacientes
no dashboard foi preservada porque fornece fallback quando o resumo é negado.
Os lookups têm consumidores em outras telas, inclusive faturamento.

Sentry (aproximadamente 470 KiB), jsPDF (371 KiB) e html2canvas (196 KiB) são os
maiores chunks adiados; não foram carregados nas quatro navegações auditadas.
O runtime de tutoriais continua inicial (~56 KiB); o Lighthouse aponta código
não utilizado nessa navegação, mas sua divisão exige investigar os tutoriais de
login e autenticados. Nenhuma memoização ou refatoração de render foi feita sem
medição que a justificasse.

Esta é uma medição de laboratório com dados sintéticos e uma amostra por rota.
Variações de timing não demonstram ganho estatístico. LCP continua um ponto de
atenção; INP e percentis de usuários reais exigem observação em ambiente real.
Não houve benchmark da API/banco ou validação de cookies com backend real.

Agentes: Frontend (investigação somente leitura; esforço medium definido pelo
papel). QA foi acionado, mas encerrou por limite de uso sem alterações entregues;
implementação e validação foram executadas pelo agente principal. Nenhum commit,
PR, merge, deploy ou encerramento remoto da issue.

## Reexecução — 26/10/2026

Risco e complexidade moderados. A auditoria anterior e seus limites foram
preservados. As issues dependentes #162 e #181 ainda constam abertas no GitHub;
esta execução manual valida o frontend local, sem promover alterações remotas.

Correções incrementais:

- `src/features/users/useUsersDomain.ts:136`: o refresh manual ignorava as
  condições de acesso/troca de senha que desabilitam a consulta automática.
  `refetch()` executava uma chamada mesmo com a consulta desabilitada. O loader
  agora verifica essas condições antes de invalidar cache ou consultar a API.
  Os dois testes negativos reproduziram **1 request antes / 0 depois**; refresh e
  exclusão autorizados continuam com um request por lista/resumo atualizado.
  Não foram alterados autenticação, autorização efetiva da API ou chaves de cache.
- `src/features/patients/usePatientsDomainQueries.test.tsx`: cada caso de lookup
  agora verifica a chave do respectivo domínio em outra clínica, em vez de
  verificar apenas o cache de pacientes em todos os casos.
- `.github/workflows/ci.yml`: os testes `node:test` de budgets e fixtures passam
  a ser executados explicitamente; eles não integram o `npm test` do Vitest.

Builds Lighthouse comparáveis, com a mesma configuração mobile/gzip e dados
sintéticos, uma coleta por rota, Lighthouse 12.6.1:

| Rota | Performance antes/depois | LCP ms antes/depois | TBT ms antes/depois | CLS antes/depois | A11y final |
| --- | ---: | ---: | ---: | ---: | ---: |
| /dashboard | 79 / 84 | 4353 / 3602 | 198 / 202 | 0.000 / 0.011 | 100 |
| /usuarios | 87 / 86 | 3606 / 3606 | 135 / 183 | 0.011 / 0.011 | 100 |
| /pacientes | 84 / 86 | 3607 / 3608 | 245 / 178 | 0.011 / 0.011 | 100 |
| /agenda | 84 / 78 | 3608 / 4657 | 248 / 202 | 0.011 / 0.011 | 100 |

Todas as assertions existentes passaram, sem `runWarnings`. Os scores oscilam
nos dois sentidos; não há evidência de ganho estatístico em Core Web Vitals.
A correção de requests só atua nos estados restritos, ausentes da fixture admin.
LCP segue como ponto de atenção; INP e percentis reais não foram medidos.

| Bundle auditável (KiB) | Antes | Depois | Limite |
| --- | ---: | ---: | ---: |
| Entrada JS raw / gzip | 250.51 / 80.30 | 250.54 / 80.31 | 380 / 120 |
| JS inicial raw / gzip | 566.87 / 179.80 | 566.90 / 179.81 | 650 / 200 |
| CSS inicial raw | 63.41 | 63.41 | 70 |
| Maior chunk JS raw / gzip | 469.80 / 155.78 | 469.80 / 155.78 | 550 / 180 |

Sem redução de bundle. Sentry, jsPDF e html2canvas permanecem os maiores chunks
adiados; não foi feita divisão adicional ou memoização sem evidência de benefício.
Os limiares não foram afrouxados. Performance no Lighthouse continua `warn` e
acessibilidade `error`, conforme a configuração existente.

Evidências locais ignoradas pelo Git: `reports/performance-165/2026-10-26/`
(JSON/HTML e métricas de baseline/after), `reports/performance-165-*.log`.
Não foram usados dados reais, alterados secrets ou executados workflows remotos.

Validação desta reexecução:

- `npm run verify`: arquitetura, **763 testes em 112 arquivos** e build aprovados.
- `npm run test:performance`: **11 testes aprovados**, incluindo os negativos de
  limite, gzip, chunk adiado e stylesheet ausente.
- `npm run analyze` antes/depois: aprovado. Treemap final em
  `dist/bundle-stats.html`; `npm run budget` final aprovado com JS inicial
  **566.94 KiB raw / 179.82 KiB gzip**, usando a configuração padrão do analyze.
- `npm run audit:lighthouse` antes/depois: aprovado nas quatro rotas.
- E2E com filtro `performance:|cadastra e edita usuario|tenant|isolamento|bloqueia
  rota de usuarios para perfil paciente`: 16 aprovados e um timeout de 30 s na
  navegação inicial de `/usuarios` mobile (`page.goto`/restauração), durante a
  execução simultânea da suíte unitária. O caso foi repetido isoladamente com
  `--grep 'performance:.*usuarios.*390px' --workers=1`: aprovado em 9,9 s, sem
  mudar timeout/assertions. Os 17 cenários distintos foram assim validados.
  Logs e trace da falha inicial foram preservados; não se atribui causalidade
  definitiva ao paralelismo a partir dessa única ocorrência.
- As respostas 401 da restauração sem sessão e 403 dos negativos de tenant são
  simuladas. Permanecem os avisos existentes de tamanho de `src/types.ts` e de
  import estático/dinâmico de `observability.ts`; não foram suprimidos.

QA (medium) investigou cobertura sem editar ou executar testes. A revisão
adicional Security foi acionada, mas falhou por limite de uso, sem parecer.
O agente principal implementou, revisou o diff e executou as validações.
CI remota, autorização real do backend e dados de produção não foram validados;
as evidências são locais. Sem commit, PR, merge ou deploy.
