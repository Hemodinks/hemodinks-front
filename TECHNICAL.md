# Documentacao Tecnica

## Visao Geral

O Hemodinks Front e uma SPA React/Vite. A aplicacao centraliza autenticacao, navegacao, layout e modais globais em `App.tsx`, enquanto cada dominio vive em `src/features`.

Principios atuais:

- manter React + Vite como base
- carregar telas e modais sob demanda
- usar TanStack Query para cache, refetch e mutacoes
- manter hooks de dominio menores e testaveis
- preservar responsividade real em mobile
- validar fluxos criticos com Vitest e Playwright

## Estrutura

```text
src/
  api.ts
  App.tsx
  appTypes.ts
  main.tsx
  queryClient.ts
  routes.ts
  setupTests.ts
  types.ts
  features/
    auth/
    dashboard/
    events/
    patients/
    users/
  layout/
  shared/
    components/
    hooks/
    utils/
    queryKeys.ts
  styles/
```

Responsabilidades:

| Caminho | Responsabilidade |
| --- | --- |
| `src/api.ts` | cliente HTTP e contratos de endpoint |
| `src/App.tsx` | sessao, rotas, layout, modais globais e integracao entre dominios |
| `src/routes.ts` | mapeamento entre views internas e paths da SPA |
| `src/queryClient.ts` | configuracao global do TanStack Query |
| `src/shared/queryKeys.ts` | chaves padronizadas de cache/invalidation |
| `src/features/auth` | login, troca de senha obrigatoria e persistencia de sessao |
| `src/features/dashboard` | painel inicial e notificacoes |
| `src/features/events` | agenda e eventos |
| `src/features/users` | listagem, formulario, arquivos e contato de usuarios |
| `src/features/patients` | listagem, formulario, CBHPM, arquivos e exportacoes |
| `src/layout` | shell, sidebar, topbar e navegacao visual |
| `src/shared/components` | componentes reutilizaveis, incluindo modal acessivel |
| `src/shared/hooks` | hooks transversais |
| `src/shared/utils` | formatadores, validadores, leitura de arquivos e utilitarios de listagem |

## Rotas e Navegacao

Rotas publicas da SPA:

| Path | View interna |
| --- | --- |
| `/` | `dashboard` |
| `/dashboard` | `dashboard` |
| `/usuarios` | `users` |
| `/pacientes` | `patients` |
| `/agenda` | `agenda` |

`useRouteView` sincroniza URL, permissoes e view ativa. Usuarios sem permissao para determinada view sao redirecionados para uma rota permitida.

## Autenticacao

`useAuthSession` controla:

- leitura da sessao em `localStorage`
- persistencia do token JWT
- limpeza de sessao no logout
- dados basicos do usuario logado

Chave local:

```text
hemodinks.session
```

Quando o usuario precisa trocar senha, o app bloqueia a area interna e mostra `PasswordRequiredScreen`.

## Dados, Cache e Mutacoes

O projeto usa TanStack Query.

Configuracao global em `src/queryClient.ts`:

- `staleTime`: 30 segundos
- `gcTime`: 5 minutos
- `refetchOnWindowFocus`: false
- `queries.retry`: 1
- `mutations.retry`: 0

Chaves ficam em `src/shared/queryKeys.ts`.

Leituras cacheadas:

- dashboard summary
- notificacoes
- usuarios
- pacientes
- usuarios medicos
- hospitais
- convenios
- CBHPM

Mutacoes com `useMutation`:

- criar/editar usuario
- excluir usuario
- excluir arquivo de usuario
- criar/editar paciente
- excluir paciente
- excluir arquivo de paciente

Depois de mutacoes, invalidar usando `queryKeys`, nunca arrays soltos duplicados.

Exemplo:

```ts
queryClient.invalidateQueries({ queryKey: queryKeys.pacientesRoot(token) });
```

## Usuarios

Arquivos principais:

- `src/features/users/useUsersDomain.ts`
- `src/features/users/useUserList.ts`
- `src/features/users/useUserForm.ts`
- `src/features/users/UserList.tsx`
- `src/features/users/UserForm.tsx`
- `src/features/users/UserModals.tsx`

Fluxo:

1. lista usa `useQuery` com paginacao e busca
2. formulario normaliza payload via `userUtils`
3. criacao/edicao usa `useMutation`
4. arquivos sao validados antes de upload
5. cache de usuarios, medicos e dashboard e invalidado apos mudancas

## Pacientes

Arquivos principais:

- `src/features/patients/usePatientsDomain.ts`
- `src/features/patients/usePatientList.ts`
- `src/features/patients/usePatientForm.ts`
- `src/features/patients/usePatientLookups.ts`
- `src/features/patients/useCbhpmLookup.ts`
- `src/features/patients/PatientList.tsx`
- `src/features/patients/PatientForm.tsx`
- `src/features/patients/CbhpmLookupModal.tsx`
- `src/features/patients/patientExport.ts`
- `src/features/patients/patientUtils.ts`

Fluxo:

1. lista usa `useQuery` com pagina, busca e filtros administrativos
2. lookups de hospitais, convenios e medicos ficam cacheados
3. formulario valida CPF, telefone, hospital e procedimento
4. CBHPM alimenta `procedimentos` e campos principais do payload
5. criacao/edicao/exclusao usa `useMutation`
6. exportacao XLSX usa geracao local de arquivo
7. exportacao PDF carrega `jspdf` e `jspdf-autotable` sob demanda

