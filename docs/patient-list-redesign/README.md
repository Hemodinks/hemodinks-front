# Listagem de pacientes — layout e responsividade

## Resultado

A listagem preserva os componentes, callbacks e serviços existentes. Em telas largas, continua uma tabela; quando a área útil tem até 700 px, as mesmas linhas viram cartões empilhados. Todos os dados continuam disponíveis, com nome e ações no início de cada cartão. Os cabeçalhos ordenáveis continuam acessíveis em telas pequenas.

- Editar e Excluir permanecem na segunda célula, imediatamente após o nome, com tooltip e nome acessível. Nenhum menu intermediário foi criado.
- Filtros separados por uma divisória, em três, duas ou uma coluna conforme a área disponível.
- Exportações agrupadas abaixo dos filtros, com escopo existente, PDF roxo e Excel verde. No celular, botões ocupam a largura disponível.
- Áreas de toque de pelo menos 44 px nos controles principais, foco visível e quebra de nomes longos.
- Feedback acessível de carregamento, ausência de resultados, paginação e geração de arquivos.
- Atualização, paginação e exportação ficam indisponíveis durante carregamento. Durante exportação, ambos os formatos e o seletor de escopo ficam bloqueados.
- Trava síncrona no hook de exportação impede iniciar dois arquivos antes de o React renderizar o estado de loading.
- Exclusão mantém o modal de confirmação e seu bloqueio durante o processamento. Erros preservam o registro e são anunciados pelo alerta existente.

## Componentes e arquivos

| Arquivo | Alteração |
| --- | --- |
| `src/features/patients/PatientList.tsx` | Classe que delimita os estilos da listagem. |
| `src/features/patients/PatientListToolbar.tsx` | Agrupamento de exportações, feedback e bloqueio durante carregamento. |
| `src/features/patients/PatientFilters.tsx` | Grupo com nome acessível, preservando todos os filtros. |
| `src/features/patients/PatientTable.tsx` | Mesmas linhas e ações, sem carrossel horizontal, com nome da tabela e estados acessíveis. |
| `src/features/patients/PatientPagination.tsx` | Feedback acessível e bloqueio durante carregamento. |
| `src/features/patients/styles/list.css` | Estilos isolados, container queries e cartões. |
| `src/features/patients/styles/workspace.css` | Remoção dos estilos obsoletos do carrossel de pacientes. |
| `src/features/patients/patients.css` | Importação do estilo da listagem. |
| `src/features/patients/usePatientExport.ts` | Proteção contra exportações simultâneas. |
| `src/features/patients/PatientList.test.tsx` | Seis testes de ações, permissões, estados, filtros e paginação. |
| `src/features/patients/usePatientExport.test.ts` | Quatro novos casos de escopo visível, concorrência, sessão e filtros combinados. |
| `e2e/patient-list-cases.ts` | Sete cenários de responsividade, acessibilidade, busca, filtros, paginação e exclusão. |
| `e2e/hemodinks.spec.ts` | Registro dos cenários e teste sem permissão de gestão. |
| `e2e/patient-form-api.ts` | Fixture com busca, paginação e erro/atraso de exclusão. |

Reutilizados: `DataPanel`, `Button`, `IconButton`, `SearchField`, `SelectField`, `MultiSelectComboboxField`, `DateInput`, `SortableTableHeader`, `AlertMessage`, `ToastMessage` e confirmação existente. Nenhum componente de produção duplicado ou adicionado.

## Filtros, escopos e segurança

Todos os filtros, parâmetros, callbacks, permissões, endpoints e chaves de cache por sessão permanecem existentes. Nenhum código de backend foi alterado.

Os escopos de exportação foram preservados integralmente:

- **Dados da tela:** os pacientes da página exibida, resultantes da busca e dos filtros aplicados.
- **Cirurgiões selecionados:** consulta paginada com os filtros existentes de cirurgião, convênio, procedimento e datas.
- **Todos os pacientes:** comportamento anterior, que envia somente o período de cirurgias consolidadas. Não foi reinterpretado como exportação de todos os filtros da tela, pois o pedido proíbe alterar o escopo existente.

