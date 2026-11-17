import { describe, expect, it } from 'vitest';
import { defaultDirectionFor, formatElapsed, parseApiInstant, sortSessionRows, type SessionRow } from './activeSessionsModel';

const row = (nome: string, status: SessionRow['status'], ultimaAtividade: string, extra: Partial<SessionRow> = {}): SessionRow => ({
  usuarioGlobalId: nome.length, nome, perfil: 'Administrador', clinicaId: 1, clinica: 'Alfa', viaEquipe: false,
  inicio: '2026-11-12T08:00:00Z', ultimaAtividade, navegador: 'Chrome · Windows', status, ...extra,
});

describe('activeSessionsModel', () => {
  it('trata data sem fuso como UTC e respeita fuso explícito', () => {
    expect(parseApiInstant('2026-11-17T20:21:00')?.toISOString()).toBe('2026-11-17T20:21:00.000Z');
    expect(parseApiInstant('2026-11-17T20:21:00.1234567')?.toISOString()).toBe('2026-11-17T20:21:00.123Z');
    expect(parseApiInstant('2026-11-17T20:21:00Z')?.toISOString()).toBe('2026-11-17T20:21:00.000Z');
    expect(parseApiInstant('2026-11-17T17:21:00-03:00')?.toISOString()).toBe('2026-11-17T20:21:00.000Z');
    expect(parseApiInstant('')).toBeNull();
    expect(parseApiInstant('inválida')).toBeNull();
  });

  it('formata o tempo decorrido', () => {
    const now = new Date('2026-11-17T20:30:00Z');
    expect(formatElapsed('2026-11-17T20:29:40', now)).toBe('agora');
    expect(formatElapsed('2026-11-17T20:21:00', now)).toBe('há 9 min');
    expect(formatElapsed('2026-11-17T18:30:00Z', now)).toBe('há 2 h');
    expect(formatElapsed('2026-11-17T17:15:00Z', now)).toBe('há 3 h 15 min');
  });

  it('ordena por status com desempate pela atividade mais recente', () => {
    const rows = [
      row('Recente Antigo', 'recent', '2026-11-17T12:00:00Z'),
      row('Online Antigo', 'online', '2026-11-17T20:00:00Z'),
      row('Recente Novo', 'recent', '2026-11-17T18:00:00Z'),
      row('Online Novo', 'online', '2026-11-17T20:20:00Z'),
    ];
    expect(sortSessionRows(rows, 'status', 'asc').map((r) => r.nome))
      .toEqual(['Online Novo', 'Online Antigo', 'Recente Novo', 'Recente Antigo']);
    expect(sortSessionRows(rows, 'status', 'desc').map((r) => r.nome))
      .toEqual(['Recente Novo', 'Recente Antigo', 'Online Novo', 'Online Antigo']);
    expect(sortSessionRows(rows, 'ultimaAtividade', 'desc')[0].nome).toBe('Online Novo');
  });

  it('ordena texto ignorando acentos e caixa', () => {
    const rows = [row('Érica', 'online', '2026-11-17T20:00:00Z'), row('carlos', 'online', '2026-11-17T20:00:00Z'), row('Ana', 'online', '2026-11-17T20:00:00Z')];
    expect(sortSessionRows(rows, 'nome', 'asc').map((r) => r.nome)).toEqual(['Ana', 'carlos', 'Érica']);
  });

  it('datas abrem decrescentes e texto crescente', () => {
    expect(defaultDirectionFor('inicio')).toBe('desc');
    expect(defaultDirectionFor('ultimaAtividade')).toBe('desc');
    expect(defaultDirectionFor('nome')).toBe('asc');
  });
});
