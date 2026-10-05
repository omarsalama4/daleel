import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface O05DestructiveConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  itemName: string;
  itemType: 'run' | 'workflow' | 'session' | 'share' | 'workspace_data';
  impactDescription: string;
  confirmButtonText?: string;
  onConfirm: () => Promise<void>;
}

export const O05DestructiveConfirmModal: React.FC<O05DestructiveConfirmModalProps> = ({
  isOpen,
  onClose,
  title,
  itemName,
  itemType,
  impactDescription,
  confirmButtonText = 'Confirm deletion',
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={`Irreversible removal of ${itemType}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="p-3.5 rounded bg-subtle-surface border border-line flex items-start gap-3">
          <div className="p-1 rounded bg-surface border border-line text-ink shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4 text-ink" />
          </div>
          <div className="text-xs space-y-1">
            <div className="font-semibold text-ink">Target item:</div>
            <div className="font-mono-tech text-ink bg-surface px-2 py-1 rounded border border-line break-all">
              {itemName}
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-ink leading-relaxed">
          <strong className="text-ink font-medium">Impact of this action: </strong>
          {impactDescription}
        </div>

        <div className="p-3 rounded bg-canvas border border-line text-[11px] text-muted-ink">
          Note: Backup retention windows expire within 30 days. Live indexes and shared grants are purged immediately upon confirmation.
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded text-xs font-medium text-ink bg-surface border border-line hover:bg-subtle-surface"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 rounded text-xs font-medium text-white bg-ink hover:bg-black flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isDeleting ? 'Removing...' : confirmButtonText}
          </button>
        </div>
      </div>
    </Modal>
  );
};
