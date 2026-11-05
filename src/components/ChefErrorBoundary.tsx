import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ChefHat, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/operatorTracking';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ChefErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ChefErrorBoundary caught:', error, errorInfo);
    trackEvent({
      type: 'api_error',
      name: 'component_crash',
      error: error.message,
      metadata: { componentStack: errorInfo.componentStack?.slice(0, 500) },
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-card border border-border text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <ChefHat className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-1">
              The Chef dropped a plate!
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {this.props.fallbackTitle || 'Something went wrong. Give it another try.'}
            </p>
          </div>
          <Button onClick={this.handleRetry} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChefErrorBoundary;
