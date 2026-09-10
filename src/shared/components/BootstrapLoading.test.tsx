import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BootstrapLoading } from './BootstrapLoading';

describe('BootstrapLoading', () => {
  it('announces the supplied real stage with indeterminate progress and keyboard retry', () => {
    const retry = vi.fn(async () => {});
    const { rerender } = render(<BootstrapLoading active stage="Carregando clínicas disponíveis…" slow={false} canRetry={false} onRetry={retry} />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando clínicas disponíveis…');
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(<BootstrapLoading active stage="Carregando clínicas disponíveis…" slow canRetry onRetry={retry} />);
    expect(screen.getByText(/mais de tempo/)).toBeVisible();
    const button = screen.getByRole('button', { name: 'Tentar novamente' });
    expect(button).toHaveFocus();
    fireEvent.click(button);
    expect(retry).toHaveBeenCalledTimes(1);
    rerender(<BootstrapLoading active={false} stage="Carregando clínicas disponíveis…" slow={false} canRetry={false} onRetry={retry} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
