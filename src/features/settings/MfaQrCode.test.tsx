import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { MfaQrCode } from './MfaQrCode';

it('desenha o QR code do otpauth em SVG, marcado como privado e acessível (#150)', () => {
  const uri = 'otpauth://totp/HemoDinks:admin%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=HemoDinks&digits=6&period=30';
  const { container, rerender } = render(<MfaQrCode value={uri} />);
  const svg = screen.getByRole('img', { name: /QR code/ });
  expect(svg).toHaveAttribute('data-private', 'true');
  const path = container.querySelector('path')!.getAttribute('d')!;
  expect(path.length).toBeGreaterThan(100);
  // O segredo não aparece no markup (só a forma dos módulos).
  expect(container.innerHTML).not.toContain('JBSWY3DPEHPK3PXP');
  rerender(<MfaQrCode value={uri.replace('JBSWY3DPEHPK3PXP', 'KRSXG5CTMVRXEZLU')} />);
  expect(container.querySelector('path')!.getAttribute('d')).not.toBe(path);
});