O teste de integração existente em `src/App.test.tsx` cobre o descarte de pacientes da clínica anterior durante troca de sessão. O novo teste de exportação confere o token da clínica e os filtros transmitidos. Os cenários E2E desta execução usam API simulada: não comprovam isolamento no banco de dados ou autorização real do servidor. Os testes reais de autenticação e cross-tenant exigem `HEMODINKS_LOGIN_FIXTURE` provisionada pelo backend.

## Validação

| Verificação | Resultado |
| --- | --- |
| `npm test -- --maxWorkers=2` | 58 arquivos, 339 testes aprovados. Inclui testes unitários e integração React/serviços simulados. |
| `npm run build` | TypeScript e Vite aprovados. |
| `npm run audit:architecture` | 268 arquivos, nenhuma violação. |
| `npm run budget` | Aprovado: entrada JS 228,73 kB; gzip 73,08 kB; CSS 5,77 kB. |
| E2E específico da listagem | 8 aprovados. |
| `npm run test:e2e` completo | 74 aprovados, 23 ignorados condicionalmente, nenhuma falha. Confirmado localmente e no GitHub Actions. Os casos ignorados são 11 de API real sem fixture e 12 de gravação de tutoriais. |
| GitHub Actions | CI do commit `99ac047` aprovado: 339 testes unitários/integração e 74 E2E. CI e deploy da integração `b05449c` também aprovados. |
| Lint | O projeto não possui script de lint nem etapa de lint no GitHub Actions; não foi declarado como executado. |
| `git diff --check` | Aprovado. |

O Playwright cobre 320, 390, 768, 1024 e 1440 px, ausência de overflow horizontal, ações diretamente após o nome, áreas de toque, cores, edição e retorno, busca e procedimento combinados, limpeza, paginação, estado vazio, confirmação bloqueada durante exclusão e falha de exclusão. Os testes existentes de ficha/listagem validam downloads PDF/Excel, conteúdo filtrado da planilha e exclusão bem-sucedida. A auditoria Axe da listagem passa em 390 e 1440 px nos temas claro e escuro.

Os comandos de build, budget e E2E são os mesmos de `.github/workflows/ci.yml`. A suíte Vitest local usa o comando do CI com dois workers para limitar recursos. Os resultados remotos foram consultados em 21/09/2026, após o envio e a integração das alterações. O agente não acionou workflow remoto ou deploy. O aviso preexistente do Vite sobre imports estático/dinâmico de `observability.ts` permanece não bloqueante.

## Falha do GitHub Actions investigada em 20/09/2026

Execução: [CI 35402873407](https://github.com/Hemodinks/hemodinks-front/actions/runs/35402873407), commit `cd164ce1fa158870ce1c6430864bd62033152f6f`.

O CI registrou cinco falhas, 69 testes aprovados e 23 ignorados. As cinco falhas são os testes responsivos de 320, 390, 768, 1024 e 1440 px: `locator('.patient-list-panel').locator('tbody tr')` esperava dois registros e encontrava zero.

O commit `cd164ce` continha os novos testes, mas não os componentes e estilos correspondentes. A versão de `PatientList.tsx` naquele commit não definia `className="patient-list-panel"`, enquanto o workspace já continha essa classe e as demais melhorias exigidas pelos testes. Os arquivos de implementação ainda estavam modificados/não rastreados localmente.

A correção foi entregue no commit `99ac047`, incluindo o conjunto completo de implementação, `styles/list.css` e sua importação. Não foi necessário aumentar timeout, remover asserções ou ignorar testes. O [CI da correção](https://github.com/Hemodinks/hemodinks-front/actions/runs/35545967865) passou com 339 testes unitários/integração e 74 E2E aprovados, além de build e budget.

A integração `b05449c` mantém os mesmos arquivos da correção (comparação sem diferenças de conteúdo) e tem [CI aprovado](https://github.com/Hemodinks/hemodinks-front/actions/runs/35547073441) e [deploy aprovado](https://github.com/Hemodinks/hemodinks-front/actions/runs/35547073445). A execução antiga permanece como registro histórico da falha já corrigida.

## Evidências

Capturas com dados fictícios:

- [Desktop claro](listagem-1440-light.png) e [desktop escuro](listagem-1440-dark.png).
- [Celular claro](listagem-390-light.png) e [celular escuro](listagem-390-dark.png).
