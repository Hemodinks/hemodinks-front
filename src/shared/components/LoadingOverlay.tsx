import { HeartPulse } from 'lucide-react';
import type { ReactNode } from 'react';

type LoadingOverlayProps = {
  active: boolean;
  className?: string;
  message?: ReactNode;
};

export function LoadingOverlay({
  active,
  className,
  message = 'Sincronizando dados...',
}: LoadingOverlayProps) {
  if (!active) {
    return null;
  }

  return (
    <div className={`loading-overlay${className ? ` ${className}` : ''}`} aria-live="polite" aria-busy="true">
      <div className="loading-overlay-panel" role="status">
        <div className="health-loader" aria-hidden="true">
          <span className="loader-ring" />
          <span className="loader-orbit orbit-one" />
          <span className="loader-orbit orbit-two" />
          <span className="loader-core">
            <HeartPulse size={34} />
          </span>
        </div>

        <div className="loading-copy">
          <span className="loading-eyebrow">Processando</span>
          <strong>{message}</strong>
        </div>
      </div>
    </div>
  );
}
