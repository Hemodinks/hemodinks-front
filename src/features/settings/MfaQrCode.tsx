import { useMemo } from 'react';
import qrcode from 'qrcode-generator';

const QUIET_ZONE = 4;

// #150: QR code do `otpauth://` gerado no navegador (o segredo nunca sai daqui para outro servico).
// SVG montado pela matriz de modulos, sem innerHTML; fundo branco fixo para ler bem no tema escuro.
export function MfaQrCode({ value, size = 192 }: { value: string; size?: number }) {
  const { path, dimension } = useMemo(() => {
    const code = qrcode(0, 'M');
    code.addData(value);
    code.make();
    const count = code.getModuleCount();
    let d = '';
    for (let row = 0; row < count; row++)
      for (let col = 0; col < count; col++)
        if (code.isDark(row, col)) d += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
    return { path: d, dimension: count + QUIET_ZONE * 2 };
  }, [value]);

  return (
    <svg
      className="mfa-qr-code nr-block"
      data-private="true"
      role="img"
      aria-label="QR code para adicionar a conta no aplicativo autenticador"
      width={size}
      height={size}
      viewBox={`0 0 ${dimension} ${dimension}`}
      shapeRendering="crispEdges"
    >
      <rect width={dimension} height={dimension} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
}
