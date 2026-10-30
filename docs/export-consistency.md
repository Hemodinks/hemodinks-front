# Exportações concorrentes — Front #194

Complexidade e risco altos: exportação clínica/financeira, sessão e isolamento.
Dependências API #176 e Front #171 verificadas como fechadas em 29/10/2026.
Implementação pelo agente principal; investigação e revisão Security em high,
somente leitura. Nenhuma alteração de API, schema, autorização ou regra financeira.

## Comportamento

- Paginação de pacientes, faturamento/relatórios e grupos médicos valida número da
  página, metadados constantes, IDs únicos e quantidade final. Detectar duplicação,
  mudança de total ou coleta incompleta interrompe a consulta com mensagem genérica
  para atualizar; não deduplica silenciosamente uma lista que pode conter omissões.
- Os relatórios continuam usando a mesma lista autorizada e filtrada na tabela,
  modal e exportações. A página visível é um recorte de 10 registros; exportação e
  modal global abrangem toda a consulta filtrada, preservando a ordenação existente.
- PDF/XLSX capturam uma cópia dos registros antes do primeiro `await`, mantendo
  resumo, linhas e checklist coerentes mesmo se os objetos de origem mudarem.
- Guards monotônicos invalidam gerações em mudanças de filtro, sessão, registros,
  ordenação/escopo de pacientes e desmontagem. Voltar de A para B e depois A não
  reativa geração antiga. O guard e o epoch são conferidos até o download/save.
- Um mutex por ref impede dois cliques síncronos e execução concorrente de relatório
  global/individual. Os controles exibem estados disabled correspondentes.
- Atualização ou erro de consulta bloqueiam novas gerações. O último resultado pode
  continuar visível após falha, mas é necessário atualizar com sucesso para exportar.
  Um aviso explica que a exportação usa os dados da consulta carregada.
- `StatusPago` e pagamentos pendentes continuam independentes dos itens de checklist.
  Nenhum token, registro ou identificador clínico é adicionado aos erros de validação.

## Evidências

Antes: nove testes novos falharam por concatenação inconsistente, duplicação de
gerações e exportação stale após alteração/restauração de contexto.

Comandos de verificação:

```powershell
npm test
npm test -- src/features/reports/useReportExport.test.ts src/features/patients/export/patientExportIsolation.test.ts
npx playwright test --grep '#194|checklist #171|tenant #163'
npm run build
npm run audit:architecture
npm run budget
npm run test:e2e:real
```

A suíte completa passou com 787 testes; após acrescentar cinco casos, os dois arquivos
afetados passaram com 21 testes (16 já incluídos na suíte anterior). Os testes de
snapshot geram PDF/XLSX reais; a cobertura de navegador usa fixtures HTTP sintéticas.
Os novos E2E usam 101 registros em duas páginas da API, paginação da tela, modal,
conteúdo PDF/XLSX, duplicação/mudança de total, bloqueio e recuperação em 390/1280px.
Resultado: **22/22 E2E focados aprovados**, incluindo a matriz existente de checklist
em 390/768/1280px, temas, teclado, acessibilidade, perfil médico e troca de clínica.
O mock emite 401/403 nos cenários negativos esperados; não houve erro inesperado de
runtime. **9/9 E2E adicionais com API real e SQL Server Docker aprovados**, sem
skips/retries/flaky, validando também o contrato paginado real e isolamento A/B.
Build, arquitetura e budget passaram; permaneceram os avisos preexistentes sobre
import de observabilidade e tamanho de `types.ts`. Cleanup do banco/fixture confirmado.

## Arquivos e status

- `shared/utils/collectConsistentPages.ts`: validação de coleta reutilizada pelos loaders.
- `shared/hooks/useExportScope.ts`: invalidação monotônica até o download.
- `features/reports/`: guard/mutex, snapshot, estados de exportação e aviso da consulta.
- `features/patients/usePatientExport.ts` e `export/patientListExporter.ts`: coleta e guard de filtros/ordem/escopo.
- `features/billing/billingPageUtils.ts`: coleta validada, reutilizada por faturamento e histórico.
- Testes unitários correspondentes e `e2e/export-consistency-cases.ts`.

Implementação e validação local concluídas na branch `fix/issue-194-export-consistency`.
Commit, PR para developer e CI remoto continuam pendentes; a issue não foi fechada.

## Limitações

Não existe versão/snapshot transacional no contrato paginado atual. O frontend
detecta inconsistências observáveis e preserva os dados da consulta no arquivo;
não consegue provar um instante único do banco entre várias páginas/catálogos.
Mudanças que mantenham metadados e não repitam IDs podem escapar à detecção.
Garantia transacional completa exige suporte explícito da API, fora desta alteração.

O PDF individual mantém o paciente/faturamento capturados, mas busca observações
autorizadas no momento da exportação, como antes; esse complemento não pertence a
um snapshot transacional conjunto. Os guards continuam impedindo download após troca
de contexto. Não foram executados merge, commit, deploy ou modificações em produção.
