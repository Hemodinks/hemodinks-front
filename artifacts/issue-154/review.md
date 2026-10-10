# Issue #154 — evidências de revisão

Branch: `developer`. Complexidade moderada; risco alto pela integração com login e sessão.
Agentes: Security (high), revisão somente leitura; QA (medium), E2E. Implementação e validação final pelo agente principal. Nenhum commit, push, merge ou deploy.

## Alteração

HTTP 429 preserva Retry-After (segundos ou HTTP-date), com fallback no campo retryAfterSeconds. Mensagem genérica sem expor dados do corpo da recusa. Espera em memória separada por e-mail/fluxo e desafio/operador; guarda síncrona nos handlers; liberação manual, sem reenvio automático. Nenhuma regra de autorização, limite por IP ou contagem de tentativas foi acrescentada ao frontend.

Arquivos de implementação:

- src/services/api.ts
- src/services/retryAfter.ts
- src/features/auth/useAuthWait.ts
- src/features/auth/AuthWaitMessage.tsx
- src/features/auth/useLoginFlow.ts
- src/features/auth/LoginScreen.tsx
- src/features/auth/TeamIdentificationScreen.tsx
- src/features/auth/ResetPasswordScreen.tsx
- src/app/AppPublicContent.tsx

Arquivos de testes:

- src/services/retryAfter.test.ts
- src/features/auth/authRateLimit.integration.test.tsx
- src/features/auth/useSessionLifecycle.test.tsx
- e2e/auth-rate-limit-cases.ts
- e2e/hemodinks.spec.ts (registro dos novos casos)
- e2e/login-real-api.spec.ts (caso de 429 real e outro usuário no mesmo IP)

## Resultados reais

- Regressão frontend: 9 arquivos / 193 testes aprovados (`vitest run` para api, retryAfter, sessionService, useLoginFlow, useAuthSession, useSessionLifecycle, PasswordPolicy, authRateLimit.integration e App.test).
- Após adicionar a regressão de troca de desafio/clínica: 22 testes de integração e sessão aprovados. Há sobreposição com a execução anterior; os números não devem ser somados. Evidência: auth-integration.json.
- Playwright Chromium: 12 E2E de UX aprovados; login normal, 429 descoberta/autenticação, prazo, reenvio manual, duplicados, identidades na mesma rede, operador/PIN, recuperação, confirmação e sessão autenticada. Axe WCAG 2 A/AA sem violações no painel em 375 px, temas claro/escuro; sem overflow horizontal. Evidência: playwright-report/index.html (screenshots anexados).
- API real: 15 testes de contrato/configuração/limites aprovados, incluindo contas individuais e equipes no mesmo IP, CORS, 429/Retry-After e recuperação após janela real.
- Runner da API real: 4 cenários aprovados, executando 5 E2E de navegador (individual, novo 429 real, seleção, PIN e PIN inválido). Evidências: api-tests/api-and-browser.trx e api-tests/team-browser.trx.
- `npm run build`: aprovado.
- `npm run audit:architecture`: aprovado, 299 arquivos, sem violação.
- `git diff --check`: aprovado.

Comandos adicionais para reprodução:

```powershell
npx vitest run src/features/auth/authRateLimit.integration.test.tsx src/features/auth/useSessionLifecycle.test.tsx --reporter=default --reporter=json --outputFile=artifacts/issue-154/auth-integration.json
$env:PLAYWRIGHT_HTML_OPEN='never'
$env:PLAYWRIGHT_HTML_OUTPUT_DIR='artifacts/issue-154/playwright-report'
npx playwright test e2e/hemodinks.spec.ts --grep 'limite de acesso' --workers=1 --reporter=list,html --output=artifacts/issue-154/e2e
$env:HEMODINKS_E2E_FRONT_PATH=(Get-Location).Path
dotnet test '../hemodinks-api/HemodinksAPI.Tests/bin/Debug/net10.0/HemodinksAPI.Tests.dll' --filter 'FullyQualifiedName~AuthenticationRateLimitingEndpointTests|FullyQualifiedName~RateLimitingConfigurationTests|FullyQualifiedName~LoginBrowserTests.Browser_UsesRealApi&DisplayName~individual' --logger 'trx;LogFileName=api-and-browser.trx' --ResultsDirectory './artifacts/issue-154/api-tests' --nologo
dotnet test '../hemodinks-api/HemodinksAPI.Tests/bin/Debug/net10.0/HemodinksAPI.Tests.dll' --filter 'FullyQualifiedName~LoginBrowserTests.Browser_UsesRealApi&DisplayName~pin|FullyQualifiedName~LoginBrowserTests.Browser_UsesRealApi&DisplayName~selection' --logger 'trx;LogFileName=team-browser.trx' --ResultsDirectory './artifacts/issue-154/api-tests' --nologo
```

## Limitações

E2E de UX usa respostas controladas; E2E real usa o runner existente da API com banco exclusivo em memória, sem acessar dados de produção e sem editar backend. A passagem do relógio do navegador não altera a janela do servidor; a expiração real é verificada separadamente pelo teste da API. Validação de navegador restrita a Chromium. Esperas são UX e desaparecem ao recarregar a página; a API continua aplicando os limites. Sem prazo válido, exibe mensagem genérica e permite tentativa manual, sem inventar duração.

Console: respostas 401 e 429 esperadas nos cenários negativos; nenhum erro JavaScript de página reportado. Build mantém aviso existente sobre importação estática/dinâmica de observability e auditoria mantém aviso de tamanho de types.ts, fora do escopo.
