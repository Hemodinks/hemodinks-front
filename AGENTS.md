# AGENTS.md — HemoDinks Frontend

React 19 + Vite + TypeScript + TanStack Query. Sem store global. Backend em `hemodinks-api`.
Sistema de saúde multi-clínica: o front é UX; segurança e autorização são da API.

## Mapa

- Telas por domínio: `src/features/<módulo>/` (Page, componentes, hooks `use*Domain`, testes ao lado)
- Orquestração, permissões e rotas: `src/app/` (`AppContent.tsx`, `appAccess.ts`, `lazyModules.tsx`) e `src/routes.ts`
- HTTP e sessão: `src/services/` (`api.ts`; nunca chamar axios direto em componente)
- Componentes compartilhados: `src/shared/components/` (`ui.tsx`, `Modal`, `DateInput`, `ComboboxField`, tabelas)
- Exportações PDF/XLSX: `src/shared/export/` e `src/features/*/export/`
- Observabilidade: só New Relic Browser (`src/newRelic.ts`), iniciado após consentimento de análise
- Regras espelhadas da API: `src/shared/surgeryType.ts`, `src/shared/surgeryStatus.ts`
- Tutoriais: `src/features/tutorials/` (configs em `configs/`; produção em `TUTORIALS.md`)
- E2E: `e2e/` (configs `playwright*.config.ts`); E2E com API real: `npm run test:e2e:real` (`docs/real-api-e2e.md`)
- Docs: `README.md`, `TECHNICAL.md` (rotas, contratos de API), `DEPLOYMENT.md`, `TUTORIALS.md`; `docs/` é histórico
- Codex: subagentes e política de esforço em `.codex/ORCHESTRATION.md`.

## Comandos

```bash
npx vitest run <caminho/do/arquivo.test.tsx>   # teste focado
npx tsc -b                                      # typecheck rápido (o build roda o mesmo)
npm run verify                                  # arquitetura + testes + build
npm run test:e2e -- <spec>                      # E2E focado
npm run test:e2e:responsive                     # 390 / 820 / 1440 px
npm run build && npm run budget                 # orçamento de bundle
```

## Não ler (gasta contexto e não ajuda)

`node_modules/`, `dist/`, `playwright-report*/`, `test-results*/`, `reports/`, `artifacts/`, `tmp/`, `*.log`, `public/tutorials/`.
Testes de integração do App ficam em `src/App.<fluxo>.test.tsx` (auth, privacy, navigation, users, patients,
patientsAccess), com mocks e `beforeEach` comuns em `src/test/appServicesMock.ts` e `src/test/appTestSetup.ts`.

## Invariantes — nunca quebrar

1. Token e dados de sessão/paciente só em memória; nunca em `localStorage`/`sessionStorage`; nunca no console.
   Storage só para preferência (tema, com consentimento), registro de consentimento e flags técnicas sem dado pessoal.
2. Trocar de clínica limpa o cache (`queryClient`) e o estado dependente; nunca misturar dados de clínicas.
3. Permissão no front é só UX; `ClinicaId` do front não é mecanismo de segurança.
4. Não trocar componente completo (DateInput, ComboboxField, tabelas, filtros, exportações) por versão simplificada.
5. Arquivo de produção ≤ 550 linhas; `shared/` e `services/` não importam de `features/` ou `app/` (`npm run audit:architecture`).
6. Telemetria só com consentimento de análise e sem dados pessoais.
7. Sem commit, push, merge ou deploy sem autorização explícita. PRs vão para `developer`.
8. Sem biblioteca nova quando as atuais resolvem; considere o bundle.

## Alto risco: plano curto antes, E2E depois

Login e seus modos, sessão, troca de clínica, permissões, navegação, fluxo multi-etapa, formulário com máscara/validação,
contrato com a API. Não implemente regra diferente da API para o mesmo requisito.

## UI

Funciona em 390, 820 e 1440 px sem scroll horizontal nem modal maior que a tela.
Preserve labels, roles, foco, teclado e `aria-*`. Playwright: seletores por role/label; não remova assertion para passar.

## Escopo

Menor mudança correta. Sem redesenho ou refatoração oportunista. Problema fora do escopo → reporte, não corrija.
Não presuma componente, hook, rota ou endpoint sem localizar no código.

## Documentação

- Rota nova ou mudança de acesso → atualize `src/routes.ts`, `appAccess.ts`, `README.md` e `TECHNICAL.md`
  (e a matriz em `hemodinks-api/scripts/generate_permissions_matrix.py`).
- Endpoint novo consumido → acrescente na tabela de contratos do `TECHNICAL.md`.
- `docs/` guarda registros de issues, QA e redesigns: não reescreva; marque o que ficou obsoleto.

## Pronto quando

Teste focado passa; `npm run verify` passa se mexeu em mais de um módulo; mobile validado se mudou visual.
O CI também roda `test:release-gate`, `test:performance`, `budget` e E2E desktop + responsivo: rode o que a mudança afeta.
Resposta final, só isto: o que mudou · arquivos principais · testes executados e resultado · riscos reais.

## Prioridade

Segurança > isolamento de dados > correção funcional > UX > acessibilidade > arquitetura > testes > performance > estética.
