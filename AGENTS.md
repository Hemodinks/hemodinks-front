# AGENTS.md — HemoDinks Frontend

## 1. Objetivo

Este documento define as regras obrigatórias para agentes de IA que atuem no frontend do HemoDinks.

O objetivo é preservar:

- segurança;
- isolamento multi-clínica;
- organização;
- modularização;
- componentização;
- reutilização;
- responsividade;
- acessibilidade;
- consistência visual;
- regras de negócio existentes;
- estabilidade dos testes;
- eficiência no uso de contexto e tokens.

Modificar somente o necessário para a atividade solicitada.

---

# 2. Princípio fundamental

Antes de editar:

1. identificar a tela ou fluxo;
2. localizar os componentes atuais;
3. localizar hooks/services/stores relacionados;
4. localizar testes existentes;
5. verificar regras de perfil e clínica;
6. entender responsividade atual;
7. somente então modificar.

Não reconstruir uma tela inteira quando o problema puder ser corrigido de forma localizada.

---

# 3. Arquitetura do frontend

Respeitar a arquitetura existente.

Preservar:

- separação de responsabilidades;
- componentização;
- modularização;
- hooks;
- services;
- stores/contextos;
- componentes compartilhados;
- camada de acesso à API.

Não concentrar funcionalidades complexas em componentes de página.

---

# 4. Componentes

Preferir componentes:

- pequenos;
- coesos;
- reutilizáveis;
- testáveis;
- com responsabilidade clara.

Evitar componentes gigantes.

Quando um componente crescer excessivamente, considerar extração apenas quando houver ganho real de organização.

Não fragmentar excessivamente a UI em componentes triviais sem benefício.

---

# 5. Reutilização

Antes de criar novo componente, procurar implementação existente.

Prioridade:

1. reutilizar;
2. parametrizar;
3. compor;
4. criar novo.

Preservar componentes consolidados.

Especialmente:

- datepickers;
- dropdowns;
- selects digitáveis;
- modais;
- tabelas;
- paginação;
- filtros;
- inputs;
- mensagens;
- botões;
- componentes de exportação.

Não substituir componentes maduros por versões mais simples que removam funcionalidades existentes.

---

# 6. Não alterar regras não relacionadas

É proibido realizar refatorações oportunistas fora do escopo.

Não alterar:

- login;
- perfil;
- permissões;
- navegação;
- contexto da clínica;
- componentes globais;
- design system;

quando não houver necessidade para a issue atual.

---

# 7. Regra de negócio

Evitar colocar regras de negócio críticas no frontend.

O frontend pode:

- apresentar;
- validar formato;
- controlar interação;
- montar request;
- interpretar response.

Regras críticas devem permanecer na API.

Nunca utilizar UI como mecanismo exclusivo de segurança.

---

# 8. Segurança

Ocultar um botão não equivale a autorização.

O frontend pode usar permissões para UX, mas deve assumir que a API aplica a autorização efetiva.

Não armazenar secrets no frontend.

Nunca incluir:

- client secrets;
- connection strings;
- credenciais;
- chaves privadas.

---

# 9. Tokens

Utilizar somente os mecanismos existentes de autenticação.

Não criar armazenamento alternativo de token sem necessidade.

Evitar exposição de tokens em:

- logs;
- console;
- query string;
- erros;
- analytics.

---

# 10. Multi-clínica

O HemoDinks possui isolamento por clínica.

O frontend nunca deve misturar dados entre clínicas.

Ao mudar o contexto de clínica:

- invalidar dados dependentes quando necessário;
- buscar dados novamente;
- não reutilizar cache incorreto;
- não manter estado pertencente à clínica anterior.

---

# 11. Contexto da clínica

Não confiar em ClinicaId manipulado manualmente pelo cliente para segurança.

O frontend utiliza contexto para UX e requests.

A segurança real deve ser aplicada pela API.

Entretanto, o frontend deve evitar enviar contexto incorreto ou stale.

---

# 12. SuperAdmin

SuperAdmin pode possuir contexto multi-clínica.

Não exibir clínicas para usuários que não tenham autorização para selecioná-las.

Usuários de clínica única devem entrar diretamente no contexto permitido conforme regra existente.

Não alterar esse comportamento sem requisito explícito.

---

# 13. Login unificado

Alterações na tela de login devem considerar o fluxo de login unificado já existente.

Não assumir que cada usuário utiliza obrigatoriamente e-mail individual.

Preservar compatibilidade com fluxos existentes.

---

# 14. Responsividade

Toda alteração visual deve considerar:

