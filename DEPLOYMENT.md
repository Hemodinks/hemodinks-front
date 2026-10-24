# Deploy do Hemodinks Front

Frontend React/Vite publicado como SPA. O build final fica em `dist` e toda rota publicada precisa reescrever para `/index.html`.

## Ambientes e URLs

| Ambiente | URL |
| --- | --- |
| Local | `http://localhost:5173` |
| Producao | `https://hemodinks.gestao-saude.tec.br` |
| Homologacao | `https://hemodinks-homologacao.gestao-saude.tec.br` |
| API local | `http://localhost:5000` |
| Swagger local | `http://localhost:5000/swagger` |
| Scalar local | `http://localhost:5000/scalar` |
| OpenAPI local | `http://localhost:5000/openapi/v1.json` |

Em ambiente publicado, Swagger/Scalar/OpenAPI dependem de `ApiDocumentation__Enabled=true` na API.

## Arquivos de ambiente

Ambiente local:

```powershell
Copy-Item .env.example .env.local
```

Ambiente confirmation local:

```powershell
Copy-Item .env.confirmation.example .env.local
```

## Variaveis

Minimo para qualquer build publicado:

```text
VITE_API_URL=https://<api-publica>
VITE_APP_ENV=production
VITE_APP_VERSION=<versao-ou-sha>
VITE_SENTRY_TRACES_SAMPLE_RATE=0
```

Observabilidade opcional no browser:

```text
VITE_NEW_RELIC_ACCOUNT_ID=<opcional>
VITE_NEW_RELIC_AGENT_ID=<opcional>
VITE_NEW_RELIC_APPLICATION_ID=<opcional>
VITE_NEW_RELIC_BEACON=<opcional>
VITE_NEW_RELIC_ERROR_BEACON=<opcional>
VITE_NEW_RELIC_LICENSE_KEY=<opcional>
VITE_NEW_RELIC_TRUST_KEY=<opcional>
VITE_SENTRY_DSN=<opcional>
VITE_OTEL_EXPORTER_OTLP_ENDPOINT=<opcional>
VITE_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=<opcional>
VITE_OTEL_EXPORTER_OTLP_HEADERS=<opcional>
VITE_OTEL_EXPORTER_OTLP_TRACES_HEADERS=<opcional>
VITE_OTEL_SERVICE_NAME=hemodinks-front
VITE_OTEL_TRACES_SAMPLE_RATE=1
```

Notas:

- `VITE_NEW_RELIC_BEACON` e `VITE_NEW_RELIC_ERROR_BEACON` sao avancadas e podem ficar vazias.
- O build gera `public/otel-runtime-config.json` automaticamente via `scripts/write-otel-runtime-config.mjs`.
- Se o backend OTLP exigir segredo privado, publique um proxy/collector seu em vez de expor a credencial no bundle.

## Validacao antes de deploy

Em maquina nova:

```powershell
npm ci
npx playwright install chromium
```

Checklist local recomendado:

```powershell
npm test
npm run build
npm run budget
npm run test:e2e
npm run audit:a11y
npm run analyze
npm run audit:lighthouse
```

Artefatos uteis:

```text
dist/
dist/bundle-stats.html
public/otel-runtime-config.json
reports/lighthouse/
```

## Azure Static Web Apps: producao

`public/staticwebapp.config.json` define o fallback SPA, os headers de seguranca e as regras de cache. O arquivo e copiado para a raiz de `dist` pelo build do Vite.

O CI chama `.github/workflows/azure-static-web-apps-production.yml` somente depois de
`Test and build` terminar com sucesso no mesmo run. O job exige auditoria de
arquitetura, testes do gate, Vitest, build, budget, Playwright E2E e matriz
responsiva/tenant. Falha, cancelamento ou job ignorado bloqueiam a publicacao.

- Producao aceita apenas `push` para `main` ou **Run workflow no CI**, selecionando
  `main`. PRs e outras branches nao publicam. O Azure reusable nao tem trigger direto.
- Os dois checkouts e `VITE_APP_VERSION` usam o mesmo `github.sha`; nao ha busca de
  um CI verde de outra revisao nem download de artefatos de outro run.
- O deploy preserva testes, build de producao, budget, `dist`, fallback SPA e a acao
  Azure existentes. O build CI usa ambiente CI, sem credenciais de producao.
