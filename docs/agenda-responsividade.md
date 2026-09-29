# Agenda: responsividade e contexto de destinatários

## Análise e escopo

A Agenda já utilizava AgendaPage, useAgendaController, AgendaCalendarSection,
AgendaScheduleFields e os controles compartilhados TextField, SelectField,
CheckboxField, Button e IconButton. Esses componentes foram preservados.
As validações de datas, título, autorização e os contratos da API não foram alterados.

Foram reutilizados os breakpoints existentes: 980 px para o workspace, 760 px
para formulários e 520 px para telas pequenas. Não foi criado outro sistema de breakpoints.

## Comportamento

- Desktop e tablet com largura acima de 520 px: calendário mensal e lista do dia selecionado.
- Até 520 px: seleção direta de data, navegação anterior/próximo dia e lista do dia;
  a grade mensal e seus controles ficam ocultos. A seleção de data sincroniza o mês consultado.
- Até 760 px: datas e horários ficam em uma coluna. Acima disso, data e hora ficam lado a lado.
- Formulário organizado em informações, data/horário, notificações/lembretes,
  destinatários e ações. Cancelar/Criar evento ficam lado a lado quando há espaço
  e em largura integral no celular. Na edição, a ação continua Salvar evento.
- As ações permanecem no fluxo, evitando sobreposição de uma barra fixa ao teclado virtual.
- Destinatários não têm scroll interno. Nomes e mensagens podem quebrar linha.
- Após salvar, o feedback aparece na Agenda e a data do evento é selecionada.
  Falhas preservam o formulário. Novo evento usa a data selecionada.
- Fieldsets e legends identificam seções; botões de dia têm nome completo e estado
  de seleção; foco visível e controles de navegação com área mínima de 44 px.
- Menu, background, temas e estrutura principal foram preservados. Em 320 px,
  o título da Agenda comprimia as ações do cabeçalho e causava overflow de 16 px;
  a regra de flex-shrink foi corrigida apenas no contexto da Agenda.

## Isolamento de dados

A API no checkout já usa EventRecipientScope para filtrar usuários ativos e grupos
por ClinicaId do ator autenticado, incluindo vínculo ativo em UsuariosClinicas.
Os testes existentes verificam CRUD entre clínicas, médicos/grupos indevidos,
ClinicaId manipulado e headers incapazes de trocar o tenant.

O frontend agora invalida médicos, grupos e destinatários quando muda a sessão/clínica,
descarta respostas atrasadas e reinicia o estado da Agenda nessa transição. Se o
carregamento falhar, não reutiliza opções anteriores. A API permanece a autoridade.

A imagem de homologação, sozinha, não confirma a clínica dos registros. Não foi
inspecionado nem alterado o banco de homologação, e não houve deploy. É necessário
confirmar a versão publicada e os vínculos dos registros com a clínica selecionada
para concluir a investigação desse ambiente.

## Arquivos

Em src/features/events:
- AgendaPage.tsx: reinicialização por contexto e criação na data selecionada.
- useAgendaController.tsx: integração do hook e sincronização da data/mês após salvar.
- AgendaCalendarSection.tsx: navegação diária e nomes acessíveis dos dias.
- AgendaMobileDatePicker.tsx: navegação móvel reutilizando controles existentes.
- AgendaEventForm.tsx: composição do formulário.
- AgendaScheduleFields.tsx: seções de informações e data/horário.
- AgendaReminderSettings.tsx: controles existentes de lembretes extraídos.
- AgendaRecipients.tsx: seleção de usuários e grupos extraída.
- AgendaFormActions.tsx: ações de criação/edição e cancelamento.
- useAgendaRecipients.ts: carregamento vinculado ao contexto atual.
- events.css: responsividade, áreas de toque, quebra de linha e foco.
- AgendaEventForm.test.tsx e useAgendaRecipients.test.tsx: testes de composição,
  troca de clínica, falha e respostas fora de ordem.

Outros arquivos:
- src/layout/contextualFlows.ts: instrução da Agenda usa Criar evento.
- e2e/agenda-responsive-cases.ts: criação em 1440, 820, 390 e 320 px;
  datas, destinatários, retorno, overflow, acessibilidade e falha de gravação.
- e2e/hemodinks.spec.ts: registro dos cenários e expectativas compatíveis com
  Criar evento e navegação diária móvel, preservando verificações funcionais.

## Validação

- Build de produção e auditoria de arquitetura: aprovados.
- API: 35 testes de segurança, isolamento, lembretes e datas aprovados.
- E2E com API real: 11 aprovados, incluindo autenticação e troca de clínica.
- Frontend: 380 testes em 63 arquivos aprovados com `--maxWorkers=1`.
  Execuções concorrentes anteriores tiveram timeouts em App.test.tsx; não foram
  alterados esses testes, seus timeouts ou a autenticação para obter aprovação.
- A execução E2E completa detectou a expectativa antiga de grade mensal mobile,
  ajustada para verificar a navegação diária solicitada, e depois detectou overflow
  real em 320 px, corrigido na aplicação.
- E2E completo final: **82 aprovados, 0 falhas, 23 ignorados**, em 4,3 minutos,
  com `npm run test:e2e -- --fully-parallel --workers=2 --reporter=line`.
  Os ignorados são 12 gravações opcionais de tutoriais e 11 cenários com fixture
  de API real; esses 11 foram executados separadamente via LoginBrowserTests e passaram.
- Revalidação direcionada final da Agenda: 33 testes de frontend aprovados.
- E2E de criação validado em 1440, 820, 390 e 320 px, incluindo destinatários,
  retorno à data selecionada, acessibilidade e ausência de overflow horizontal.
- Build final aprovado; permanece o aviso existente do Vite sobre importação
  estática/dinâmica de observability.ts, sem erro de compilação.

A implementação está no commit `c8df531` do frontend. Na retomada foi confirmado
que a execução E2E terminou com sucesso e este relatório foi atualizado. Não houve
nova alteração funcional nem deploy nessa retomada.
