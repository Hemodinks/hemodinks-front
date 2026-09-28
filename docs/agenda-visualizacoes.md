# Agenda: Mês, Semana e Lista

## Análise e decisões

O GET `/api/events/` já consulta sobreposição por `from`/`to`, usa `AsNoTracking`, inclui responsável e médico em uma consulta EF e aplica `EventFeatureRules.ApplyScope`. Os eventos não possuem tipo/categoria. `UserId` é o responsável; destinatários de notificações não constituem uma lista persistida no DTO do evento. Não foram inventados tipos nem um filtro de destinatário. Não havia preferência de visualização persistida: Mês permanece o padrão.

## API

O mesmo endpoint aceita agora parâmetros opcionais `search` (título/descrição, até 200 caracteres), `userId` (responsável positivo) e `isCompleted` (situação). Os filtros são combinados por AND depois do escopo de clínica/perfil e executados no banco. FluentValidation rejeita período invertido, responsável inválido e busca excessiva. O retorno continua sendo `EventDto[]`; POST, PUT, exclusão, notificações e regras de tenant não foram alterados. Nenhuma migração ou endpoint novo.

A consulta de eventos continua sem N+1 para responsável/médico; a ordenação ganhou desempate por ID. O processamento de lembretes que já existia no GET foi preservado e pode contribuir para sua latência. Não há medição de volume ou latência da produção nesta execução.

## UI e carregamento

- Mês reutiliza `AgendaMonthGrid` e o comportamento mobile existentes (grade de 42 dias).
- Semana apresenta segunda a domingo em ordem cronológica, com eventos que atravessam dias em cada dia atingido, sem grade de horas vazias.
- Lista apresenta os eventos do mês em ordem de data, agrupados em Dias anteriores, Hoje, Amanhã e Próximos dias. Eventos em andamento são exibidos uma vez.
- Busca por título/descrição com debounce de 300 ms, situação e responsável (todos os permitidos / o próprio usuário). O período é controlado pelos botões de mês/semana.
- `AgendaEventCard` reutiliza as ações e permissões existentes nas três visões. Selecionar um dia preserva a data do novo evento.
- Reutilizados breakpoints globais 980/760/520 px. Semana fica em duas colunas abaixo de 980 e uma abaixo de 760; filtros também passam a uma coluna. Lista e navegação de período funcionam no mobile.
- `useAgendaEvents` mantém somente o último intervalo carregado em memória, identificado por clínica, usuário, token e filtros. Um intervalo contido reutiliza os dados; não há cache persistente ou compartilhado entre clínicas. Requisições em andamento compatíveis são compartilhadas; respostas obsoletas são descartadas. Salvar invalida o cache; concluir/excluir/Atualizar recarregam.
- Nenhuma chamada por dia. Fora do intervalo carregado, Semana busca sete dias; Lista busca o mês; Mês busca a grade. Não há paginação que possa esconder eventos no calendário. Para clínicas com volume extremo mesmo dentro de um mês, uma futura paginação exclusiva da lista pode ser avaliada com medição real.

## Arquivos principais

API: EventEndpointExtensions.Queries, EventQueries, EventQueryHandlers e EventQueryValidator.
Frontend: AgendaPage, AgendaCalendarSection, AgendaEventCard, AgendaPeriodView, AgendaViewToolbar, agendaViews, useAgendaController, useAgendaEvents, agenda-views.css e eventsService.

## Testes

Novos testes de API cobrem filtros combinados, período, validações e isolamento por clínica/perfil. Frontend cobre agrupamento, virada de mês/ano, eventos entre dias, permissões, serialização, cache e respostas atrasadas. E2E cobre Mês/Semana/Lista, busca, filtros, contagem de requests, navegação, data do cadastro, acessibilidade e ausência de overflow em desktop/mobile.

Resultados finais serão registrados após a execução completa.
