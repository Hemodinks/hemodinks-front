# Issue #163 — matriz E2E responsiva

A suíte padrão permanece em um projeto Chromium. A matriz adicional inclui
cinco jornadas críticas do PR e preserva os testes de smoke responsivo e isolamento
já adicionados à developer. A seleção evita repetir casos que já percorrem várias
larguras sempre que possível. Os três projetos usam Chromium; tablet e mobile também emulam touch.
Isso não substitui validação em Safari/iOS ou dispositivos físicos.

| Jornada | Desktop 1440×900 | Tablet 820×1180 | Mobile 390×844 | Evidência principal |
| --- | --- | --- | --- | --- |
| Login pelo formulário | Sim | Sim | Sim | Autenticação e dashboard |
| Cadastro/edição de paciente | Sim | Sim | Sim | Dropdown digitável, teclado, datas, validação, persistência, upload, PDF/Excel |
| Relatórios | Sim | Sim | Sim | Filtros múltiplos, consulta, PDF/Excel |
| Troca Alfa → Beta → Alfa | Sim | Sim | Sim | Mesmo ID em clínicas diferentes, ausência de dados anteriores, token/headers coerentes |
| Negação 403 na Beta e recuperação | Sim | Sim | Sim | Sem dados Alfa, sem detalhe privado da resposta, recuperação apenas na Beta |

## Comandos

```bash
npm ci
npx playwright install chromium
npm run test:e2e:responsive -- --list
npm run test:e2e:responsive
npm run test:e2e:responsive -- --project=mobile
npm run test:e2e -- --grep 'tenant #16[23]'
npm run verify
```

`playwright.responsive.config.ts` seleciona títulos explicitamente. Ao renomear
uma jornada, confira `--list`: há pelo menos 5 jornadas do PR por projeto, além dos casos de smoke da developer. Execute `--list` para confirmar a contagem após o merge. Não selecione por
"responsividade": formulário, listagem e agenda já possuem loops de viewport.

O CI executa a matriz após a suíte padrão (ou sua falha), desde que a instalação
dos navegadores tenha passado e a execução não tenha sido cancelada. Os relatórios responsivos ficam em
`playwright-report/responsive/`, com resultados/screenshots em
`test-results/responsive/` e trace na primeira repetição; o artifact é enviado
com `if: always()`. As políticas existentes de workers/retries são preservadas.

## Evidências da auditoria

- `playwright.config.ts`: projeto padrão desktop; servidor de teste restrito ao
  loopback usado pelo baseURL, evitando descoberta de interfaces desnecessária.
- `e2e/patient-form-cases.ts`: fluxo CRUD completo e loop de oito larguras;
  `e2e/patient-list-cases.ts`: tabela em cinco larguras.
- `e2e/tenant-isolation-cases.ts`: troca de contexto, logout, abas concorrentes,
  resposta tardia e agora resposta negada; navegação abre o drawer quando necessário.
- `src/queryClient.test.ts`, testes de sessão, API e exportação verificam a camada
  abaixo da UI. A matriz responsiva complementa esses testes.

Fixtures interceptam a API e usam tokens sintéticos e clínicas fictícias. O 403
simula uma decisão do servidor para verificar o comportamento do frontend; não
prova a autorização da API real. Os testes reais em `login-real-api.spec.ts`
exigem ambiente/fixture próprios e não foram executados nesta atividade.

## Execução de 16/10/2026

Base: `developer`, commit `1374b116cef00e0e1e3d4caedec84d461c789296`.

- Auditoria de arquitetura: 307 arquivos, nenhuma violação.
- `npm run verify`: 612 testes aprovados e 2 falhos, antes das alterações.
  Falhas preservadas: `billingUtils.test.ts:257` (esperava 1, recebeu 0) e
  `App.test.tsx:988` (esperava 2 eventos, recebeu 1). Não foram alteradas regras
  financeiras nem assertions para ocultar essas falhas; o verify não chegou ao build.
- `npm run build` separado: passou (TypeScript e Vite).
- Testes direcionados de sessão, API, cache e exportação: 81 aprovados em 5 arquivos.
- Listagem Playwright: suíte padrão 181 casos; matriz responsiva 15 casos.
- Execução da matriz: 15 falhas de infraestrutura antes de abrir navegador, pois
  o executável Chromium não está instalado. Downloads de Chromium e Headless
  Shell retornaram ZIP truncado. Nenhum dos 15 fluxos foi validado no navegador.
- `git diff --check`: passou.

Status: implementação preparada, validação E2E pendente. Não encerrar o issue
até executar a matriz em ambiente com Chromium.
Sem commit, PR, merge ou deploy nesta atividade.

## Correção posterior das duas falhas unitárias

O ambiente usa Asia/Tokyo (UTC+9). As duas fixtures misturavam datas UTC com
limites/dia selecionado locais. O cadastro de 30/06 15:25 UTC já era julho no
runner; o evento de 15:00 UTC já pertencia ao dia seguinte.

- `billingUtils.test.ts`: data de cadastro criada no último dia de junho local.
- `App.test.tsx`: eventos construídos no dia local e busca dos cards limitada à
  região semântica de eventos da data selecionada. A expectativa de dois cards
  e a verificação de exclusão apenas do evento 101 foram preservadas.
- Os dois casos passaram em UTC, America/Sao_Paulo e Asia/Tokyo.
- Nenhuma regra de negócio ou código de produção foi alterado.

Validação posterior: 90/90 testes dos dois arquivos passaram; suíte completa 614/614 passou. `npm run verify` concluiu com build aprovado.
