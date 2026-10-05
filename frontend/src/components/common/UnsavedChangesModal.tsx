import React from 'react';
import { Modal } from './Modal';
import { AlertCircle } from 'lucide-react';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onStay: () => void;
  onLeave: () => void;
  title?: string;
  message?: string;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  onStay,
  onLeave,
  title = 'Unsaved changes',
  message = 'You have unsaved changes that will be lost if you leave this page. Stay to save your work, or leave to discard.',
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onStay} title={title} maxWidth="md">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-subtle-surface rounded border border-line">
          <AlertCircle className="w-5 h-5 text-muted-ink shrink-0 mt-0.5" />
          <p className="text-sm text-ink leading-relaxed">{message}</p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
          <button
            type="button"
            onClick={onStay}
            className="px-4 py-2 text-sm font-medium rounded bg-surface hover:bg-canvas text-ink border border-line"
          >
            Stay
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="px-4 py-2 text-sm font-medium rounded bg-surface hover:bg-subtle-surface text-muted-ink hover:text-ink border border-line"
          >
            Leave and discard
          </button>
        </div>
      </div>
    </Modal>
  );
};
