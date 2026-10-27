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

## Validação original (antes da #169)

- Frontend: 105 testes de agenda e camada HTTP aprovados.
- API: 65 testes de envio, transporte, segurança e regressão aprovados, incluindo
  concorrência em bases temporárias SQL Server LocalDB.
- Playwright: 10 testes aprovados; fluxo de e-mail em 1440, 1024, 768 e 390 px,
  cancelamento, confirmação, pendências, ausência de destinatários e autorização.
- TypeScript, build frontend, orçamento de bundle e auditoria de arquitetura aprovados.
- Transporte validado com HTTP/SMTP simulados; entrega real e configuração do Azure
  ainda dependem da publicação e da validação operacional.
- Projeto Azure Functions Workers compilado com zero erros e zero avisos.

## Correção da issue frontend #169 — 2026-10-13

Complexidade alta, risco alto de integração e estado multiclínica. Architect
(high) investigou API e revisou frontend; QA (medium) implementou e executou os
negativos, E2E e inspeção visual. Modelo dos subagentes não identificado no retorno
 do runtime. Agente principal implementou produção e executou regressão/build.

Causas verificadas:

- `EventEmailRequestHandlers.cs:34` só autoriza novo envio para destinatário
  `available`. `pendingCount=1/canSend=false` significa solicitação já enfileirada,
  não ausência de destinatários. O bloqueio foi preservado e passou a ser explicado.
- `eventEmailService.ts` não enviava `copyToCreator`; o frontend não modelava nem
  apresentava `creatorCopy`. Agora GET usa `?copyToCreator=true` apenas no opt-in,
  POST envia somente `{copyToCreator:boolean}`. Não aceita endereço/ID/clínica.
- `useAgendaEventEmail.ts` recriava a chave ao atualizar preview. Agora preserva
  chave e payload após tentativa incerta; confirmação aceita não se perde se GET
  posterior falhar. Troca de contexto limpa escolha e oculta respostas anteriores.
- O modal não organizava cabeçalho/rodapé e herdava fundo translúcido. O
  `backdrop-filter` de `.app-layout` também prendia seu posicionamento fixo.
  `AgendaEventEmailModal` usa portal local, preservando `Modal` compartilhado;
  superfície opaca, corpo rolável, título/fechamento e ações visíveis, sem alterar
  estilos globais. A inspeção de capturas revelou e confirmou essas correções.

A cópia fica desmarcada por padrão. Ausência de email, autoria legada, perda de
acesso e solicitação anterior recebem explicações. Criador já destinatário recebe
somente uma mensagem, conforme deduplicação da API. Eventos sem autoria persistida
não ganham criador inferido pelo responsável. A API #174 e migration
`20261012210010_AddEventAuthenticatedCreator` precisam estar disponíveis no ambiente.

Resultados reais:

- `npm run verify`: arquitetura sem violações, **569 unitários em 88 arquivos
  aprovados**, TypeScript e build aprovados. Inclui **28 testes direcionados**
  de hook/modal/service, também aprovados isoladamente.
- Playwright: **14 cenários distintos aprovados**. Última rodada completa teve
  13 aprovados e um timeout no login antes do modal. Repetição dirigida: cinco
  aprovados, incluindo esse caso e quatro inspeções visuais. Não se declara uma
  rodada única de 14 casos verde. Comando: `npx playwright test --grep "agenda email:" --workers=1`.
- Matriz 320/360/390/768/1280px, light/dark; axe sem violações graves/críticas,
  foco/Tab/Escape, reabertura, opt-in, duplo clique, falha de rede com chave/payload
  estáveis, pending/sent/failed, 403/404 e invalidação de estado por clínica.
  Zoom foi validado por viewport equivalente a 200% (384x450, escala 2), sem
  confundir CSS `zoom` com zoom nativo. As ações ficam completamente na viewport.
- API: **71 aprovados, zero falhas/ignorados**, incluindo cópia, transporte
  simulado, clínica cruzada, concorrência e migration em LocalDB descartável.
  Relatório `hemodinks-api/out/issue-validation/issue169-api-regression.trx`.
- `npm run budget` e `git diff --check` aprovados. Avisos preexistentes de tamanho
  de types.ts e importação de observability permanecem fora do escopo.

Capturas reais e saídas de navegador foram movidas para o diretório ignorado
`hemodinks-api/out/issue169/frontend-validation/`; a subpasta
`issue-169-viewport` contém 320/1280px em ambos os temas. Artefatos não entram no diff.

Limites: E2E de frontend usa API mockada; testes da API usam transporte falso.
Não houve email real nem inspeção de produção. Para fila persistentemente pendente,
verificar worker/leases/tentativas e configuração/versão das Functions/SMTP no
ambiente, sem expor secrets. `sent` significa aceitação pelo transporte, não entrega
confirmada na caixa postal. Sem commit, push, PR, merge ou deploy. Frontend alterado
na branch já aberta `chore/update-frontend-dependencies`; API `developer` sem
alterações de produção nesta tarefa. Nenhuma dependência, regra de destinatários,
notificação interna ou lembrete foi alterado.

## Revalidação da #169 — 26/10/2026

A implementação principal já estava presente. O contrato de cópia foi conferido
no código local da API (`EventEmailRequestHandlers.cs`) e na documentação da #174;
não houve alteração na API nem inspeção do ambiente implantado. `canSend=false`
com destinatário `pending` continua significando envio já enfileirado.

Lacuna reproduzida em `useAgendaEventEmail.ts`: após o POST aceito, o GET de status
mantinha `submitting=true`, impedindo Fechar/Escape mesmo com sucesso visível.
Agora a atualização de status tem estado próprio, sem bloquear o fechamento após
aceite. `result`, `inFlight`, chave e bloqueio da cópia continuam impedindo novos
envios e alterações do payload durante essa atualização. A resposta antiga não
preenche o modal reaberto. Nenhuma mudança de CSS ou componente global foi necessária.

Os dois novos unitários falharam antes da correção e passaram depois; os **31
testes direcionados** de hook/modal/service passaram. Os **16 E2E** passaram em
uma rodada, incluindo status lento/fechamento/reabertura em 390 e 1280px,
matriz 320/360/390/768/1280px nos dois temas, axe, teclado, cópia e retry.
Capturas 320/1280px light/dark inspecionadas. Logs em `reports/issue-169-*.log`
e capturas em `test-results/` (ignorados pelo Git).

Regressão completa: **765 testes em 112 arquivos** e arquitetura aprovados.
O build inicial detectou a opção `exact` do Playwright usada indevidamente em um
teste Testing Library; após remover essa opção (sem relaxar a seleção por nome),
os **12 testes do modal** e `npm run build` passaram. `git diff --check` aprovado.

Classificação alta por integração, estado de clínica e efeitos do envio. Security
(high) investigou e aprovou o diff, sem editar ou executar testes. Implementação e
validação pelo principal. E2E usa API simulada; não comprova SMTP, worker ou entrega
real. Sem envio real, commit, merge ou deploy.
