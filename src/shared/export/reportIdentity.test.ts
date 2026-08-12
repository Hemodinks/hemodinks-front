import { describe, expect, it, vi } from 'vitest';
import { fitReportLogo, normalizeReportLogo, resolveReportIdentity } from './reportIdentity';

function createPngBlob(width = 200, height = 100) {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return new Blob([bytes], { type: 'image/png' });
}

describe('identidade visual dos relatórios', () => {
  it('normaliza logo PNG e preserva sua proporção', async () => {
    const logo = await normalizeReportLogo(createPngBlob());
    expect(logo).toMatchObject({ extension: 'png', width: 200, height: 100 });
    expect(fitReportLogo(logo!, 60, 60)).toEqual({ width: 60, height: 30 });
  });

  it('mantém a geração sem logo quando ela não existe ou falha', async () => {
    const withoutLogo = await resolveReportIdentity({
      clinicName: 'Clínica sem logo',
      title: 'Relatório',
      logoLoader: () => Promise.resolve(new Blob([])),
    });
    const failedLogo = await resolveReportIdentity({
      clinicName: 'Clínica com erro',
      title: 'Relatório',
      logoLoader: vi.fn().mockRejectedValue(new Error('CORS')),
    });
    expect(withoutLogo.logo).toBeNull();
    expect(failedLogo.logo).toBeNull();
  });

  it('usa a mesma marca padrão da interface quando a clínica não possui imagem', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(createPngBlob(96, 96)),
    });
    vi.stubGlobal('fetch', fetchMock);

    const identity = await resolveReportIdentity({
      clinicName: 'Clínica sem imagem própria',
      title: 'Relatório',
      logoLoader: vi.fn().mockRejectedValue(new Error('Imagem não cadastrada')),
    });

    expect(identity.logo).toMatchObject({ extension: 'png', width: 96, height: 96 });
    expect(fetchMock).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it('isola nome, título, cor e logo por clínica mesmo com textos longos e acentos', async () => {
    const first = await resolveReportIdentity({
      clinicName: 'Clínica São José de Hemodinâmica e Cardiologia',
      title: 'Relatório financeiro detalhado de procedimentos médicos',
      primaryColor: '#246B61',
      logoLoader: () => Promise.resolve(createPngBlob(120, 80)),
    });
    const second = await resolveReportIdentity({
      clinicName: 'Clínica Órion',
      title: 'Pacientes',
      logoLoader: () => Promise.resolve(new Blob([])),
    });
    expect(first).toMatchObject({ clinicName: 'Clínica São José de Hemodinâmica e Cardiologia', primaryColor: '#246B61' });
    expect(first.logo).not.toBeNull();
    expect(second).toMatchObject({ clinicName: 'Clínica Órion', primaryColor: '#14877D', logo: null });
  });
});
