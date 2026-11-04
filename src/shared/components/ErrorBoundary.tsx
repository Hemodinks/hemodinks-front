import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { privateErrorSummary } from '../../telemetryPrivacy';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('[ErrorBoundary]', privateErrorSummary(error));
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="error-boundary-shell" role="alert">
        <section className="error-boundary-panel">
          <AlertTriangle size={36} aria-hidden="true" />
          <div>
            <span className="eyebrow">Erro inesperado</span>
            <h1>Não foi possível continuar</h1>
            <p>Atualize a página para tentar novamente. O erro foi registrado para análise técnica.</p>
          </div>
          <button type="button" className="primary-action" onClick={this.handleReload}>
            <RotateCw size={18} />
            Atualizar página
          </button>
        </section>
      </main>
    );
  }
}
