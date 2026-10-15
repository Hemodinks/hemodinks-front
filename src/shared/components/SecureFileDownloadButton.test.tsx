import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { advanceSessionEpoch } from '../../services/sessionEpoch';
import { downloadBlob } from '../utils/downloadFile';
import { SecureFileDownloadButton } from './SecureFileDownloadButton';

vi.mock('../utils/downloadFile', () => ({ downloadBlob: vi.fn() }));

describe('private file download lifecycle', () => {
  it.each(['context', 'unmount'] as const)('discards a file after %s invalidation', async (change) => {
    vi.mocked(downloadBlob).mockClear();
    let finish!: (blob: Blob) => void;
    const file = new Promise<Blob>((resolve) => { finish = resolve; });
    const view = render(<SecureFileDownloadButton fileName="private.pdf" loadFile={() => file} />);
    await userEvent.click(screen.getByRole('button', { name: 'Baixar' }));
    if (change === 'context') advanceSessionEpoch();
    else view.unmount();
    await act(async () => { finish(new Blob(['private A'])); await file; });
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it('downloads an authorized file while its context remains current', async () => {
    vi.mocked(downloadBlob).mockClear();
    const file = new Blob(['authorized']);
    render(<SecureFileDownloadButton fileName="current.pdf" loadFile={async () => file} />);
    await userEvent.click(screen.getByRole('button', { name: 'Baixar' }));
    expect(downloadBlob).toHaveBeenCalledWith(file, 'current.pdf');
  });
});
