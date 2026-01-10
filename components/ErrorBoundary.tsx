// components/ErrorBoundary.tsx
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
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Coś poszło nie tak
            </h1>
            <p className="text-gray-600 mb-4">
              Przepraszamy, wystąpił nieoczekiwany błąd.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details
                className="text-left mb-4 p-3 bg-gray-100 rounded text-xs cursor-pointer"
                open={this.state.showDetails}
              >
                <summary
                  onClick={(e) => {
                    e.preventDefault();
                    this.toggleDetails();
                  }}
                  className="flex items-center gap-2 font-semibold cursor-pointer select-none hover:text-primary transition-colors"
                >
                  {this.state.showDetails ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  Szczegóły błędu
                </summary>
                {this.state.showDetails && (
                  <pre className="whitespace-pre-wrap overflow-auto mt-2 text-gray-700">
                    {this.state.error.toString()}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                )}
              </details>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 justify-center">
              <button
                onClick={this.handleReset}
                className="flex w-full items-center justify-center px-4 py-2 bg-primary hover:bg-secondary text-white rounded-lg gap-2 transition"
              >
                <RefreshCw className="w-5 h-5" />
                Odśwież
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="flex w-full items-center justify-center px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg gap-2 transition"
              >
                <Home className="w-5 h-5" />
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