import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg-primary">
          <div className="max-w-md w-full mx-4">
            <div className="card text-center">
              <AlertTriangle className="h-16 w-16 text-error mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-text-primary mb-2">
                Oops! Qualcosa è andato storto
              </h1>
              <p className="text-text-secondary mb-6">
                Si è verificato un errore inaspettato. Puoi provare a ricaricare la pagina o contattare il supporto se il problema persiste.
              </p>
              
              {this.state.error && (
                <div className="mb-6 p-3 bg-error/10 border border-error/20 rounded text-left">
                  <p className="text-sm font-medium text-error mb-1">Dettagli errore:</p>
                  <p className="text-xs text-text-secondary font-mono">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleReset}
                  className="btn btn-primary flex items-center justify-center"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Riprova
                </button>
                <button
                  onClick={this.handleReload}
                  className="btn btn-outline flex items-center justify-center"
                >
                  Ricarica Pagina
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;