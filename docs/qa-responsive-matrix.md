# Matriz de QA responsivo — Frontend #163

## Escopo e custo

A suíte padrão permanece em um projeto Chromium desktop. A descoberta passou
de 180 para 184 testes: três smoke tests reutilizáveis e uma recusa de arquivo.
A matriz separada seleciona 13 cenários por projeto (39 execuções), sem triplicar
os testes extensos que já iteram várias larguras. Não altera regras do produto.

Evidências de configuração: `vite.config.ts:70` mantém Vitest/jsdom e o timeout
existente; `playwright.config.ts:24` mantém o projeto desktop único;
`playwright.responsive.config.ts:7` seleciona a amostra e `:47` define os três
projetos; `.github/workflows/ci.yml:74`, `:83` e `:86` executam unitários, E2E
padrão e a matriz separadamente.

| Projeto | Viewport | Entrada |
| --- | --- | --- |
| responsive-desktop | 1280 × 900 | mouse/teclado |
| responsive-tablet | 768 × 1024 | touch e viewport mobile |
| responsive-mobile | 390 × 844 | touch e viewport mobile |

Chromium é o navegador coberto; emulação não substitui aparelhos físicos ou Safari.

## Cobertura e evidências no repositório

| Fluxo | Matriz selecionada | Complemento existente |
| --- | --- | --- |
| Login/navegação | `e2e/responsive-smoke-cases.ts`: login pela UI, drawer e axe na listagem | `useLoginFlow.test.ts`: clínica única/múltipla, equipe/PIN; casos de bootstrap e autenticação completos |
| Troca de clínica | `e2e/tenant-isolation-cases.ts`: Alfa→Beta→Alfa em pacientes, relatórios, faturamento e agenda | `useAuthSession.test.ts`, `api.test.ts`: limpeza de cache, identidade de operador, renovação, respostas antigas |
| Sessão/abas/arquivos | Logout/login, BroadcastChannel, resposta retida e ausência de Alfa enquanto Beta carrega | Guards e regressões de downloads/exportações da #162 |
| Formulário | Required/foco, ausência de escrita inválida, cadastro e payload correto | `e2e/patient-form-cases.ts`: edição, novos vínculos, procedimentos e upload |
| Dropdown digitável | Opções abertas/fechadas, seleção por ArrowDown/Enter | Fluxo completo de vínculos na ficha em `e2e/patient-form-cases.ts` |
| Datepicker | Máscara digitada e atualização pelo input date nativo | Datas de solicitação/cirurgia/pagamento em `e2e/patient-form-cases.ts` |
| Tabela/filtros | Dois registros, filtro aplicado à API, um resultado e limpeza | `e2e/patient-list-cases.ts`: paginação, estados vazios e seleção |
| Exportação | PDF/XLSX com assinatura, bytes e apenas o paciente filtrado | Contratos Vitest de exportadores; relatórios Sintético/Completo na #171 |
| Negação | 403 de arquivo sem download/conteúdo estrangeiro; rotas de usuários/relatórios bloqueadas para paciente | `e2e/login-real-api.spec.ts`: negação real no backend isolado, fora da matriz mockada |

Os smoke tests usam roles/labels e verificam controles na viewport, overflow e
erros inesperados de navegador. O 401 conhecido da restauração sem sessão é
distinguido por URL/status; o 403 é parte explícita do teste negativo.

## Comandos

```powershell
npm test -- --maxWorkers=4
npm run test:e2e
npm run test:e2e:responsive
npm run test:e2e:responsive -- --project=responsive-mobile
npm run test:e2e:responsive -- --grep "responsive #163:"
npm run test:e2e:responsive -- --list
npx playwright show-report playwright-report/responsive
```

O comando padrão mantém a suíte existente. A matriz usa servidor próprio na porta
5175, sem reutilizar outro Vite; fixa locale/timezone e API local simulada. Bloqueia
tráfego externo inesperado, zera configuração Sentry/New Relic/OTEL e reutiliza as
fixtures locais. Não requer contas, secrets ou dados reais.

## CI e preservação de falhas

`.github/workflows/ci.yml` mantém unitários/build/budget/E2E padrão e acrescenta
auditoria de arquitetura e matriz curta. Instala apenas Chromium com suas libs de
sistema. O build de CI não envia erros ao Sentry; deploy permanece separado.

Trace é retido em falhas desde a primeira tentativa e screenshots automáticos são
gravados somente em falhas. A matriz gera HTML/JSON, rejeita `test.only` e reprova testes
flaky mesmo que o retry passe. Não há alteração de timeout/assertions para obter
verde. Relatórios/artefatos de testes da CI têm retenção de sete dias, inclusive
quando o job falha; o artefato de build mantém a retenção padrão.

Resultados: `playwright-report/responsive/`, `playwright-report/responsive-results.json`
e `test-results/responsive/`. Asserções que falham continuam falhando; resultados
de tentativas falhas ficam nos artefatos, sem inclusão de dumps no Git.

## Execução e limites

- Vitest: `npm test -- --maxWorkers=4` — 94 arquivos / 614 testes aprovados.
- Matriz: `npm run test:e2e:responsive` — 39 aprovados (13 por projeto),
  zero falhas, skips ou flaky; 131 segundos na execução local registrada no JSON.
- Build, orçamento de bundle, auditoria de arquitetura e `git diff --check`: aprovados.
- Workflow CI: YAML validado localmente; execução remota não disparada.
- Descoberta padrão: 184 testes / 17 arquivos; a suíte E2E padrão completa não foi
  reexecutada nesta atividade. A amostra responsiva e os testes novos foram executados.

Falhas encontradas durante a execução:

- Uma corrida no helper de navegação após relogin tentava abrir drawer no desktop
  antes de o menu aparecer. Agora espera a navegação disponível, sem sleep ou timeout maior.
- Falha real em mobile: `.clinics-table` mantinha `min-width: 880px`, provocando
  overflow e interceptação do clique em Acessar clínica. Correção localizada em
  `src/features/clinics/clinics.css:7`: remove o mínimo só em mobile e permite
  quebra das ações. O E2E mantém clique normal e exige ausência de overflow.

A primeira rodada consolidada teve 36 aprovações e três falhas (uma corrida do
helper e dois cenários atingidos pelo layout mobile). Após as correções, os mesmos
39 cenários passaram. Nenhuma assertion foi removida e nenhum clique foi forçado.

Contextos, screenshots e traces originais foram preservados em
`test-results/qa-audit-first-failure/` e `test-results/qa-audit-mobile-failure/`.
A captura de sucesso `clinics-mobile.png` fica no resultado do cenário de pacientes.

A matriz simula respostas da API e comprova o comportamento do frontend diante
da recusa, não autorização/IDOR/cookies reais do servidor. A suíte
`login-real-api.spec.ts` exige `HEMODINKS_LOGIN_FIXTURE`, provisionada pelo harness
isolado do backend; não deve ser apontada para produção. A CI remota não é
disparada por esta alteração local. Sem commits, merges ou deploys.