- Permissao do token GitHub: apenas `contents: read`. O token Azure e passado
  explicitamente ao reusable e fica restrito a validacao de inputs/upload.
- Runs da main nao se cancelam automaticamente; o upload tem concorrencia global
  `azure-static-web-apps-production`, sem cancelamento. O GitHub pode substituir
  execucoes pendentes; nao ha garantia de ordem FIFO nem de publicar todo push.
- Imediatamente antes do upload, a API GitHub deve confirmar que o SHA ainda e o
  HEAD da main. SHA antigo, resposta vazia ou erro bloqueiam, inclusive em reruns.
  Consulta e upload nao sao atomicos: main pode avancar durante o upload; a
  serializacao impede que um upload antigo sobreponha outro upload novo concluido.
- Rerun do job de deploy pode repetir a mesma revisao se ela ainda for a main;
  reutiliza o sucesso do CI daquele run/SHA. Nao ha promessa de upload exactly-once.
- Previews e homologacao Vercel continuam separados, sem novo trigger de producao.

### Protecao e transicao (#181)

Auditoria em 23/10/2026: main tinha `enforce_admins: true`, sem required checks;
nenhum ruleset. Foi configurado e relido via API o check **Test and build**,
vinculado ao GitHub Actions (`app_id: 15368`), com `strict: true`, preservando as
demais protecoes. Esse check agrega E2E e matriz responsiva. Conferir em
Settings > Branches > main > Require status checks > Test and build, com branch
atualizada obrigatoria. Nao exigir o check de deploy em PR: ele e intencionalmente
ignorado fora da main.

O workflow legado `azure-static-web-apps-white-grass-0d59a4410.yml` (ID `310093793`)
foi desativado via API e relido como `disabled_manually`: reruns historicos usam
definicoes antigas e poderiam contornar o gate. Seu caminho foi substituido pelo
novo reusable. **Nao reabilitar o workflow legado**. A publicacao automatica fica
suspensa ate integrar esta mudanca; nao houve deploy, commit ou merge nesta tarefa.
Verificacao read-only:

```powershell
gh api repos/Hemodinks/hemodinks-front/branches/main/protection/required_status_checks
gh api repos/Hemodinks/hemodinks-front/rulesets
gh api repos/Hemodinks/hemodinks-front/actions/workflows/310093793 --jq '.state'
npm run test:release-gate
```

Plano de implantacao: revisar o diff e testes, integrar primeiro em developer por
processo autorizado, validar CI remoto sem producao, promover a main somente com
autorizacao. O reusable local e carregado do mesmo commit do caller. Nao executar
Run workflow em main apenas para testar: isso publica apos CI aprovado.

Rollback: reverter o conteudo da SPA em um novo commit da main, preservando os
workflows do gate, e executar CI completo antes de publicar. Nao reexecutar run
antigo, remover `needs`, restaurar o workflow legado ou desativar required checks.
Front #162 e API #171 seguem abertas na auditoria; testes tenant do frontend usam
API simulada e nao substituem a validacao integrada com a API.

Validacao local em 23/10/2026: 25 testes do gate aprovados; actionlint 1.7.12,
auditoria de arquitetura, build e budget aprovados. A consulta real read-only ao
GitHub aceitou HEAD atual e rejeitou SHA divergente. Vitest completo com dois
workers: 757 aprovados e 4 timeouts em `src/App.test.tsx` (111 arquivos aprovados,
1 falhou). Reexecucao apenas dos quatro cenarios: 2 aprovados e 2 timeouts
reproduzidos (`lista e cadastra pacientes` e `libera cadastro, edicao, arquivos e
foto para medico mesmo sem feature de gerenciamento`). A tentativa inicial sem
limite de workers foi interrompida apos timeout em ReportsChecklist; os 4 testes
desse arquivo passaram isoladamente. Nenhum timeout/assertion foi alterado.
Essa execucao local nao pode ser declarada verde; falhas devem bloquear o release.
Playwright completo: 197 aprovados, 1 falhou (evidencias visuais desktop/mobile),
1 flaky (refresh/exclusao de usuarios em 390px) e 27 ignorados, em 29,6 minutos.
Matriz responsiva/tenant: 54 aprovados, sem falhas ou flaky, em 7,0 minutos
(18 desktop, 18 tablet, 18 smartphone). Fixtures de API simulada, sem credenciais
de producao. Esses resultados locais nao comprovavam CI integral aprovado.
Validacao local executada em Windows/Node 24.14.0; o CI usa Ubuntu/Node 22.

