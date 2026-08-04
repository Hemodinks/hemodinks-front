# Segurança

## Exceções temporárias de dependências

### GHSA-qwww-vcr4-c8h2 — React Router RSC Mode CSRF

| Campo                         | Registro                                                  |
| ----------------------------- | --------------------------------------------------------- |
| Situação                      | Reavaliada e aceita temporariamente em 2026-07-30         |
| Severidade publicada          | Alta, CWE-352                                             |
| Dependências instaladas       | `react-router-dom@7.18.2` e `react-router@7.18.2`         |
| Faixa indicada pelo advisory  | `react-router >=7.12.0 <8.3.0`                            |
| Versão corrigida indicada     | `8.3.0`, ainda não publicada no npm em 2026-07-30         |
| Alternativa sugerida pelo npm | downgrade para `react-router-dom@7.11.0`                  |
| Escopo afetado                | execução de actions no modo React Server Components (RSC) |
| Próxima revisão obrigatória   | 2026-08-28                                                |

O risco foi aceito temporariamente porque este projeto é uma SPA Vite executada no
browser. A aplicação usa `BrowserRouter` declarativo e não possui build React Server
Components, rotas RSC, `RouterProvider`, loaders ou actions do React Router. As
operações de escrita continuam sendo feitas pelos serviços HTTP da aplicação e
autorizadas pela API.

Controles compensatórios:

- não habilitar RSC ou actions/loaders do React Router enquanto esta exceção estiver ativa;
- manter `npm run architecture:check` bloqueando imports de `react-router`,
  `react-router/*` e `@react-router/*`; somente `react-router-dom` é permitido no frontend;
- revisar qualquer mudança na estratégia de roteamento antes do merge;
- manter autenticação e autorização de todas as mutações no backend;
- executar `npm audit` em atualizações de dependências e na revisão periódica desta exceção;
- executar `npm run security:audit` no CI; o comando falha para advisories não
  permitidos e também após o prazo de revisão;
- manter a verificação mensal do Dependabot configurada em `.github/dependabot.yml`;
- não aplicar `npm audit fix --force`, pois a correção sugerida hoje é um downgrade e
  reintroduz advisories de XSS, open redirect e negação de serviço corrigidos nas
  versões mais recentes;
- manter `react-router-dom@7.18.2` fixado, sem intervalo de versão, até que uma versão
  corrigida e publicada possa ser validada.

A exceção deve ser removida assim que uma versão compatível fora da faixa vulnerável
estiver disponível. Ela também deve ser reavaliada imediatamente se o projeto adotar
RSC, rotas de dados, loaders/actions do React Router ou renderização no servidor.
Enquanto nenhuma dessas mudanças ocorrer, a revisão deve ser feita ao menos
mensalmente.

Fonte: [GitHub Advisory GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2).
