import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Share2, Shield, AlertCircle } from 'lucide-react';

interface O02ShareItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: 'finding' | 'workflow';
  resourceId: string;
  resourceTitle: string;
  onShare: (recipientEmail: string) => Promise<void>;
}

export const O02ShareItemModal: React.FC<O02ShareItemModalProps> = ({
  isOpen,
  onClose,
  resourceType,
  resourceId,
  resourceTitle,
  onShare,
}) => {
  const [recipient, setRecipient] = useState('karim@daleel-beta.com');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim()) {
      setError('Please choose an invited beta user.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onShare(recipient);
      onClose();
    } catch (err: any) {
      setError(err?.detail || 'Failed to create share grant.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Share ${resourceType}: ${resourceTitle}`}
      description="Grant read-only access to an invited collaborator in their personal workspace."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-muted-ink mb-1.5">
            Invited recipient email
          </label>
          <select
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-line rounded bg-surface text-ink focus:border-deep-teal"
          >
            <option value="karim@daleel-beta.com">karim@daleel-beta.com (Invited collaborator)</option>
            <option value="nour@research-lab.org">nour@research-lab.org (Invited collaborator)</option>
          </select>
          <p className="text-[11px] text-muted-ink mt-1">
            Beta access is isolated. Only verified invited accounts can receive shares.
          </p>
        </div>

        {/* Explicit Privacy Notice from PRD §13 & Spec O02 */}
        <div className="p-3 rounded bg-subtle-surface border border-line text-xs text-muted-ink space-y-1.5">
          <div className="flex items-center gap-1.5 font-medium text-ink">
            <Shield className="w-3.5 h-3.5 text-deep-teal" />
            Explicit Privacy Boundary
          </div>
          <p className="leading-relaxed">
            The recipient receives only this specific {resourceType} and its evidence citations.
            <strong className="text-ink font-medium"> No login session, browser credentials, or private run history are shared.</strong>
          </p>
        </div>

        {error && (
          <div className="p-2.5 rounded bg-subtle-surface border border-line text-xs text-ink flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-ink shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-medium text-ink bg-surface border border-line hover:bg-subtle-surface"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded text-xs font-medium text-white bg-deep-teal hover:bg-deep-teal-hover flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            {isSubmitting ? 'Sharing...' : 'Share item'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
