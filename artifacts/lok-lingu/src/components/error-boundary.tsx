import { Component, type ErrorInfo, type ReactNode } from 'react';
import { TriangleAlert, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-sm text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-destructive/15 border-2 border-destructive/30 flex items-center justify-center mx-auto">
              <TriangleAlert className="w-8 h-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black uppercase tracking-widest">Something broke</h1>
              <p className="text-sm text-muted-foreground font-mono">
                {this.state.error?.message ?? 'An unexpected error occurred.'}
              </p>
            </div>
            <Button
              size="lg"
              className="w-full h-14 text-lg font-bold uppercase tracking-widest"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
            >
              <RotateCcw className="w-5 h-5 mr-2" /> Reload App
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
