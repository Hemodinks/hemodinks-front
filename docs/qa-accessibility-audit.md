# Auditoria de acessibilidade e responsividade — Frontend #164

Revalidação local em 16/10/2026. Complexidade e risco **moderados**, pelo uso dos
componentes em várias telas. Agentes utilizados: **Frontend** e **QA**, ambos
configurados com esforço medium; identificador do modelo herdado não exposto.
Dependências: React, Playwright/Chromium, axe e fixtures existentes. Nenhuma
biblioteca, contrato de API, regra de autorização ou seleção de clínica alterada.

## Defeitos reproduzidos e correções

| Evidência | Antes | Depois |
| --- | --- | --- |
| `src/shared/components/ui.tsx:106`, `:194`; `ComboboxField.test.tsx` | Opção ativa sem vínculo ARIA; Enter/Espaço na opção focada não selecionavam | IDs e `aria-activedescendant` válidos; seleção por click nativo, mouse e teclado sem duplicar callback |
| `ui.tsx:318`, `:329`; `styles/fields.css:241`; `MultiSelectComboboxField.test.tsx` | Multiselect sem navegação por setas nem destaque da opção ativa | Setas, Enter, Todos, destaque e anúncio da opção; busca, chips, remoção e disabled preservados |
| `ui.tsx:61`, `:251`; E2E com 24 opções | Última opção fora da área rolável; rolagem também podia trocar a opção pelo cursor parado | Rolagem mínima da opção ativa; movimento efetivo do mouse atualiza o destaque sem interferir nas setas |
| `src/shared/components/styles/actions.css:50` | Calendário nativo dos relatórios recebia Tab sem indicador visível | `:focus-within` no contêiner; máscara, calendário, limites e disabled preservados |
| `src/features/users/UserAvatar.tsx:84`; `UserAvatar.test.tsx` | Nome ARIA em span sem papel acessível | Fallback com papel de imagem; variante decorativa continua oculta e sem nome redundante |
| `src/layout/Sidebar.tsx:141`; `Sidebar.test.tsx` | Submenu nomeado em div sem papel acessível | Grupo nomeado; abertura, callbacks e negação por permissão preservados |

Os problemas foram reproduzidos antes das respectivas correções. A ficha de
paciente já possuía outline no calendário e cabeçalhos disponíveis em mobile;
essas implementações foram preservadas.

## Antes e depois

As métricas por rota, largura, tema e estado estão em
[`qa-accessibility-audit-metrics.json`](qa-accessibility-audit-metrics.json).

| Medida | Antes | Depois |
| --- | --- | --- |
| Varreduras axe da auditoria | 47 | 47 |
| Violações automáticas, qualquer severidade | 0 | 0 |
| Varreduras com `aria-prohibited-attr` em revisão manual | 8 | 0 |
| Cenários E2E da auditoria | 3 aprovados / 6 falhas | 9 aprovados / 0 falhas |

Zero violações automáticas não significava ausência de defeitos. Teclado, foco,
rolagem e os nomes ARIA exigiram testes específicos e revisão dos itens
`incomplete`. A rodada inicial de 17 unitários reproduziu quatro falhas; casos
adicionais reproduziram destaque, rolagem e nomes acessíveis antes dos ajustes.

## Validações executadas

- `npm test -- --maxWorkers=4`: **632 aprovados em 98 arquivos**, na versão final.
- Cinco arquivos compartilhados: **18 aprovados**; avatar, Sidebar e data:
  **8 aprovados**, incluindo ocultação decorativa e negação do submenu.
- Rodada ampla selecionada: **45 E2E aprovados**, incluindo a auditoria e 36
  regressões de ficha/listagem, erros, checklist, agenda e acessibilidade.
- Após todos os ajustes: **9 E2E aprovados**, sem retries/skips, em
  **390, 768 e 1280 × 900 px**. Cinco rotas nos temas claro/escuro, dropdowns
  abertos, erro de formulário, modais, drawer e ordenação por teclado.
- Matriz responsiva: **12 aprovados**, desktop/tablet/mobile, incluindo cadastro,
  filtros, downloads e recusa de arquivo cross-tenant. Executada após os ajustes
  de teclado/rolagem e antes das duas correções apenas semânticas.
- `npm run build`, `npm run budget`, `npm run audit:architecture` e
  `git diff --check`: **aprovados**. Arquitetura mantém aviso preexistente sobre
  o tamanho de `types.ts`; nenhuma violação.

A rodada ampla precedeu os refinamentos finais; a auditoria e os unitários
completos foram repetidos depois. Asserções anteriores foram preservadas.
Os testes novos exigem ausência de escrita inválida/exclusão ao cancelar,
foco circular e retorno do modal, nomes acessíveis, relações ARIA, controles
visíveis e ausência de overflow. Os nove cenários finais não registraram erros
inesperados de console/JavaScript; somente o 401 inicial da fixture é esperado.

Para repetir a auditoria com anexos JSON completos:

```powershell
$env:CI = 'true'
npx playwright test --grep 'acessibilidade #164' --workers=1 --retries=0 --output=test-results/a11y164-after --reporter=json > "$env:TEMP/hemodinks-a11y164-after.json"
npm run test:e2e:responsive -- --grep 'responsive #163:' --retries=0
```

## Arquivos e limites

Produção: `ui.tsx`, `styles/actions.css`, `styles/fields.css`, `UserAvatar.tsx`
e `Sidebar.tsx`. Testes: `ComboboxField.test.tsx`,
`MultiSelectComboboxField.test.tsx`, `DateInput.test.tsx`, `Modal.test.tsx`,
`SortableTableHeader.test.tsx`, `UserAvatar.test.tsx`, `Sidebar.test.tsx`,
`e2e/accessibility-audit-cases.ts` e seu registro em `e2e/hemodinks.spec.ts`.
Os dois arquivos deste relatório guardam o resultado consolidado; relatórios
brutos, traces e capturas ficam nos artefatos locais do Playwright.

O axe ainda pede revisão para `aria-valid-attr-value` em popups com
`aria-haspopup`: a implementação instalada marca esse caso como indeterminado.
As relações locais de IDs e opções ativas foram inspecionadas e testadas;
o aviso não foi removido nem contado como aprovação automática.
`color-contrast` permanece indeterminado em alguns fundos com imagem e
transparência; houve inspeção de amostra visual, sem certificação integral de
contraste. Chromium emulado não substitui leitor de tela, Safari ou aparelhos
físicos. A API real e a suíte E2E completa não foram reexecutadas nesta auditoria.

**Status:** implementação e validações locais concluídas. Sem commit, PR, merge
ou deploy; status da issue no GitHub não alterado.
