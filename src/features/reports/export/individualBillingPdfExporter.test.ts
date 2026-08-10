import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPacienteObservacoes } from '../../../services';
import { createPatientFormPdf } from '../../patients/export/patientFormExporter';
import { basePaciente } from '../../../test/appTestData';
import type { PacienteObservacao } from '../../../types';
import type { ReportRecord } from '../reportTypes';
import { exportIndividualBillingPdf, getIndividualBillingPdfFileName } from './individualBillingPdfExporter';

vi.mock('../../../services', () => ({ getPacienteObservacoes: vi.fn() }));
vi.mock('../../../shared/export/reportIdentity', () => ({ resolveReportIdentity: vi.fn().mockResolvedValue({}) }));
vi.mock('../../patients/export/patientFormExporter', () => ({ createPatientFormPdf: vi.fn() }));

describe('PDF individual do faturamento', () => {
  beforeEach(() => vi.clearAllMocks());

  it('gera um nome de arquivo identificável e seguro para a ficha do paciente', () => {
    const record = { patientName: 'José da Silva' } as ReportRecord;

    expect(getIndividualBillingPdfFileName(record)).toMatch(
      /^ficha-paciente-jose-da-silva-\d{4}-\d{2}-\d{2}\.pdf$/,
    );
  });

  it('inclui no PDF as conversas registradas no cadastro do paciente', async () => {
    const observation = { id: 7, pacienteId: basePaciente.id, texto: 'Aguardando retorno.' } as PacienteObservacao;
    const save = vi.fn();
    vi.mocked(getPacienteObservacoes).mockResolvedValue([observation]);
    vi.mocked(createPatientFormPdf).mockResolvedValue({ save } as never);
    const record = {
      id: basePaciente.id,
      paciente: basePaciente,
      patientName: basePaciente.nomePaciente,
      paymentRaw: basePaciente.pagamento,
      glosaRaw: basePaciente.repasseGlosa,
      surgeryDateLabel: '01/06/2026',
      statusLabel: 'Pago',
    } as ReportRecord;

    await exportIndividualBillingPdf(record, 'Clínica Teste', 'jwt-token');

    expect(getPacienteObservacoes).toHaveBeenCalledWith(basePaciente.id, 'jwt-token');
    expect(createPatientFormPdf).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), [observation]);
    expect(save).toHaveBeenCalledOnce();
  });
});
