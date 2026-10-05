import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4 text-center">
      <div className="w-12 h-12 rounded bg-deep-teal text-white flex items-center justify-center mb-4">
        <Compass className="w-6 h-6" />
      </div>
      <h1 className="text-xl font-bold text-ink mb-1">Page not found</h1>
      <p className="text-xs text-muted-ink max-w-sm mb-6 leading-relaxed">
        The requested resource does not exist or you do not have permission to access it in this personal workspace.
      </p>
      <Link
        to="/app"
        className="px-4 py-2 rounded text-xs font-medium text-white bg-deep-teal hover:bg-deep-teal-hover flex items-center gap-1.5"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Workspace Home</span>
      </Link>
    </div>
  );
};
