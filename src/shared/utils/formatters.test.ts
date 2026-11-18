import { describe, expect, it } from 'vitest';
import { formatPersonName, formatProfileName, getErrorMessage, normalizeDisplayText, STALE_CHUNK_MESSAGE } from './formatters';

describe('normalizeDisplayText', () => {
  it('corrige nomes de convenios recebidos com encoding quebrado', () => {
    expect(normalizeDisplayText('Bradesco Sa\u00c3\u00bade')).toBe('Bradesco Saúde');
    expect(normalizeDisplayText('Cemig Sa\uFFFDde')).toBe('Cemig Saúde');
    expect(normalizeDisplayText('Sul Am\u00c3\u00a9rica')).toBe('Sul América');
    expect(normalizeDisplayText('Unimed Uberl\uFFFDndia - Plano  Unimed Interc\uFFFDmbio'))
      .toBe('Unimed Uberlândia - Plano  Unimed Intercâmbio');
  });
});

describe('formatProfileName', () => {
  it('prioriza o perfil catalogado pelo id para evitar mojibake vindo da API', () => {
    expect(formatProfileName(2, 'M\uFFFDdicos')).toBe('Médicos');
    expect(formatProfileName(2, 'Medicos')).toBe('Médicos');
  });

  it('corrige variantes quebradas do nome do perfil medico quando o id nao vem na API', () => {
    expect(formatProfileName(null, 'M\uFFFDdicos')).toBe('Médicos');
    expect(formatProfileName(null, 'M\u00C3\u00A9dicos')).toBe('Médicos');
  });
});

describe('formatPersonName', () => {
  it('padroniza nomes e sobrenomes independentemente da caixa recebida', () => {
    expect(formatPersonName('  MARIA   APARECIDA DA SILVA  ')).toBe('Maria Aparecida da Silva');
    expect(formatPersonName('joÃO pedro dE souZA')).toBe('João Pedro de Souza');
  });

  it('padroniza nomes compostos com hifen e apostrofo', () => {
    expect(formatPersonName("ANA-MARIA D'ÁVILA")).toBe("Ana-Maria D'Ávila");
  });

  it('aceita valores ausentes', () => {
    expect(formatPersonName(null)).toBe('');
  });
});

describe('getErrorMessage', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://hemodinks.gestao-saude.tec.br/assets/jspdf.es.min-BnkMqr2D.js',
    'error loading dynamically imported module: https://hemodinks.gestao-saude.tec.br/assets/x.js',
    'Importing a module script failed.',
  ])('troca o erro de chunk antigo após deploy por instrução ao usuário: %s', (message) => {
    expect(getErrorMessage(new Error(message))).toBe(STALE_CHUNK_MESSAGE);
  });

  it('mantém as demais mensagens', () => {
    expect(getErrorMessage(new Error('Request failed with status code 403'))).toBe('Operação não permitida.');
    expect(getErrorMessage(new Error('Paciente não encontrado.'))).toBe('Paciente não encontrado.');
    expect(getErrorMessage('x')).toBe('Erro inesperado.');
  });
});
