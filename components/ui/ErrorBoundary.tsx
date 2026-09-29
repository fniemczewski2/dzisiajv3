// components/ui/ErrorBoundary.tsx

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, ChevronRight, ChevronDown, Home, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  toggleDetails = () => {
    this.setState((prevState) => ({ showDetails: !prevState.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div role="alert" className="min-h-screen flex items-center justify-center p-4 bg-background text-text">
          <div className="max-w-md w-full rounded-(--radius-card) border border-line bg-card shadow-lg p-6 sm:p-8 text-center">
            <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
              <AlertTriangle aria-hidden="true" className="w-7 h-7" />
            </span>
            <h1 className="page-title mb-2">
              Ten widok przestał działać
            </h1>
            <p className="text-text-secondary mb-6">
              Spróbuj załadować widok ponownie. Jeśli błąd się powtórzy, przejdź na stronę główną.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details
                className="text-left mb-6 p-3 bg-surface border border-line rounded-lg text-xs cursor-pointer overflow-hidden"
                open={this.state.showDetails}
              >
                <summary
                  onClick={(e) => {
                    e.preventDefault();
                    this.toggleDetails();
                  }}
                  className="flex items-center gap-2 font-semibold text-text cursor-pointer select-none hover:text-primary transition-colors"
                >
                  {this.state.showDetails ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  Szczegóły błędu
                </summary>
                {this.state.showDetails && (
                  <pre className="whitespace-pre-wrap overflow-auto mt-3 pt-3 border-t border-line text-text-muted font-mono text-[10px]">
                    {this.state.error.toString()}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                )}
              </details>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 justify-center">
              <button
                onClick={this.handleReset}
                type='button'
                className="flex w-full items-center justify-center px-4 py-2 bg-secondary hover:bg-secondary-hover text-white font-medium rounded-lg gap-2 transition-colors shadow-sm"
              >
                <RefreshCw aria-hidden="true" className="w-5 h-5" />
                Spróbuj ponownie
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                type='button'
                className="flex w-full items-center justify-center px-4 py-2 bg-surface hover:bg-surface-hover text-text-secondary font-medium rounded-lg gap-2 transition-colors border border-line"
              >
                <Home aria-hidden="true" className="w-5 h-5" />
                Strona główna
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
