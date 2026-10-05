import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ApiErrorBannerProps {
  message: string;
  traceId?: string;
  onRetry?: () => void;
  className?: string;
}

export const ApiErrorBanner: React.FC<ApiErrorBannerProps> = ({
  message,
  traceId,
  onRetry,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`p-4 bg-surface rounded border border-line space-y-2 text-sm ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-muted-ink shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <p className="font-medium text-ink">{message}</p>
          {traceId && (
            <p className="text-xs font-mono-tech text-muted-ink">
              Support reference: <span className="select-all">{traceId}</span>
            </p>
          )}
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-surface hover:bg-canvas text-ink border border-line shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        )}
      </div>
    </div>
  );
};