Atualizacao da integracao (#181), 23/10/2026: o
[CI 40032049065](https://github.com/Hemodinks/hemodinks-front/actions/runs/40032049065)
concluiu `Test and build` com sucesso na `developer`, commit `2391307`. O job de
deploy foi ignorado, como esperado fora da `main`. Essa evidencia remota nao
altera os resultados locais historicos acima nem comprova API real em producao.

A branch `integration/issue-181-ci-e2e-main` combina esse commit com a `main`
`1a2a9bf`, sem conflitos. Os 39 commits exclusivos da `main` eram historico de
merges, sem diferenca funcional adicional nas arvores da aplicacao. A PR deve
validar novamente `Test and build` sobre a combinacao com a base atualizada,
conforme protecao `strict`; a execucao antiga da `developer` nao substitui esse
check. O merge na `main` dispara CI e, somente apos sucesso, o deploy. O workflow
legado permanece desativado. Nenhum deploy faz parte da preparacao desta PR.

Segredos necessarios:

```text
AZURE_STATIC_WEB_APPS_API_TOKEN_WHITE_GRASS_0D59A4410
VITE_API_URL
VITE_SENTRY_DSN
```

O workflow de CI (`.github/workflows/ci.yml`) continua sendo o gate dos PRs e pushes. Lighthouse fica separado em `.github/workflows/lighthouse.yml` e deve ser iniciado manualmente quando necessario.

O arquivo `src/vercel.json` mantém desabilitado o projeto Vercel legado de produção. O `vercel.json` da raiz pertence à homologação e habilita deploy automático somente para a branch `developer`.

## Vercel: homologacao

`vercel.json` define o projeto `hemodinks-front-confirmation`:

- framework `vite`
- install `npm ci`
- build `npm run build && npm run budget`
- output `dist`
- deploy Git habilitado somente para `developer`
- rewrite SPA de `/(.*)` para `/index.html`
- headers de segurança e cache dos assets

Variaveis principais:

```text
VITE_API_URL=https://hemodinks-api-confirmation.onrender.com
VITE_APP_ENV=confirmation
VITE_APP_VERSION=<versao-ou-sha>
VITE_SENTRY_TRACES_SAMPLE_RATE=0
```

Use `.env.confirmation.example` para reproduzir esse build localmente.

Não use **Redeploy** em um deployment antigo que ainda contenha redirects ou rewrites inválidos. Crie um deployment a partir da versão mais recente da branch `developer`; a Vercel aplicará o `vercel.json` correspondente ao novo commit.

## CORS esperado na API

A API precisa permitir a origem do front publicado.

Producao:

```text
Cors__AllowedOrigins__0=https://hemodinks.gestao-saude.tec.br
```

Homologacao Vercel:

```text
Cors__AllowedOrigins__0=https://hemodinks-homologacao.gestao-saude.tec.br
```

## Smoke test apos deploy

Validar no navegador:

- login
- reset de senha por token, se a API estiver com esse fluxo habilitado
- dashboard carregando resumo
- notificacoes abrindo, marcando como lidas e atualizando contadores
- usuarios e meu cadastro
- listagem e formulario de pacientes
- observacoes de pacientes
- faturamento medico
- grupos medicos
- agenda e notificacoes
- configuracao da empresa, tema e troca de senha
- exportacao XLSX e PDF
- layout sem scroll horizontal em `360px`, `390px` e `768px`
- fallback do Error Boundary
- eventos de Sentry/New Relic/OTLP quando configurados

## Troubleshooting

Se a tela ficar em branco em rota direta, confirme a rewrite SPA para `/index.html`.

Se login ou consultas falharem, revise `VITE_API_URL` e as origens CORS da API publicada.

Se o E2E falhar em maquina nova:

```powershell
npx playwright install chromium
```

Se o bundle crescer ou o build ficar lento:

```powershell
npm run analyze
```

Abra `dist/bundle-stats.html` e confira se `jspdf` e outros pacotes pesados continuam em chunks separados.

Se a telemetria OTLP nao aparecer, confira `public/otel-runtime-config.json` no build gerado e valide se o endpoint publicado aceita chamadas de browser.
