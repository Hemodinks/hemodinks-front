# Notificação de eventos por e-mail

Após criar um evento, quem pode gerenciá-lo pode usar **Notificar por e-mail**,
conferir os destinatários e confirmar. A confirmação coloca os envios na fila;
não representa entrega na caixa de entrada. Eventos concluídos não permitem envio.

Os destinatários vêm das notificações persistidas na criação do evento. Não são
aceitos endereços, IDs de destinatários ou clínica enviados pelo navegador.
O histórico atual não registra uma nova lista de participantes ao editar um
evento; este comportamento anterior não foi alterado.

## Segurança e processamento

- GET/POST `/api/events/{id}/email-notification` validam a clínica autenticada,
  a visibilidade do evento e a permissão de gerenciamento, inclusive para equipes.
- Remetente, operador, destinatários, vínculos e endereços são revalidados antes
  do processamento; grupos e equipes seguem os escopos existentes.
- A fila `EventEmailDeliveries` possui índices únicos por clínica/evento/usuário
  e clínica/evento/endereço. Reservas de processamento evitam disputa entre workers.
- São enviados e-mails individuais em texto. Mensagens, endereços, tokens e chaves
  não são adicionados aos logs desse fluxo.
- O worker executa em lotes de até 100, com até três tentativas. Falhas definitivas
  são exibidas na prévia; reenvio manual não faz parte desta ação.
- SMTP não garante exatamente uma entrega: falhas após aceitação pelo servidor
  e antes do registro de sucesso podem provocar repetição na próxima tentativa.

## Ativação após revisão

1. Aplicar a migração aditiva `20261011174221_AddEventEmailDeliveries` pelo processo
   usual de publicação da API. Ela não foi aplicada a um ambiente real nesta tarefa.
2. Quando houver configuração de Functions, publicar primeiro o projeto Workers,
   incluindo `SendEventEmail`, em `/api/event-email/send`.
3. Validar a configuração de transporte abaixo antes de publicar API e frontend
   com o contrato novo. O processamento usa `EventEmails:RunHostedProcessor`
   (padrão `true`), independente dos lembretes.
4. `EventEmailFunctions:BaseUrl` e `EventEmailFunctions:FunctionKey` sobrescrevem
   os valores correspondentes de `PasswordResetFunctions`. A chave precisa autorizar
   a função nova: uma chave exclusiva do reset não é suficiente. Preferir uma chave
   específica de `SendEventEmail`; uma host key também é aceita pelo runtime.
   [Referência oficial de chaves](https://learn.microsoft.com/azure/azure-functions/function-keys-how-to).
5. Nesse modo, manter o SMTP existente nas Functions. Sem configuração de Functions,
   o envio usa `Email`/SMTP da API. Uma configuração incompleta falha sem alternar
   automaticamente para outro transporte. Secrets permanecem somente no servidor.

Não houve commit, deploy, alteração de secrets nem envio de e-mail real.

## Validação

- Frontend: 105 testes de agenda e camada HTTP aprovados.
- API: 65 testes de envio, transporte, segurança e regressão aprovados, incluindo
  concorrência em bases temporárias SQL Server LocalDB.
- Playwright: 10 testes aprovados; fluxo de e-mail em 1440, 1024, 768 e 390 px,
  cancelamento, confirmação, pendências, ausência de destinatários e autorização.
- TypeScript, build frontend, orçamento de bundle e auditoria de arquitetura aprovados.
- Transporte validado com HTTP/SMTP simulados; entrega real e configuração do Azure
  ainda dependem da publicação e da validação operacional.
- Projeto Azure Functions Workers compilado com zero erros e zero avisos.
