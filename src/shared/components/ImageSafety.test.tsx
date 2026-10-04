import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CompanyLogo } from './CompanyLogo';

describe('untrusted logo content', () => {
  it('renders names as text attributes and rejects active SVG image data', () => {
    const payload = '<img src=x onerror=alert(1)>';
    const svg = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>';
    const { container } = render(<CompanyLogo companyName={payload} photo={svg} />);
    const logo = screen.getByRole('img', { name: payload });
    expect(logo.getAttribute('src')).not.toBe(svg);
    expect(container.querySelector('[onerror],script,svg')).toBeNull();
  });
});
