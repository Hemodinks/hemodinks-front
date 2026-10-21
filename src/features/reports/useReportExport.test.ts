import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { basePaciente } from '../../test/appTestData';
import { buildBillingRecords } from '../billing/billingUtils';
import { downloadBlob } from '../../shared/utils/downloadFile';
import { resolveReportIdentity } from '../../shared/export/reportIdentity';
import { emptyReportFilters } from './reportFilters';
import { useReportExport } from './useReportExport';

vi.mock('../../shared/utils/downloadFile', () => ({ downloadBlob: vi.fn() }));
vi.mock('../../shared/export/reportIdentity', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../shared/export/reportIdentity')>(),
  resolveReportIdentity: vi.fn(),
}));

const records = buildBillingRecords([basePaciente]).map((record) => ({ ...record, teamNames: [], medicalGroupNames: [] }));
const identity = { clinicName: 'Clínica A', title: 'Relatório', generatedAt: new Date(), primaryColor: '#14877D', logo: null, contextLines: [] };

describe('exportação mantém o escopo da consulta', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(resolveReportIdentity).mockResolvedValue(identity); });

  it.each(['complete', 'synthetic'] as const)('gera XLSX no formato %s selecionado pelo usuário', async (level) => {
    const { result } = renderHook(() => useReportExport(records, 'Clínica A', 'token-a', emptyReportFilters));
    expect(result.current.exportDetailLevel).toBe('complete');
    act(() => result.current.setExportDetailLevel(level));
    await act(async () => { await result.current.handleExport('xlsx'); });
    const content = new TextDecoder().decode(await (vi.mocked(downloadBlob).mock.calls[0][0] as Blob).arrayBuffer());
    expect(content.includes('Detalhamento de pendências')).toBe(level === 'complete');
    expect(content).toContain('Paciente Hemodinks');
  });

  it.each(['filter', 'session', 'unmount'] as const)('cancela geração atrasada após mudança de %s', async (change) => {
    let finish!: (value: typeof identity) => void;
    vi.mocked(resolveReportIdentity).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const { result, rerender, unmount } = renderHook(({ token, filters }) => useReportExport(records, 'Clínica A', token, filters), {
      initialProps: { token: 'token-a', filters: emptyReportFilters },
    });
    let pending!: Promise<void>;
    act(() => { pending = result.current.handleExport('xlsx'); });
    if (change === 'unmount') unmount();
    else rerender({ token: change === 'session' ? 'token-b' : 'token-a', filters: change === 'filter' ? { ...emptyReportFilters, status: 'pending' } : emptyReportFilters });
    await act(async () => { finish(identity); await pending; });
    expect(downloadBlob).not.toHaveBeenCalled();
  });
});
