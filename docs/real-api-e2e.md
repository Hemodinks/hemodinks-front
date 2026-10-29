# Front #193 — Web + API real + SQL sintético

## Escopo e decisão

Complexidade alta; risco alto (sessão, autorização e isolamento multiclínica).
Dependências conferidas em 29/10/2026: API #183 e Front #181/#163 fechadas.
A suíte fica no frontend. A continuação autorizada incluiu uma correção pontual de
concorrência na API, sem mudar contratos ou políticas de expiração.
Security realizou investigação e revisão somente leitura; implementação pelo agente principal.

Evidência anterior: `e2e/login-real-api.spec.ts` é executado pela API, mas
`HemodinksApiFactory` usa EF InMemory. `playwright.homologation.config.ts` seleciona
preparação de login e não provisiona SQL. Esses testes continuam disponíveis.

Plano aplicado: provisionar SQL descartável e host real; criar fixtures A/B e nove
cenários; adicionar gate sem skips/retries e workflow separado; executar validações
e registrar falhas reais. Preferimos esse host à alteração da factory existente
para preservar o contrato dos testes da API. Um ambiente remoto compartilhado não
ofereceria o mesmo isolamento/reprodutibilidade e não é usado.

## Executar

Requisitos: Node 22+, .NET SDK 10, Docker Linux e Chromium do Playwright.
O checkout da API deve estar ao lado do frontend ou em `HEMODINKS_API_ROOT`.
O workflow fixa a revisão da API em `456bc0163ab4426b0854a5ec44044b6ca29738d9`;
alterações nessa combinação exigem nova revisão e execução.

```powershell
npm ci
npx playwright install chromium
npm run test:e2e:real:policy
npm run test:e2e:real
```

O runner cria seu próprio container SQL, sem volumes, com porta aleatória publicada
somente em `127.0.0.1`. Não aceita URL de ambiente, connection string ou credenciais
de produção. API e Vite usam portas exclusivas 5193/5194; servidor existente não é
reutilizado. O catálogo tem nome exclusivo e deve ser novo. Recursos são removidos
ao finalizar ou receber SIGINT/SIGTERM. Encerramento forçado da máquina/processo
pode impedir cleanup; identifique containers pela label `hemodinks.synthetic-e2e=true`
e pelo nome exclusivo antes de qualquer remoção manual.

O host executa a API real em `Testing`, preservando autenticação, cookies, SQL,
middlewares e autorização. Configura banco/JWT antes da inicialização para impedir
fallback de user-secrets; também verifica o destino efetivamente resolvido pelo EF.
Configuração externa é descartada e o processo recebe um ambiente reduzido.
Workers e envio externo de reset são desabilitados; logs e storage ficam no diretório
temporário da execução. Dados e identidades são sintéticos, com domínio `.invalid`.

## Cobertura

| Cenário | Positivo / negativo |
| --- | --- |
| Login | UI real; credencial inválida; acesso sem bearer com clínica resolvida |
| Sessão | HttpOnly; sem token em storage; restore; logout; replay do refresh atual e do bearer |
| Pacientes | UI/lista e detalhe HTTP autorizado; ausência da clínica B |
| Multi-clínica | SuperAdmin A → B → A pela UI; token anterior negado; consentimento por clínica |
| IDOR | Admin restrito não seleciona B; GET/PUT/DELETE de paciente/evento; PUT de equipe; headers manipulados; integridade de B conferida pelo proprietário |
| Faturamento | Lista real e relatório restritos à clínica |
| Exportação | Download PDF/XLSX pela UI; presença de A e ausência de B no conteúdo |
| Equipes | Lista HTTP e edição da própria clínica na UI |
| Agenda | Criação HTTP, leitura persistida, exibição na UI e exclusão confirmada |

Cada cenário roda uma vez, sem retries. O gate exige os nove grupos distintos,
nenhum skip/flaky/failure e rejeita suítes filtradas/repetidas. Erros de runtime e
respostas 5xx observadas no navegador também fazem o teste falhar.

## Evidências e limites

O workflow `Web + real API E2E` roda em PRs para developer/main ou manualmente.
Não contém deploy, merge ou secrets de produção. Preserva integralmente o gate
existente da #181; configurar este novo check como obrigatório no GitHub é uma
ação administrativa separada, não realizada aqui.

Somente `test-results/real-api/summary.json` é publicado: SHAs e contagens, sem
headers, bodies, credenciais ou mensagens de erro autenticadas. JSON bruto do
Playwright e seus contextos de falha ficam locais/ignorados; não devem ser anexados
sem revisão. Trace, vídeo e screenshots estão desligados. A fixture com senha é
apagada no cleanup. Analytics é recusado pela fixture de consentimento.

`EnsureCreated` valida SQL Server com o modelo atual; não valida replay de migrations,
Full-Text Search ou uma homologação remota já implantada. Exportações cobertas são
as geradas pelo frontend a partir de dados reais, não o worker assíncrono de exports.
Não foram alteradas regras de negócio, permissões ou a configuração de sessão da API.

Resultados intermediários preservados: primeira execução 2/9; após ajustar nomes,
seletores e contratos da fixture, 6/9. Apareceram respostas HTTP 503 intermitentes
`session_validation_busy` na API com a configuração padrão de atividade de sessão.
Esse comportamento não deve ser escondido com retries ou redução de assertions.
O resultado final da validação está registrado abaixo e no resumo local.

