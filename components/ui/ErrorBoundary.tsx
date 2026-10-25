// components/ui/ErrorBoundary.tsx

import React, { Component, ReactNode } from "react";
import { AlertTriangle, ChevronRight, ChevronDown, Home, RefreshCw } from "lucide-react";
import { reportError } from "@/lib/errorReport";

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
    console.error("[ErrorBoundary] Nieobsłużony błąd komponentu:", error, errorInfo);
    void reportError("ErrorBoundary", error);
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
        return <>{this.props.fallback}</>;
      }

      return (
        <div role="alert" className="flex min-h-screen items-center justify-center bg-background p-4 text-text">
          <div className="w-full max-w-md rounded-(--radius-card) border border-line bg-card p-6 text-center shadow-lg sm:p-8">
            <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
              <AlertTriangle aria-hidden="true" className="h-7 w-7" />
            </span>
            <h1 className="page-title mb-2">Ten widok przestał działać</h1>
            <p className="mb-6 text-text-secondary">
              Spróbuj załadować widok ponownie. Jeśli błąd się powtórzy, przejdź na stronę główną.
            </p>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details
                className="mb-6 cursor-pointer overflow-hidden rounded-lg border border-line bg-surface p-3 text-left text-xs"
                open={this.state.showDetails}
              >
                <summary
                  onClick={(e) => {
                    e.preventDefault();
                    this.toggleDetails();
                  }}
                  className="flex cursor-pointer items-center gap-2 font-semibold text-text transition-colors select-none hover:text-primary"
                >
                  {this.state.showDetails ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Szczegóły błędu
                </summary>
                {this.state.showDetails && (
                  <pre className="mt-3 overflow-auto border-t border-line pt-3 font-mono text-xs whitespace-pre-wrap text-text-muted">
                    {this.state.error.toString()}
                    {"\n\n"}
                    {this.state.error.stack}
                  </pre>
                )}
              </details>
            )}

            <div className="grid grid-cols-1 justify-center gap-3 sm:grid-cols-2">
              <button
                onClick={this.handleReset}
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-secondary-hover"
              >
                <RefreshCw aria-hidden="true" className="h-5 w-5" />
                Spróbuj ponownie
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 font-medium text-text-secondary transition-colors hover:bg-surface-hover"
              >
                <Home aria-hidden="true" className="h-5 w-5" />
                Strona główna
              </button>
            </div>
          </div>
        </div>
      );
    }

    return <>{this.props.children}</>;
  }
}
