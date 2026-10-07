# AGENTS.md — HemoDinks Frontend

## Objetivo

Trabalhe no frontend do HemoDinks preservando segurança, isolamento multi-clínica,
arquitetura existente, reutilização de componentes, responsividade e regras de
negócio já funcionais.

Faça a menor alteração correta necessária para atender à tarefa.

---

## Arquitetura e organização

- Preserve a organização atual do frontend.
- Mantenha separação entre páginas, componentes, hooks, services e estado.
- Evite concentrar lógica complexa em componentes de tela.
- Reutilize componentes existentes antes de criar novos.
- Prefira composição e parametrização a duplicação.
- Não crie abstrações sem benefício concreto.
- Não mova regras de negócio críticas da API para o frontend.

---

## Escopo

- Modifique somente o necessário para a tarefa.
- Não faça refatorações oportunistas.
- Não redesenhe telas inteiras quando uma correção localizada for suficiente.
- Não altere login, permissões, navegação, tenant ou componentes globais sem
  necessidade para a atividade.
- Se encontrar outro problema, reporte-o separadamente.

---

## Componentes existentes

Antes de substituir um componente, verifique seu comportamento atual.

Preserve funcionalidades existentes de componentes como:

- datepicker;
- dropdown digitável;
- selects;
- tabelas;
- filtros;
- paginação;
- modais;
- formulários;
- exportações;
- componentes compartilhados.

Não substitua um componente mais completo por outro simplificado se isso remover
funcionalidades existentes.

---

## Segurança

O frontend não é a autoridade final de segurança.

- Permissões visuais servem para UX.
- A autorização efetiva deve permanecer na API.
- Ocultar botão não equivale a autorizar ou negar operação.
- Não armazene secrets no frontend.
- Não registre tokens ou dados sensíveis no console.
- Não introduza mecanismos alternativos de autenticação sem necessidade.

---

## Multi-clínica

Nunca misture dados de clínicas diferentes.

Ao mudar o contexto da clínica:

- não reutilize dados pertencentes à clínica anterior;
- invalide ou recarregue estado dependente quando necessário;
- evite cache stale;
- preserve as regras existentes de seleção de clínica.

Não utilize ClinicaId manipulado pelo frontend como mecanismo de segurança.

Usuários de clínica única não devem visualizar clínicas às quais não possuem
acesso.

SuperAdmin e usuários multi-clínica devem continuar respeitando o contexto
selecionado e as regras existentes.

---

## Login e autenticação

Alterações de login devem preservar os fluxos existentes, incluindo os modos de
autenticação já suportados pelo sistema.

Não assuma que todos os usuários possuem o mesmo tipo de login.

Não modifique autenticação, tokens, sessão ou seleção de clínica sem investigar o
fluxo relacionado.

---

## Responsividade

Toda alteração visual relevante deve funcionar em:

- desktop;
- notebook;
- tablet;
- smartphone.

O usuário não deve precisar diminuir o zoom do navegador para utilizar a tela.

Evite:

- largura fixa desnecessária;
- overflow horizontal;
- elementos sobrepostos;
- botões inacessíveis;
- modais maiores que a viewport.

Não remova funcionalidades importantes apenas para fazer o layout caber.

---

## Acessibilidade

Preserve:

- labels;
- roles;
- foco;
- navegação por teclado;
- aria attributes válidos;
- mensagens de erro;
- estados disabled;
- semântica dos componentes.

Alterações de layout não devem quebrar acessibilidade ou testes existentes.

---

## Estado e API

- Mantenha estado no menor escopo necessário.
- Não duplique a mesma informação em múltiplos stores sem necessidade.
- Utilize a camada existente de acesso à API.
- Evite chamadas HTTP diretamente em componentes quando houver service/client
  apropriado.
- Evite requests duplicados e loops de refetch.
- Não introduza estado global para resolver problema local.

---

## Formulários

Preserve:

- máscaras;
- validações existentes;
- mensagens;
- componentes;
- comportamento esperado.

Validação no frontend melhora UX, mas não substitui validação e segurança da API.

Não implemente uma regra diferente da API para o mesmo requisito.

---

## Eficiência de execução

Antes de editar:

1. localize a rota ou tela envolvida;
2. identifique componentes diretamente relacionados;
3. localize hooks, stores ou services usados por essa tela;
4. localize os testes correspondentes;
5. faça a menor alteração necessária.

Não varra o frontend inteiro para uma mudança localizada.

Prefira busca direcionada por:

- rota;
- componente;
- hook;
- service;
- store;
- teste.

Evite:

- abrir arquivos não relacionados;
- reler código já compreendido;
- repetir buscas;
- criar subagentes para tarefas simples;
- gerar análises extensas antes de alterações triviais.

Amplie a investigação somente quando houver dependência real.

---

## Planejamento proporcional ao risco

Para alterações visuais pequenas, implemente diretamente após localizar o
componente.

Faça um plano curto antes de editar quando houver:

- autenticação;
- autorização;
- troca de clínica;
- estado global;
- fluxo multi-etapa;
- mudança estrutural de tela;
- integração com vários endpoints.

Não crie planos extensos para CSS, texto ou pequenos ajustes de layout.

---

## Testes

Execute primeiro os testes diretamente relacionados.

Amplie a suíte proporcionalmente ao impacto.

Use E2E quando houver alteração relevante em:

- login;
- navegação;
- permissões;
- seleção de clínica;
- fluxo de formulário;
- comportamento importante para o usuário;
- layout estrutural.

Não rode E2E completo repetidamente sem alteração relevante.

---

## Playwright

Ao alterar uma tela coberta por Playwright:

- preserve seletores estáveis;
- prefira role, label e semântica;
- evite dependência de posição no DOM;
- não remova assertions apenas para fazer o teste passar.

Quando um E2E falhar após uma alteração:

1. verifique regressão real;
2. verifique acessibilidade;
3. verifique seletor;
4. verifique timing;
5. somente então altere o teste.

---

## Anti-alucinação

Nunca assuma que existe:

- componente;
- hook;
- rota;
- endpoint;
- store;
- função;
- teste;

sem localizar evidência no repositório.

Não invente comportamento da API.

Antes de alterar um contrato, verifique como ele é usado atualmente.

---

## Dependências

Não adicione biblioteca nova quando a funcionalidade puder ser implementada com
as dependências existentes.

Ao adicionar dependência, considere:

- necessidade;
- manutenção;
- segurança;
- bundle;
- compatibilidade.

---

## Finalização

Antes de concluir:

- revise o diff;
- confirme que o escopo foi respeitado;
- valide o fluxo alterado;
- valide permissões e contexto da clínica quando aplicável;
- valide mobile quando houver alteração visual;
- execute os testes relevantes;
- verifique console e erros.

Ao finalizar, informe apenas:

1. o que foi alterado;
2. principais componentes/arquivos afetados;
3. testes executados e resultado;
4. riscos ou pendências reais.

Não gere documentação extensa sem necessidade.

---

## Prioridade

Em caso de conflito, priorize:

SEGURANÇA > ISOLAMENTO DE DADOS > CORREÇÃO FUNCIONAL > UX >
ACESSIBILIDADE > ARQUITETURA > TESTABILIDADE > PERFORMANCE > ESTÉTICA.