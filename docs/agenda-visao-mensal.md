# Agenda mensal: eventos nas células

## API e análise de performance

O endpoint existente GET /api/events/?from=...&to=... foi reutilizado.
Os filtros são inclusivos: End >= from e Start <= to. A consulta aplica o escopo
já existente do usuário/clínica, AsNoTracking, ordenação por início/título e
Include das duas referências User e MedicalUser. Não há lazy loading por célula
nem N+1 de leitura das referências na listagem. Existe índice composto em
(ClinicaId, Start, End, IsCompleted). Não houve alteração de endpoint, contrato,
autorização, tenant, persistência ou processamento de lembretes.

O DTO inclui identificação, título, descrição, início/fim, nomes dos usuários e
estado de lembrete/conclusão. Ele não informa a quantidade consolidada de
destinatários; a interface não inventa essa contagem nem chama outros endpoints
por evento para obtê-la.

A grade tem 42 dias, incluindo dias dos meses adjacentes. Antes o frontend enviava
o limite final à meia-noite do último dia, omitindo eventos posteriores nesse dia.
Agora envia 23:59:59.999 do último dia local, convertido a UTC, preservando o
contrato inclusivo e o comportamento de timezone existente.

Não havia cache de eventos no serviço HTTP. Não foi criado cache persistente:
requisições simultâneas do mesmo intervalo/sessão compartilham a Promise em voo,
inclusive no replay de efeitos do StrictMode. Ao voltar a um mês já visitado,
a API é consultada novamente. Respostas atrasadas de outro intervalo são
ignoradas; os dados anteriores são limpos durante o carregamento.

Limitação existente: GetEventsQueryHandler também executa ProcessDueRemindersAsync.
No provider relacional esse processamento faz claim e leitura por evento vencido,
além da resolução de destinatários, em lote de até 100. Portanto o GET completo
pode ter custo proporcional ao lote de lembretes, embora a consulta da listagem
não tenha N+1. Esse comportamento foi preservado para não alterar regras de envio.
O volume real, plano SQL e latência de homologação/produção não foram medidos.
Não foi aplicado limite de resultados que pudesse ocultar eventos do calendário.

## Frontend

- AgendaMonthGrid.tsx: até dois eventos por célula; horário, título e +N eventos.
- agendaMonth.ts: índice memoizado por dia, ordenação e suporte a eventos que
  atravessam dias, limitado ao intervalo da grade.
- AgendaCalendarSection.tsx: clique em evento foca seu cartão; +N seleciona o dia
  e foca a lista completa. Nenhum desses cliques requer HTTP adicional no mês atual.
- useAgendaController.tsx: limite final correto, controle de respostas atrasadas,
  compartilhamento da requisição em andamento e seleção do primeiro dia ao trocar mês.
- events.css: seleção teal, hoje com indicador/contorno, dias com eventos marcados,
  dias adjacentes atenuados, controles irmãos sem botões aninhados e foco visível.
- A lista mantém horário completo quando o evento atravessa dias, descrição,
  estado de lembrete/conclusão e ações existentes. Sem eventos: “Nenhum evento nesta data.”
- Novo evento continua usando a data selecionada. O formulário, background, menu,
  breakpoints e visão diária mobile foram preservados.

## Testes e métricas

- agendaMonth.test.ts: mês vazio, grade com dias adjacentes, ordenação e evento multidia.
- useAgendaController.test.tsx: intervalo completo, seleção sem request, navegação,
  resposta fora de ordem e deduplicação durante StrictMode.
- e2e/agenda-month-cases.ts: fixture de 300 eventos (45.985 bytes de JSON sintético),
  hoje/seleção/dias adjacentes, previews, +N, foco, mês vazio, mudança de mês e Axe.
  Uma consulta inicial, zero chamadas adicionais por seleção/clique/+N e uma por
  mudança de mês: três chamadas para setembro → outubro → setembro; uma quarta chamada ao clicar
  no evento de agosto exibido na borda da grade. O foco no cartão foi validado após essa consulta.
  O tempo registrado como loginAndRenderMs inclui login e renderização com mocks;
  não representa latência da API real. A evidência fica em month-metrics.json no
  diretório test-results do cenário mensal.
- API: novo ApiEndpointAgendaIntervalTests.cs cobre eventos dentro/fora do intervalo,
  sobreposição e evento à noite no último dia. Segurança e datas foram reexecutadas:
  33 testes aprovados.
- O teste de acessibilidade detectou contraste insuficiente no número de “hoje”.
  A aplicação foi corrigida usando os tokens ink/input-bg, sem desabilitar a regra.

Resultados finais:
- Frontend da Agenda: 38 testes aprovados em 5 arquivos.
- E2E completo da Agenda e teste de overflow: 8 aprovados, 0 falhas; 1 gravação
  opcional de tutorial ignorada. Inclui cadastro em 1440, 820, 390 e 320 px.
- Build de produção e auditoria de arquitetura aprovados. Permanece apenas o aviso
  existente de importação estática/dinâmica de observability.ts no Vite.
- Nenhum deploy ou commit foi realizado neste incremento.