## Agenda

Arquivo principal:

- `src/features/events/AgendaPage.tsx`

Responsabilidades:

- renderizar calendario mensal
- destacar data atual
- listar eventos por data
- criar/editar/concluir/excluir eventos conforme permissao
- carregar feriados nacionais
- manter formulario utilizavel em desktop e mobile

## Modais e Acessibilidade

`src/shared/components/Modal.tsx` padroniza:

- `role="dialog"`
- `aria-modal="true"`
- fechamento com ESC
- clique no backdrop
- foco inicial
- restauracao de foco ao fechar

Componentes migrados para esse padrao:

- modal de senha
- informacoes/contato de usuario
- notificacoes
- informacoes/arquivos de paciente
- busca CBHPM

## Responsividade

Pontos cobertos:

- agenda em mobile
- formularios longos
- tabelas com carrossel horizontal interno
- filtros e exportacoes de pacientes
- modais com largura/altura controladas

Viewports E2E usados:

```text
360px
390px
768px
```

Regra esperada: o documento nao deve gerar scroll horizontal global nessas larguras.

## Performance

Otimizacoes atuais:

- code splitting por pagina/modal com `React.lazy`
- PDF export carregado apenas ao exportar PDF
- cache de API via TanStack Query
- chaves de cache centralizadas
- lookups cacheados por mais tempo
- build analyzer configurado
- lista de pacientes/usuarios paginada no backend

Comando:

```powershell
npm run analyze
```

Saida:

```text
dist/bundle-stats.html
```

Ao revisar o bundle, observar especialmente:

- chunk principal
- chunks de `jspdf`
- chunks de `html2canvas`
- modais e paginas lazy

## Testes

Unitarios/integracao:

```powershell
npm test
```

E2E:

```powershell
npm run test:e2e
```

Build:

```powershell
npm run build
```

Playwright em maquina nova:

```powershell
npx playwright install chromium
```

Arquivos principais:

- `src/api.test.ts`
- `src/App.test.tsx`
- `e2e/hemodinks.spec.ts`
- `playwright.config.ts`

Cobertura E2E atual:

- navegacao autenticada
- dashboard, pacientes e agenda
- ausencia de overflow horizontal em mobile
- cadastro de paciente
- edicao de paciente
- exportacao XLSX

## Contratos de API

Base URL:

```text
VITE_API_URL
```

Fallback local:

```text
http://localhost:5000
```

Endpoints usados:

| Metodo | Path | Uso |
| --- | --- | --- |
| `POST` | `/api/users/authenticate` | login |
| `POST` | `/api/users/password/reset` | reset de senha |
| `PUT` | `/api/users/{id}/password` | troca de senha |
| `GET` | `/api/dashboard/summary` | resumo dashboard |
| `GET` | `/api/dashboard/notifications` | notificacoes |
| `GET` | `/api/users/` | listar usuarios |
| `GET` | `/api/users/{id}` | detalhe de usuario |
| `POST` | `/api/users/` | criar usuario |
| `PUT` | `/api/users/{id}` | editar usuario |
| `DELETE` | `/api/users/{id}` | excluir usuario |
| `POST` | `/api/users/{id}/arquivos` | upload de arquivo de usuario |
| `DELETE` | `/api/users/{id}/arquivos/{arquivoId}` | excluir arquivo de usuario |
| `GET` | `/api/pacientes/` | listar pacientes |
| `GET` | `/api/pacientes/{id}` | detalhe de paciente |
| `POST` | `/api/pacientes/` | criar paciente |
| `PUT` | `/api/pacientes/{id}` | editar paciente |
| `DELETE` | `/api/pacientes/{id}` | excluir paciente |
| `POST` | `/api/pacientes/{id}/arquivos` | upload de arquivo de paciente |
| `DELETE` | `/api/pacientes/{id}/arquivos/{arquivoId}` | excluir arquivo de paciente |
| `GET` | `/api/hospitais/` | lookup de hospitais |
| `GET` | `/api/convenios/` | lookup de convenios |
| `GET` | `/api/cbhpm/` | busca CBHPM |
| `GET` | `/api/events/` | listar eventos |
| `POST` | `/api/events/` | criar evento |
| `PUT` | `/api/events/{id}` | editar evento |
| `POST` | `/api/events/{id}/complete` | concluir evento |
| `DELETE` | `/api/events/{id}` | excluir evento |
| `GET` | `/api/events/medical-users` | medicos da agenda |

## Convencoes de Manutencao

- preferir hooks pequenos por dominio
- usar `queryKeys` para toda chave de cache nova
- usar `useQuery` para leitura remota persistente
- usar `useMutation` para criacao/edicao/exclusao
- invalidar caches afetados depois de mutacoes
- manter imports pesados em `import()` dinamico quando forem usados raramente
- manter controles acessiveis por label, title ou aria-label
- ao mexer em layout mobile, rodar `npm run test:e2e`
- ao mexer em exportacao ou PDF, rodar `npm run analyze`
- ao adicionar rota nova, atualizar `routes.ts`, `README.md` e este documento

## Checklist Para Mudancas Grandes

Antes de abrir PR ou publicar:

```powershell
npm test
npm run build
npm run test:e2e
npm run analyze
```

Validar manualmente:

- login e logout
- rota direta no navegador
- mobile 360px
- agenda
- formulario de usuario
- formulario de paciente
- CBHPM
- exportacao XLSX/PDF
- modais com ESC