- desktop;
- notebook;
- tablet;
- smartphone.

Não considerar uma tela concluída somente porque funciona em 1920x1080.

---

# 15. Layout responsivo

Evitar:

- largura fixa desnecessária;
- overflow horizontal;
- tabelas impossíveis de operar em mobile;
- modais maiores que viewport;
- botões inacessíveis;
- conteúdo dependente de zoom reduzido.

O usuário não deve precisar diminuir o zoom do navegador para operar a aplicação.

---

# 16. Mobile

Em telas pequenas:

- preservar hierarquia;
- priorizar conteúdo principal;
- permitir scroll adequado;
- manter ações acessíveis;
- adaptar tabelas quando necessário;
- evitar elementos sobrepostos.

Não remover funcionalidades importantes simplesmente para fazer caber.

---

# 17. Acessibilidade

Preservar boas práticas de acessibilidade.

Verificar:

- labels;
- aria attributes;
- foco;
- teclado;
- contraste;
- estados disabled;
- feedback de erro;
- modais;
- dropdowns.

Alterações visuais não devem quebrar testes de acessibilidade existentes.

---

# 18. Design existente

Respeitar identidade visual existente.

Não realizar redesign completo quando a solicitação for localizada.

Preservar elementos explicitamente mantidos pelo produto.

Não alterar plano de fundo, branding ou identidade visual sem requisito.

---

# 19. Estados da interface

Considerar:

- loading;
- sucesso;
- erro;
- vazio;
- disabled;
- permissões insuficientes.

Não deixar interface sem feedback durante operações assíncronas importantes.

---

# 20. Loading

Evitar loaders que bloqueiem toda a aplicação sem necessidade.

Utilizar loading proporcional ao escopo da operação.

Não fazer requests repetitivos desnecessários.

---

# 21. API

Centralizar acesso à API nos mecanismos existentes.

Não espalhar chamadas HTTP diretamente por componentes quando existir camada de services/client.

Preservar tratamento centralizado de autenticação e erros.

---

# 22. Requests

Evitar requests duplicados.

Verificar:

- dependências de effects;
- invalidation;
- refetch automático;
- loops;
- chamadas disparadas por múltiplos componentes.

---

# 23. Estado

Manter estado no menor escopo necessário.

Não promover estado local para global sem justificativa.

Não duplicar a mesma informação em múltiplos stores.

Evitar estado derivado desnecessário.

---

# 24. Performance

Evitar otimização prematura.

Porém verificar:

- re-render excessivo;
- request duplicado;
- listas grandes;
- componentes pesados;
- cálculos repetidos.

Usar memoização apenas quando houver motivo.

---

# 25. Formulários

Preservar:

- máscaras;
- validators;
- mensagens;
- comportamento existente;
- componentes reutilizáveis.

Não duplicar regra da API de maneira divergente.

Validações do frontend são UX, não mecanismo de segurança.

---

# 26. Dropdowns

Dropdowns digitáveis e componentes com inclusão dinâmica devem manter suas funcionalidades existentes.

Não substituir por `<select>` simples quando isso reduzir capacidade funcional.

---

# 27. Datepicker

Preservar componente de data existente quando possível.

Não substituir por input nativo se isso gerar divergência visual ou funcional sem requisito.

---

# 28. Tabelas e listagens

Ao modificar listagens, considerar:

- paginação;
- filtros;
- ordenação;
- ações;
- responsividade;
- permissões;
- exportações.

Não remover funcionalidades existentes para simplificar layout.

---

# 29. Exportações

Alterações em telas que oferecem PDF/XLSX devem preservar seus fluxos.

Não duplicar lógica de geração no frontend quando ela pertencer ao backend.

---

# 30. Testes — estratégia

Aplicar pirâmide de testes.

Prioridade:

1. testes unitários;
2. testes de componentes;
3. testes de integração;
4. E2E.

Não começar sempre pelo E2E.

---

# 31. Testes após alteração

Executar primeiro os testes diretamente relacionados.

Depois ampliar proporcionalmente ao impacto.

---

# 32. E2E

E2E é obrigatório quando houver alteração relevante em:

- fluxo;
- navegação;
- login;
- permissões;
- clínica;
- formulário importante;
- modal importante;
- layout estrutural;
- comportamento visível do usuário.

---

# 33. Playwright

Ao modificar telas cobertas pelo Playwright:

- localizar testes existentes;
- preservar seletores estáveis;
- evitar seletores frágeis;
- atualizar testes somente quando o comportamento esperado realmente mudou.

