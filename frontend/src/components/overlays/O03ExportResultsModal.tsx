import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import type { ExportRequest } from '../../types/api';
import { Download, FileText, CheckCircle2 } from 'lucide-react';

interface O03ExportResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalCount: number;
  filteredCount: number;
  selectedCount?: number;
  onExport: (request: ExportRequest) => Promise<string | void>;
}

export const O03ExportResultsModal: React.FC<O03ExportResultsModalProps> = ({
  isOpen,
  onClose,
  totalCount,
  filteredCount,
  selectedCount = 0,
  onExport,
}) => {
  const [format, setFormat] = useState<ExportRequest['format']>('csv');
  const [scope, setScope] = useState<ExportRequest['scope']>('all');
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [includeRawArtifacts, setIncludeRawArtifacts] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExporting(true);
    setDownloadSuccess(null);
    try {
      const url = await onExport({
        format,
        scope,
        includeEvidence,
        includeRawArtifacts,
      });
      setDownloadSuccess(typeof url === 'string' ? url : 'Export ready for download');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export research results"
      description="Download structured findings and provenance evidence. No session credentials are ever included."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-muted-ink mb-1.5">Scope of export</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`p-2.5 rounded border text-left text-xs ${
                scope === 'all'
                  ? 'border-deep-teal bg-deep-teal-subtle text-ink font-medium'
                  : 'border-line bg-surface text-muted-ink'
              }`}
            >
              <div>All findings</div>
              <div className="font-mono-tech text-[11px] text-ink mt-0.5">{totalCount} items</div>
            </button>

            <button
              type="button"
              onClick={() => setScope('filtered')}
              className={`p-2.5 rounded border text-left text-xs ${
                scope === 'filtered'
                  ? 'border-deep-teal bg-deep-teal-subtle text-ink font-medium'
                  : 'border-line bg-surface text-muted-ink'
              }`}
            >
              <div>Current filter</div>
              <div className="font-mono-tech text-[11px] text-ink mt-0.5">{filteredCount} items</div>
            </button>

            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => setScope('selected')}
              className={`p-2.5 rounded border text-left text-xs ${
                scope === 'selected'
                  ? 'border-deep-teal bg-deep-teal-subtle text-ink font-medium'
                  : selectedCount === 0
                  ? 'border-line bg-canvas opacity-50 cursor-not-allowed text-muted-ink'
                  : 'border-line bg-surface text-muted-ink'
              }`}
            >
              <div>Selected rows</div>
              <div className="font-mono-tech text-[11px] text-ink mt-0.5">{selectedCount} items</div>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-ink mb-1.5">File format</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'csv', label: 'CSV Table' },
              { id: 'json', label: 'Structured JSON' },
              { id: 'clean_text', label: 'Clean Text' },
              { id: 'url_ledger', label: 'URL Ledger' },
            ].map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                onClick={() => setFormat(fmt.id as any)}
                className={`p-2 text-center rounded border text-xs ${
                  format === fmt.id
                    ? 'border-deep-teal bg-deep-teal-subtle text-ink font-medium'
                    : 'border-line bg-surface text-muted-ink'
                }`}
              >
                {fmt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 bg-subtle-surface rounded border border-line space-y-2">
          <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={includeEvidence}
              onChange={(e) => setIncludeEvidence(e.target.checked)}
              className="rounded border-line text-deep-teal focus:ring-deep-teal"
            />
            <span>Include field-level source URLs and text excerpts</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={includeRawArtifacts}
              onChange={(e) => setIncludeRawArtifacts(e.target.checked)}
              className="rounded border-line text-deep-teal focus:ring-deep-teal"
            />
            <span>Include stored HTML snapshot digests where available</span>
          </label>
        </div>

        {downloadSuccess && (
          <div className="p-3 rounded border border-line bg-subtle-surface flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-ink">
              <CheckCircle2 className="w-4 h-4 text-deep-teal" />
              <span>Export ready. File generated successfully.</span>
            </div>
            <a
              href="#"
              download={`daleel_export_${Date.now()}.${format === 'csv' ? 'csv' : 'json'}`}
              className="text-deep-teal font-medium hover:underline flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-medium text-ink bg-surface border border-line hover:bg-subtle-surface"
          >
            Close
          </button>
          <button
            type="submit"
            disabled={isExporting}
            className="px-4 py-2 rounded text-xs font-medium text-white bg-deep-teal hover:bg-deep-teal-hover flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            {isExporting ? 'Generating...' : 'Generate export'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
