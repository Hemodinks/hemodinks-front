# Redesign do dashboard — 14/09/2026

O dashboard foi reorganizado em saudação e contexto, indicadores, pendências e ações rápidas. A navegação principal fica na sidebar; os dados da sessão e o logout ficam no menu do usuário. Conforme o ajuste solicitado, os fundos do menu e dos KPIs usam as cores antigas com 75% de transparência. Texto e ícones permanecem opacos. KPIs e ações rápidas ganham elevação e escala de 1,025 no hover, respeitando `prefers-reduced-motion`.

## Arquivos e componentes

Criados nesta implementação:

- `src/features/dashboard/DashboardStats.tsx`: indicadores autorizados, skeletons e indisponibilidade.
- `src/features/dashboard/DashboardPendingItems.tsx`: pendências e eventos recebidos do resumo, navegação e estado vazio.
- `src/features/dashboard/DashboardQuickActions.tsx`: até quatro ações existentes.
- `src/layout/UserMenu.tsx`: dados da sessão, fechamento por Escape/clique externo/saída de foco e logout.
- `src/app/useAppChrome.test.tsx`: isolamento do resumo, notificações e nome da clínica na mudança de sessão; resposta atrasada da clínica anterior.
- Este relatório, logs e capturas nesta pasta.

Alterados:

- `src/features/dashboard/DashboardPage.tsx`, `dashboard.css` e `DashboardPage.test.tsx`.
- `src/layout/Sidebar.tsx`, `Topbar.tsx`, `Topbar.test.tsx` e estilos `sidebar.css`, `topbar.css`, `navigation.css`.
- `src/app/AppMainContent.tsx`, `AuthenticatedAppContent.tsx`, `useAppChrome.ts`.
- `src/shared/components/ThemeToggle.tsx`.
- `src/App.test.tsx`, `src/test/appTestUi.tsx`, `e2e/hemodinks.spec.ts`, `e2e/login-real-api.spec.ts`.

Reutilizados: AppShell, Sidebar, Topbar, NavigationDrawer, Modal, UserAvatar, CompanyLogo, Breadcrumbs, ThemeToggle, AlertMessage, ToastMessage, APP_MODULES, ícones Lucide, tokens existentes e os fluxos de navegação/cadastro de pacientes. Os seletores dos tutoriais e a biblioteca foram preservados.

## Dados, autorização e isolamento

Sem mudanças no backend, nos endpoints, nos contratos ou no banco. Reutilizados `/api/dashboard/summary` e `/api/dashboard/notifications`, com a autenticação e os headers de clínica existentes. A inspeção do backend encontrou políticas de autorização, escopo de pacientes e filtros de tenant no DbContext; nenhum deles foi alterado.

A interface continua usando as permissões fornecidas por `getAppAccess`; ocultação de componentes não substitui autorização no servidor. Novo paciente utiliza `canCreatePatients` e o handler existente. O dashboard não cria consultas globais nem agrega dados financeiros no navegador.

O resumo e as notificações passaram a ser lidos diretamente das queries com chave de sessão/token, removendo cópias locais que poderiam reter dados antigos. A seleção autorizada de clínica emite a nova sessão pelo fluxo existente. Testes verificam que dados e respostas atrasadas da sessão anterior não aparecem na atual. O cache de queries continua sendo gerenciado pelo fluxo existente de sessão.

## Responsividade e acessibilidade

Verificadas larguras 1440, 1366, 1280, 1024, 768, 430, 390 e 360 px, incluindo 768 × 430 em landscape. KPIs passam de quatro para duas e uma coluna; ações passam para uma coluna no mobile. O menu lateral recolhe até 980 px e usa o drawer existente, com foco e Escape gerenciados pelo Modal. O menu do usuário fica dentro da viewport. Nenhum overflow horizontal foi detectado nesses cenários.

As verificações incluem temas claro/escuro, fundo, navegação, ações rápidas, transparência de 75% nos fundos, opacidade integral do conteúdo, escala no hover e redução de movimento. Axe não encontrou violações sérias/críticas nas rotas principais e no dashboard escuro em desktop/mobile. Capturas de desktop e mobile foram inspecionadas visualmente.

## Validação

- Auditoria de arquitetura: aprovada, sem violações de camada/tamanho.
- `npm run build`: aprovado; inclui typecheck TypeScript e build Vite.
- `npm test -- --maxWorkers=4`: **53 arquivos, 316 testes aprovados**.
- Suíte E2E completa: 77 cenários; 51 passaram inicialmente, três falharam e foram corrigidos, 23 foram ignorados pelas condições já existentes. As falhas eram seletor de logout, semântica ARIA do skeleton e comparação do fundo com duas camadas.
- Reexecução de acessibilidade, nova sessão sem acesso e dashboard responsivo: **5 aprovados**.
- Reexecução final do dashboard com transparência, hover, redução de movimento e acessibilidade escura: **1 aprovado**.
- O projeto não possui script de lint separado. Não foram removidos testes para obter aprovação.

## Decisões e limites

- Fundo HemoDinks preservado: imagem, estilos do app-shell, overlay, posição, escala, filtros e comportamento responsivo não foram alterados.
- Atividade recente omitida: não foi identificado um feed apropriado de atividade da clínica; não foram reaproveitados registros administrativos de auditoria para esse fim.
- Resumo é um contrato agregado. Falha na consulta apresenta indisponibilidade, sem inventar zeros; a navegação e as ações permanecem disponíveis.
- Pendências financeiras e notificações de pagamento existentes usam critérios distintos no backend. Não foram unificados nem apresentados como um único total de pendências; as linhas do painel encaminham ao módulo correspondente.
- Login normal/unificado, seleção de clínica, autorização, cadastro, faturamento, notificações, recuperação de sessão, ajuda e tutoriais mantêm seus fluxos existentes.
- Os 23 E2E ignorados são 11 cenários que exigem `HEMODINKS_LOGIN_FIXTURE` com API/banco provisionados e 12 cenários de gravação local de tutoriais. A suíte executada utiliza fixtures de teste, não dados de produção. Não foi executada validação integral contra API real; isso limita a comprovação ponta a ponta do isolamento no servidor.
- O gatilho flutuante de ajuda existente continua sobre a borda direita no mobile. Seu comportamento foi preservado.

## Ajuste solicitado: cores das ações e transparência de 75%

Painel usa vermelho (#dc2626). Novo paciente/consulta, Faturamento, Agenda e Gerenciar usuários reutilizam respectivamente as cores de pacientes, faturamento, agenda e usuários em APP_MODULES. Os fundos dos KPIs e das ações têm 25% de opacidade (75% transparentes). No menu, essa opacidade é aplicada especificamente enquanto o dashboard está ativo, incluindo o drawer; as outras telas mantêm 50%. Textos e ícones continuam opacos. Pendências ganha título com sino, borda lateral e fundo suave em âmbar. Layout, plano de fundo e hover preservados.

Arquivos deste ajuste: DashboardPage.tsx, DashboardQuickActions.tsx, DashboardPendingItems.tsx, dashboard.css, AppShell.tsx, sidebar.css, appModules.ts e e2e/hemodinks.spec.ts, além das evidências nesta pasta.

Validação deste ajuste: build/typecheck aprovado, 9 testes de componentes aprovados e E2E do dashboard aprovado nas oito larguras, com transparência, hover, movimento reduzido e acessibilidade em tema escuro.
