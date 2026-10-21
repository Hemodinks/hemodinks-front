import { beforeEach, describe, expect, it, vi } from 'vitest';
import { advanceSessionEpoch } from '../../../services/sessionEpoch';
import { basePaciente } from '../../../test/appTestData';
import { emptyPacienteForm } from '../patientUtils';
import { resolveReportIdentity, type ReportIdentity } from '../../../shared/export/reportIdentity';
import { downloadBlob } from '../../../shared/utils/downloadFile';
import { exportPatientList } from './patientListExporter';
import { exportPatientForm } from './patientFormExporter';

const pdf = vi.hoisted(() => ({ save: vi.fn(), onCreate: null as (() => void) | null }));
vi.mock('jspdf', async () => {
  const actual = await vi.importActual<typeof import('jspdf')>('jspdf');
  return { ...actual, jsPDF: function (...args: ConstructorParameters<typeof actual.jsPDF>) {
    const document = new actual.jsPDF(...args);
    document.save = pdf.save;
    pdf.onCreate?.();
    return document;
  } };
});

vi.mock('../../../shared/export/reportIdentity', async (original) => ({
  ...await original<typeof import('../../../shared/export/reportIdentity')>(),
  resolveReportIdentity: vi.fn(),
}));
vi.mock('../../../shared/utils/downloadFile', () => ({ downloadBlob: vi.fn() }));

const identity: ReportIdentity = { clinicName: 'Clínica A', title: 'Pacientes', generatedAt: new Date(),
  primaryColor: '#14877D', contextLines: [], logo: null };

describe('isolamento de exportações de pacientes', () => {
  beforeEach(() => { vi.clearAllMocks(); pdf.onCreate = null; });
  const exporters = {
    list: (format: 'pdf' | 'xlsx') => exportPatientList({ format, items: [basePaciente], companyName: 'Clínica A', sessionToken: 'a' }),
    form: (format: 'pdf' | 'xlsx') => exportPatientForm({ format, formData: { ...emptyPacienteForm, nomePaciente: 'Paciente A' }, companyName: 'Clínica A', sessionToken: 'a' }),
  };

  it.each(['list', 'form'] as const)('não baixa %s de A após mudança de sessão enquanto prepara a identidade', async (kind) => {
    let complete!: (value: ReportIdentity) => void;
    vi.mocked(resolveReportIdentity).mockReturnValueOnce(new Promise(resolve => { complete = resolve; }));
    const pending = exporters[kind]('xlsx');
    advanceSessionEpoch();
    complete(identity);
    await pending;
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it.each(['list', 'form'] as const)('preserva download de %s na sessão atual', async (kind) => {
    vi.mocked(resolveReportIdentity).mockResolvedValueOnce(identity);
    await exporters[kind]('xlsx');
    expect(downloadBlob).toHaveBeenCalledOnce();
  });

  it.each(['list', 'form'] as const)('não salva PDF de %s quando a sessão muda durante a geração', async (kind) => {
    vi.mocked(resolveReportIdentity).mockResolvedValueOnce(identity);
    pdf.onCreate = advanceSessionEpoch;
    await exporters[kind]('pdf');
    expect(pdf.save).not.toHaveBeenCalled();
  });

  it.each(['list', 'form'] as const)('preserva PDF de %s na sessão atual', async (kind) => {
    vi.mocked(resolveReportIdentity).mockResolvedValueOnce(identity);
    await exporters[kind]('pdf');
    expect(pdf.save).toHaveBeenCalledOnce();
  });
});
