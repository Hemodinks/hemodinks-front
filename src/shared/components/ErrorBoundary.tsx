import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { captureException } from '../../observability';

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

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureException(error, {
      componentStack: info.componentStack,
      source: 'ErrorBoundary',
    });
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
            <h1>Nao foi possivel continuar</h1>
            <p>Atualize a pagina para tentar novamente. O erro foi registrado para analise tecnica.</p>
          </div>
          <button type="button" className="primary-action" onClick={this.handleReload}>
            <RotateCw size={18} />
            Atualizar pagina
          </button>
        </section>
      </main>
    );
  }
}
