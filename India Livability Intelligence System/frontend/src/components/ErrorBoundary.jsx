import { Component } from "react";
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled component error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F5F5F2] p-6 font-sans text-[#111111]">
          <div className="w-full max-w-lg rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-xl text-center sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 mb-4">
              <AlertTriangle size={28} />
            </div>

            <h2 className="text-xl font-bold tracking-tight text-[#111111]">
              Application Error
            </h2>
            <p className="mt-2 text-sm text-[#666666] leading-relaxed">
              An unexpected error occurred while rendering this view. You can reload the application or reset the state to continue.
            </p>

            {this.state.error && (
              <div className="mt-4 rounded-xl border border-[#EBEBE8] bg-[#FAFAF8] p-3 text-left font-mono text-xs text-rose-700 max-h-32 overflow-y-auto">
                <span className="font-bold">Error:</span> {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E5E5] bg-white px-4 py-2 text-xs font-bold text-[#111111] hover:bg-[#FAFAF8] transition-colors shadow-2xs"
              >
                <RotateCcw size={14} />
                <span>Try Again</span>
              </button>
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#111111] px-4 py-2 text-xs font-bold text-white hover:bg-[#333333] transition-colors shadow-xs"
              >
                <RefreshCw size={14} />
                <span>Reload Page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
