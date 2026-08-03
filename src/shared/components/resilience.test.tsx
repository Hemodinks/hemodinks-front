import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';
import { SecureFileDownloadButton } from './SecureFileDownloadButton';
import { CopyValue } from './CopyValue';
import { captureException } from '../../observability';

vi.mock('../../observability', () => ({
  captureException: vi.fn(),
}));

function BrokenContent(): never {
  throw new Error('Falha de renderização');
}

describe('shared resilience components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:secure-file'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('baixa arquivos privados e libera a URL temporária', async () => {
    const user = userEvent.setup();
    const loadFile = vi.fn().mockResolvedValue(new Blob(['conteúdo']));

    render(
      <SecureFileDownloadButton fileName="documento.pdf" label="Comprovante" loadFile={loadFile} />,
    );

    await user.click(screen.getByRole('button', { name: 'Comprovante' }));

    await waitFor(() => expect(loadFile).toHaveBeenCalledOnce());
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:secure-file'));
  });

  it('permite tentar novamente quando o download privado falha', async () => {
    const user = userEvent.setup();
    const loadFile = vi.fn().mockRejectedValueOnce(new Error('Arquivo indisponível'));

    render(<SecureFileDownloadButton fileName="documento.pdf" loadFile={loadFile} />);
    await user.click(screen.getByRole('button', { name: 'Baixar' }));

    expect(await screen.findByRole('button', { name: 'Tentar novamente' })).toHaveAttribute(
      'title',
      'Arquivo indisponível',
    );
  });

  it('exibe um fallback e registra erros inesperados de renderização', () => {
    render(
      <ErrorBoundary>
        <BrokenContent />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível continuar');
    expect(captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Falha de renderização' }),
      expect.objectContaining({ source: 'ErrorBoundary' }),
    );
    expect(screen.getByRole('button', { name: 'Atualizar página' })).toBeEnabled();
  });

  it('copia um valor usando a API segura do navegador', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<CopyValue label="documento" value="FAT-42" />);
    await user.click(screen.getByRole('button', { name: 'Copiar documento' }));

    expect(writeText).toHaveBeenCalledWith('FAT-42');
    expect(await screen.findByText('Copiado')).toBeInTheDocument();
  });

  it('mantém compatibilidade de cópia quando Clipboard API não está disponível', async () => {
    const user = userEvent.setup();
    const execCommand = vi.fn(() => true);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });

    render(<CopyValue label="referência" value="" displayValue="PIX-001" />);
    await user.click(screen.getByRole('button', { name: 'Copiar referência' }));

    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(await screen.findByText('Copiado')).toBeInTheDocument();
  });

  it('não tenta copiar quando o valor não foi informado', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<CopyValue label="documento" value="" />);
    await user.click(screen.getByRole('button', { name: 'Copiar documento' }));

    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByText('Copiado')).not.toBeInTheDocument();
  });
});
