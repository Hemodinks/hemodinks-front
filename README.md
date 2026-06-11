# Hemodinks Front

Aplicacao web do Hemodinks para administradores, medicos e pacientes. O front e uma SPA em React/Vite com rotas autenticadas, dashboard, usuarios, pacientes, agenda, exportacao de relatorios e integracao com CBHPM.

## Stack

- React 19
- TypeScript
- Vite 7
- React Router
- TanStack Query
- Vitest + Testing Library
- Playwright
- lucide-react
- jsPDF + jsPDF AutoTable carregados sob demanda
- rollup-plugin-visualizer para auditoria de bundle

## URLs

| Recurso | URL |
| --- | --- |
| Front local | `http://localhost:5173` |
| Front producao | `https://hemodinks-saude.vercel.app` |
| API local | `http://localhost:5000` |
| Swagger API local | `http://localhost:5000/swagger` |
| Scalar API local | `http://localhost:5000/scalar` |

## Requisitos

- Node.js 22 recomendado
- npm
- Chromium do Playwright para testes E2E

Em uma maquina nova:

```powershell
npm ci
npx playwright install chromium
```

## Configuracao

O front usa `VITE_API_URL` para localizar a API. Se a variavel nao existir, o codigo usa `http://localhost:5000`.

```powershell
Copy-Item .env.example .env.local
```

Exemplo local:

```text
VITE_API_URL=http://localhost:5000
```

Exemplo producao/homologacao:

```text
VITE_API_URL=https://<api-publica>
```

## Executar

```powershell
npm run dev
```

O Vite sobe em `http://localhost:5173` por padrao. O script usa `--host 0.0.0.0`, entao tambem aceita acesso pela rede local.

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | inicia o Vite em modo desenvolvimento |
| `npm run build` | roda TypeScript e gera `dist` |
| `npm run analyze` | gera build com relatorio em `dist/bundle-stats.html` |
| `npm test` | roda testes unitarios/integracao com Vitest |
| `npm run test:e2e` | roda testes E2E com Playwright |
| `npm run preview` | serve o build gerado em `dist` |

## Rotas

| Rota | Tela |
| --- | --- |
| `/` | redireciona para dashboard |
| `/dashboard` | painel inicial |
| `/usuarios` | listagem/cadastro/edicao de usuarios |
| `/pacientes` | listagem/cadastro/edicao/exportacao de pacientes |
| `/agenda` | agenda e cadastro de eventos |

## Funcionalidades

- login com JWT e persistencia local de sessao
- troca obrigatoria de senha no primeiro acesso
- reset de senha
- dashboard com resumo e notificacoes
- CRUD de usuarios
- CRUD de pacientes
- upload, listagem e exclusao de arquivos
- filtros administrativos de pacientes
- agenda com calendario e eventos
- modal CBHPM com filtros por codigo, procedimento e porte
- selecao de procedimentos CBHPM no cadastro/edicao de paciente
- exportacao de pacientes em XLSX e PDF
- tema claro/escuro
- layout responsivo testado em 360px, 390px e 768px
- modais com fechamento por ESC, foco inicial e restauracao de foco

## Arquitetura Resumida

O projeto segue uma divisao por dominio em `src/features`:

```text
src/
  features/
    auth/
    dashboard/
    events/
    patients/
    users/
  layout/
  shared/
  styles/
```

Pontos principais:

- `src/App.tsx` orquestra sessao, rotas, layout e modais globais.
- `src/routes.ts` mapeia as rotas da SPA.
- `src/queryClient.ts` centraliza configuracao do TanStack Query.
- `src/shared/queryKeys.ts` centraliza chaves de cache.
- `src/features/users/useUsersDomain.ts` coordena o dominio de usuarios.
- `src/features/patients/usePatientsDomain.ts` coordena o dominio de pacientes.
- hooks menores (`useUserList`, `useUserForm`, `usePatientList`, `usePatientForm`, `usePatientLookups`, `useCbhpmLookup`) isolam estados de lista, formulario e lookups.
- paginas e modais principais sao carregados com `React.lazy`.
- bibliotecas pesadas de PDF sao carregadas apenas no momento da exportacao PDF.

Mais detalhes em [TECHNICAL.md](./TECHNICAL.md).

## Cache e API

O front usa TanStack Query para leituras principais e mutacoes de usuarios/pacientes.

Cache atual:

- dashboard summary
- notificacoes
- usuarios
- pacientes
- usuarios medicos
- hospitais
- convenios
- CBHPM

As invalidacoes passam por `queryKeys`, evitando chaves duplicadas ou inconsistentes.

## CBHPM

Endpoint usado pelo modal:

```http
GET /api/cbhpm?page=1&pageSize=10&codigo=&procedimento=&porte=
Authorization: Bearer <token>
```

Ao selecionar um item, o formulario de paciente recebe:

- `cbhpmCodigo`
- `cbhpmPorte`
- `procedimento`
- `procedimentos`

O backend continua responsavel por validar o codigo antes de salvar.

## Testes e Qualidade

Rodar a suite principal:

```powershell
npm test
npm run build
npm run test:e2e
npm run analyze
```

Cobertura atual:

- testes unitarios/integracao para API e App
- E2E de navegacao autenticada
- E2E de responsividade mobile em telas criticas
- E2E de cadastro e edicao de paciente
- E2E de exportacao XLSX
- auditoria de bundle via `dist/bundle-stats.html`

## Deploy

Detalhes de Vercel, Render, homologacao e checklist de validacao em [DEPLOYMENT.md](./DEPLOYMENT.md).
