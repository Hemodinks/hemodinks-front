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
