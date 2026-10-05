import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface AccessDeniedPanelProps {
  title?: string;
  message?: string;
  backTo?: string;
  backLabel?: string;
  traceId?: string;
}

export const AccessDeniedPanel: React.FC<AccessDeniedPanelProps> = ({
  title = 'Access restricted',
  message = 'This research resource belongs to another personal workspace and cannot be accessed. Cross-workspace privacy boundaries are strictly isolated.',
  backTo = '/app',
  backLabel = 'Return to home',
  traceId,
}) => {
  return (
    <div className="max-w-lg mx-auto my-12 p-6 bg-surface rounded border border-line text-center space-y-5">
      <div className="w-10 h-10 mx-auto rounded-full bg-subtle-surface flex items-center justify-center border border-line text-muted-ink">
        <ShieldAlert className="w-5 h-5" />
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="text-sm text-muted-ink leading-relaxed">{message}</p>
      </div>

      {traceId && (
        <div className="text-xs font-mono-tech text-muted-ink bg-subtle-surface py-1.5 px-3 rounded border border-line">
          Support reference: {traceId}
        </div>
      )}

      <div className="pt-2">
        <Link
          to={backTo}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded bg-surface hover:bg-canvas text-ink border border-line"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{backLabel}</span>
        </Link>
      </div>
    </div>
  );
};