Não "consertar" um E2E simplesmente removendo a asserção problemática.

---

# 34. Seletores E2E

Preferir seletores baseados em:

- role;
- label;
- texto semântico;
- identificador estável quando necessário.

Evitar dependência excessiva de:

- classes CSS;
- posição no DOM;
- nth-child.

---

# 35. Falha de E2E

Quando um E2E falhar após mudança visual:

1. verificar se houve regressão;
2. verificar acessibilidade;
3. verificar seletor;
4. verificar timing;
5. somente então alterar o teste.

Não assumir automaticamente que o teste está errado.

---

# 36. Política de investigação eficiente

Não varrer todo o frontend para uma alteração localizada.

Começar por:

1. rota;
2. página;
3. componente;
4. hook/store;
5. service;
6. testes.

Expandir somente se necessário.

---

# 37. Uso eficiente de contexto

Evitar:

- abrir arquivos grandes sem necessidade;
- reler módulos já compreendidos;
- repetir buscas;
- analisar telas sem relação;
- gerar resumos excessivamente longos antes de editar.

---

# 38. Política de complexidade

Classificar mentalmente a atividade.

## Baixa

Exemplos:

- texto;
- espaçamento;
- alinhamento;
- pequena validação;
- ajuste localizado.

Estratégia:

- alteração localizada;
- teste relacionado.

## Média

Exemplos:

- formulário;
- componente;
- tela;
- service;
- tabela;
- filtro.

Estratégia:

- analisar fluxo;
- componentes;
- estado;
- testes.

## Alta

Exemplos:

- autenticação;
- permissões;
- troca de clínica;
- grandes alterações de layout;
- fluxo multi-etapa.

Estratégia:

- mapear fluxo completo;
- avaliar segurança;
- avaliar estado;
- revisar E2E.

## Crítica

Exemplos:

- vazamento cross-tenant;
- exposição indevida de dados;
- bypass de autorização;
- tokens;
- login;
- sessão.

Estratégia:

- análise completa do trust boundary;
- menor alteração segura possível;
- testes negativos;
- E2E quando aplicável.

---

# 39. Escalonamento

Não utilizar profundidade máxima para ajustes triviais.

Escalar investigação quando houver:

- comportamento inesperado;
- bug difícil de reproduzir;
- múltiplos estados envolvidos;
- autenticação;
- autorização;
- tenant;
- race condition;
- regressão de E2E;
- impacto transversal.

---

# 40. Subagentes

Não criar subagentes para tarefas triviais.

Subagentes só devem ser considerados quando houver tarefas realmente independentes.

Não dividir artificialmente uma alteração simples.

---

# 41. Anti-alucinação

Nunca assumir que existe:

- componente;
- hook;
- endpoint;
- store;
- rota;
- função;
- teste;

sem verificar no repositório.

Quando houver dúvida, investigar.

---

# 42. Não inventar requisitos

Não adicionar funcionalidade não solicitada.

Se identificar melhoria adicional:

- relatar;
- não implementar automaticamente.

---

# 43. Compatibilidade

Preservar contratos existentes com a API.

Não alterar nomes ou estruturas de payload sem verificar backend.

---

# 44. Console

Não deixar:

- console.log;
- debug;
- informações sensíveis;
- dumps;

em código de produção sem justificativa.

---

# 45. Dependências

Não adicionar nova biblioteca quando a funcionalidade puder ser implementada adequadamente com as dependências existentes.

Quando adicionar dependência:

- justificar;
- avaliar manutenção;
- avaliar bundle;
- avaliar segurança.

---

# 46. Git

Manter diff pequeno e relacionado à issue.

Não alterar arquivos fora do escopo.

Não realizar formatação global sem necessidade.

---

# 47. Finalização

Antes de concluir:

- revisar diff;
- validar desktop;
- validar mobile quando aplicável;
- validar permissões;
- validar contexto de clínica;
- executar testes;
- verificar console;
- verificar regressões visíveis.

---

# 48. Relatório final

Informar objetivamente:

- componentes alterados;
- comportamento alterado;
- testes executados;
- resultado;
- riscos ou pendências.

Não produzir relatório excessivamente longo.

---

# 49. Regra máxima

No frontend do HemoDinks:

SEGURANÇA > ISOLAMENTO > CORREÇÃO FUNCIONAL > UX > ACESSIBILIDADE > ARQUITETURA > TESTABILIDADE > PERFORMANCE > ESTÉTICA.

Nunca sacrificar segurança ou isolamento de dados por conveniência visual.