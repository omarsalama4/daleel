import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Shield, KeyRound, ExternalLink, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';

interface O01HostedSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain: string;
  onFinishConnection: () => Promise<void>;
}

export const O01HostedSignInModal: React.FC<O01HostedSignInModalProps> = ({
  isOpen,
  onClose,
  domain,
  onFinishConnection,
}) => {
  const [isFinishing, setIsFinishing] = useState(false);
  const [simulatedLoginDone, setSimulatedLoginDone] = useState(false);

  const handleFinish = async () => {
    setIsFinishing(true);
    try {
      await onFinishConnection();
      onClose();
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Connect authorized session: ${domain || 'target site'}`}
      description="You control login and MFA in an isolated remote browser. Daleel does not bypass barriers or store raw passwords."
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Hosted remote browser viewport simulation */}
        <div className="border border-line rounded overflow-hidden bg-canvas">
          <div className="bg-subtle-surface px-3 py-2 border-b border-line flex items-center justify-between text-xs text-muted-ink">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-deep-teal" />
              <span className="font-mono-tech text-ink font-medium">https://{domain || 'target-site.com'}/login</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-surface border border-line text-ink">Remote session active</span>
          </div>

          <div className="p-8 text-center bg-surface min-h-[220px] flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-subtle-surface border border-line flex items-center justify-center mb-3">
              <KeyRound className="w-6 h-6 text-deep-teal" />
            </div>
            <h4 className="text-sm font-semibold text-ink">Hosted Remote Browser Stream</h4>
            <p className="text-xs text-muted-ink max-w-md mt-1 leading-relaxed">
              Complete your standard multi-factor authentication, passkey, or sign-in on {domain}. Once the destination site confirms your session, click Finish connection below.
            </p>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSimulatedLoginDone(!simulatedLoginDone)}
                className={`px-3 py-1.5 rounded text-xs border ${
                  simulatedLoginDone
                    ? 'border-deep-teal text-deep-teal bg-deep-teal-subtle font-medium'
                    : 'border-line text-muted-ink hover:text-ink bg-surface'
                }`}
              >
                {simulatedLoginDone ? '✓ Session authenticated on remote site' : 'Simulate completed MFA in browser'}
              </button>
            </div>
          </div>
        </div>

        {/* Safety boundary note */}
        <div className="p-3 rounded bg-subtle-surface border border-line text-xs text-muted-ink flex items-start gap-2">
          <Shield className="w-4 h-4 text-deep-teal shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="text-ink font-medium">Security contract:</span> Daleel encrypts and stores the resulting session cookie only in user-scoped storage. Raw session secrets never leave server boundary. AI processing for authenticated content remains OFF unless enabled in workspace settings.
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-medium text-ink bg-surface border border-line hover:bg-subtle-surface"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleFinish}
            disabled={isFinishing}
            className="px-4 py-2 rounded text-xs font-medium text-white bg-deep-teal hover:bg-deep-teal-hover flex items-center gap-2"
          >
            {isFinishing ? 'Validating session...' : 'Finish connection'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
