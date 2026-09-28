# Destinatários e lembretes da Agenda

## Regras encontradas e preservadas

O domínio contém Administrador (1), Médicos (2), Pacientes (3), Controller (4),
SuperAdministrador (5) e Equipe (6). Nenhum perfil foi criado.

Destinatários da mensagem são resolvidos por EventRecipientScope.AllowedUsers e
AllowedGroups a partir do ator autenticado e da clínica ativa. Usuários precisam
estar ativos, com identidade global, vínculo e clínica ativos. A API valida os IDs
individuais e grupos em POST e PUT. Os filtros de busca/perfil são aplicados depois
do escopo autorizado. Contagem e paginação também usam esse mesmo escopo.

Para Administrador/SuperAdministrador/Controller, “Todos” exclui pacientes e o
próprio remetente. Médicos podem enviar a administradores, superadministradores e
controllers; grupos próprios continuam sendo uma seleção separada. Equipes ficam
restritas aos membros permitidos. O rótulo anterior de “Todos” para médicos
mencionava médicos de grupos, embora estes dependessem de seleção separada;
o texto foi corrigido sem ampliar permissões.

“Notificar perfil médico” não é a mesma operação da mensagem imediata. O flag
NotifyMedicalProfile habilita lembretes e participa da visibilidade do evento.
MedicalUserId preenchido seleciona um médico; vazio alcança os médicos ativos
permitidos na clínica, restritos aos membros no contexto de equipe. Esses campos,
a autorização e suas dependências foram mantidos.

O primeiro lembrete começa na janela de dois dias antes do início; se a janela
já começou, fica elegível para o próximo processamento. O período é uma repetição
(15 minutos a 7 dias), inclusive após o início, até a conclusão. Não é antecedência
configurável. A interface explica o início fixo e mantém “Repetir lembrete — A cada…”.
As configurações desaparecem quando ambos NotifyUser e NotifyMedicalProfile estão
desligados. Se apenas o usuário desligar, a repetição dos médicos permanece visível,
com explicação, preservando o comportamento existente.

NotificationMessage já tinha máximo de 500 caracteres na aplicação e no banco.
O contador reutiliza esse limite. A mensagem e seus destinatários são persistidos
em AgendaNotifications ao salvar, não como uma lista de distribuição editável no
Event. Na edição o formulário continua limpo para não reenviar mensagens antigas
por acidente; novos destinatários/mensagem geram um novo envio e o histórico fica.

## Mudança de contrato da API

O endpoint existente GET /api/events/notification-recipients aceita agora:

- search: nome do usuário, até 100 caracteres; busca sem distinção de maiúsculas.
- profile: all, medical ou administrative. Administrative corresponde apenas aos
  perfis reais Administrador, SuperAdministrador e Controller.
- page: a partir de 1, até 100000.
- pageSize: padrão 20, máximo 50.

A resposta preserva users, groups, allRecipientsLabel e canNotifyAllAllowedRecipients,
e acrescenta totalUsers (após filtros), page e pageSize. Users agora é paginado
mesmo sem parâmetros: consumidores que esperavam a lista completa devem paginar.
Frontend e API devem ser publicados juntos para oferecer busca/paginação corretas.
Não foram alterados contratos de POST/PUT nem adicionados campos de tenant ao cliente.
NotifyAllAllowedRecipients é resolvido sobre o conjunto autorizado completo,
independentemente da busca, filtro ou página. Grupos continuam independentes.

FluentValidation rejeita parâmetros inválidos. EF Core executa filtros, Count,
ordenação estável e Skip/Take antes de materializar os usuários. Não se carregam
usuários de outras clínicas para depois escondê-los no frontend.

## Interface e componentes

- AgendaRecipients: modos específicos/todos, mensagem com contador, grupos e limpeza.
- AgendaRecipientUsers: busca com debounce no hook, filtros reais de perfil, seleção
  individual, contagem, nome/perfil separados com aria-describedby e paginação acessível.
- useAgendaRecipients: respostas vinculadas à clínica/sessão/consulta; respostas
  atrasadas são descartadas; médicos reaproveitam a consulta na mesma sessão.
- AgendaReminderSettings: descrição explícita do alcance médico e da periodicidade;
  opções de 15 minutos e 7 dias já suportadas pela API; períodos personalizados
  existentes permanecem visíveis na edição.
- AgendaPage, AgendaEventForm e useAgendaController: passagem dos controles de busca.
- services/eventsService.ts e types.ts: novos parâmetros/metadados da consulta.
- events.css: nome/perfil, áreas de toque e paginação responsiva.

As escolhas individuais persistem entre páginas e filtros. Contagem de usuários
individuais e de grupos é separada para não inventar um total com membros duplicados.
Foi escolhida paginação no servidor em vez de virtualização de uma lista completa.
Grupos e o seletor específico de médicos mantêm o carregamento anterior; não foram
introduzidos novos filtros de autorização ou consolidados com a mensagem imediata.

## Testes

- AgendaRecipientQueryTests: busca/perfil antes da paginação, 25 médicos em duas
  páginas, perfis administrativos, validações e “Todos” além da primeira página.
- ApiEndpointAgendaRecipientsTests: busca não expõe outra clínica, manipulação de
  destinatário estrangeiro é rejeitada, “Todos” permanece na clínica, criação e
  edição persistem lembretes e não duplicam notificações anteriores.
- AgendaRecipients.test.tsx: nomes/perfis acessíveis, contagem, limite da mensagem,
  modos todos/específicos e independência dos lembretes médicos.
- useAgendaRecipients.test.tsx: busca e perfil enviados à API, reset da página,
  respostas atrasadas e troca de clínica.
- useAgendaController.test.tsx: serialização e preservação dos lembretes na edição.
- e2e/agenda-recipient-cases.ts: seleção entre páginas, filtro médico, busca, mensagem,
  acessibilidade Axe, criação, edição, desligamento e envio para todos.
- A fixture E2E foi alinhada ao DTO real para devolver medicalUserId e período nulo
  quando desativado; esses comportamentos foram validados também com API real.

Resultados finais registrados após o encerramento das verificações.
