# Transparência global — 14/09/2026

- Menu em todas as rotas, KPIs, ações rápidas e pendências: **70% de transparência / 30% de opacidade** no fundo colorido.
- Controles de ação: **60% de transparência / 40% de opacidade**, incluindo hover, editar, excluir, gerar senha, informações/contato, observações, salvar, anexar, exportar, seletores e acionadores de data.
- As cores dos módulos permanecem as mesmas. Textos e ícones usam a cor de conteúdo do tema, sem aplicar opacidade ao componente inteiro. Estados de desabilitado, foco e redução de movimento foram preservados.
- Removida a exceção do dashboard: a navegação não muda mais a transparência do menu.
- Plano de fundo, imagens, overlay, layout, endpoints, regras de negócio e permissões não foram alterados nesta etapa.

## Arquivos editados nesta etapa

- `src/styles/base.css`: três tokens compartilhados de opacidade.
- `src/layout/AppShell.tsx`: remoção da classe condicional de transparência.
- `src/layout/styles/sidebar.css`, `navigation.css`, `contextual-flow-drawer.css`.
- `src/features/dashboard/dashboard.css`.
- `src/shared/components/styles/actions.css`, `fields.css`, `forms.css`, `tables.css`, `utilities.css`, `modal-confirmation.css`.
- `src/features/patients/styles/workspace.css`, `patient-observations.css`, `cbhpm.css`.
- `src/features/users/temporary-password.css`.
- `src/features/clinics/clinics.css`.
- `src/features/events/events.css`.
- `src/features/billing/billing.css`.
- `src/features/reports/reports.css`.
- `src/features/tutorials/tutorials.css`.
- `e2e/hemodinks.spec.ts`: percentuais atualizados e teste de consistência entre dashboard, usuários e formulário, incluindo ações e acionadores de data.

A aparência do calendário nativo aberto por `input[type=date]` é controlada pelo navegador/sistema operacional. O botão do seletor dentro da aplicação recebe a transparência definida; nenhum componente nativo foi substituído.

## Resultado da validação

Build/typecheck e auditoria de arquitetura aprovados. E2E completo: 54 aprovados inicialmente e um teste novo corrigido para aguardar o carregamento, aprovado na reexecução. Total de 55 cenários aprovados; 23 ignorados pelas condições já existentes (API real provisionada e gravação de tutoriais). Inclui acessibilidade, dashboard nas oito larguras e verificação dos valores computados de alpha 0,3 e 0,4 entre rotas. Capturas de usuários e formulário em `usuarios-transparencia.png` e `formulario-transparencia.png`.