### Evidência antes da correção de sessão — 29/10/2026

- `npm run test:e2e:real`: **2 aprovados, 7 falhos, 0 ignorados, 0 flaky**, saída 1.
  Login negativo e IDOR passaram, incluindo PUT/DELETE cruzados e verificação de B.
  As sete falhas observaram **17 respostas com código `session_validation_busy`**;
  os contadores de erro de runtime do navegador ficaram em zero.
  Cenários interrompidos por esse erro não contam como fluxos totalmente validados.
- `npm run test:e2e:real:policy`: **13/13 aprovados**.
- `npm run test:release-gate`: **25/25 aprovados**.
- Build frontend aprovado; aviso existente de import estático/dinâmico de observabilidade.
- Build do host .NET aprovado, sem warnings/errors na compilação de validação.
- Auditoria de arquitetura aprovada; aviso existente sobre tamanho de `types.ts`.
- `actionlint` no novo workflow: aprovado.
- Descoberta da suíte padrão: 232 testes em 21 arquivos; suíte real separada.
- Cleanup conferido: nenhum container da label sintética restante e fixture removida.

### Correção de sessão

O teste SQL determinístico `overlapping-touch` reproduziu o erro antes da mudança:
6 cenários existentes passaram e o novo cenário falhou. O relógio avança enquanto
outra requisição persiste atividade mais nova antes de cada tentativa de save.

Na API, `ValidateAndTouchAsync` passou a capturar uma única observação de atividade
por requisição. Uma nova tentativa não representa nova atividade: se outro request
já persistiu horário mais recente, não há outro UPDATE de atividade a disputar.
Expiração, estado de segurança e revogação continuam relidos com relógio atual.
Uma rajada real de 12 requests mostrou que o timestamp fixo sozinho ainda permitia
contenção residual. O teste SQL `repeated-touch` passou a exigir sucesso para conflitos
somente de atividade e falhou antes da segunda alteração (7/8 cenários passaram).

O store SQL Server agora trata esse caso específico no conflito de concorrência:
exige uma única entidade modificada, `AuthenticationSession`, e apenas `LastActivityAt`;
executa UPDATE monotônico desse campo, guardado pelo snapshot de contexto, credenciais,
refresh, membership, proprietário, perfil e estados ativos. Limpa o tracker e retorna
`false` mesmo após o merge: a tentativa seguinte precisa reler e revalidar toda a
segurança. Conflitos de revogação, contexto ou refresh não são mesclados.
As três tentativas e o 503 em contenção de contexto não resolvida foram preservados
no novo cenário `repeated-context-change`. Não foi aumentada a quantidade de retries.

Security revisou essa abordagem. Não há alteração de schema, intervalo de atividade,
política de expiração ou contrato HTTP. A suíte real inclui agora uma rajada explícita
de 12 requests autorizados na mesma sessão, além do logout/replay.

O resumo indica se os checkouts frontend/API contêm mudanças locais: o SHA base
sozinho não identifica código ainda não commitado. O workflow ainda fixa a revisão
anterior da API; atualizar esse pin depende de publicar a correção em um commit
revisado, não realizado sem autorização.

Arquivos da correção na API: `AuthenticationSessionService.cs`,
`EfAuthenticationSessionStore.cs` e `SessionActivitySqlServerTests.cs`.
Evidências TRX locais ficam em `test-results/api-session/` no frontend, ignoradas
pelo Git; não são publicadas no artefato remoto.

### Validação após a correção — 29/10/2026

- Regressões de sessão: **94/94 aprovadas**, sem ignorados, em
  `issue193-final-session.trx`.
- Interleavings SQL Server/LocalDB: **13/13 aprovados**, sem ignorados, em
  `issue193-final-sql.trx`. Incluem atividade concorrente, revogação, troca de clínica,
  refresh, alteração de versão/perfil, membership inativo, expiração idle/absoluta
  durante o save e contenção persistente de contexto. Há 11 casos sobrepostos à
  execução anterior: **96 testes distintos aprovados** no conjunto, sem somar duplicatas.
- `npm run test:e2e:real`: **9/9 aprovados**, sem skips/retries/flaky, com SQL Server
  Docker descartável. Inclui 12 chamadas simultâneas com status 200, restauração,
  logout, replay negado, troca A → B → A, IDOR, faturamento, equipes, agenda e exports.
- Todos os contadores de 5xx, `session_validation_busy` e runtime ficaram em zero.
- O teste de PDF extrai texto dos operadores jsPDF antes de comparar nomes: células
  podem quebrar o nome em várias linhas. Preserva as assertions positiva e de B.
- Política do runner: **13/13 aprovados**. Diffs sem erros de whitespace; cleanup
  confirmado sem fixture e sem containers sintéticos restantes.
- Security revisou a correção sem editar arquivos. Complexidade/risco altos.

**Status:** falha de concorrência corrigida e validada localmente. Publicação e
validação remota continuam pendentes: não houve commit, PR, merge ou deploy; o pin
da API no workflow precisa ser atualizado para o SHA que contiver esta correção.
O resultado local não comprova o comportamento de uma homologação remota implantada
nem de produção. Warnings IDE0005 preexistentes foram observados no build dos testes.
