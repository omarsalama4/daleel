import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { useApi } from '../../services/api';
import type { SessionConnection, SiteSession } from '../../types/api';

interface Props { isOpen: boolean; onClose: () => void; domain: string; onFinishConnection: (session: SiteSession) => Promise<void>; }
export const O01HostedSignInModal: React.FC<Props> = ({ isOpen, onClose, domain, onFinishConnection }) => {
  const api = useApi();
  const [connection, setConnection] = useState<SessionConnection | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setConnection(null); setError('');
    api.connectSite(domain).then(c => { if (active) setConnection(c); })
      .catch(e => { if (active) setError(e?.detail || e?.message || 'Hosted browser unavailable'); });
    return () => { active = false; };
  }, [api, domain, isOpen]);
  const finish = async () => {
    if (!connection) return;
    setBusy(true); setError('');
    try {
      const session = await api.finishSiteSessionConnection(connection.id);
      await onFinishConnection(session); onClose();
    } catch (e: any) { setError(e?.detail || 'The server could not validate this session'); }
    finally { setBusy(false); }
  };
  const url = connection?.browserUrl;
  const safeUrl = url && /^https?:\/\//.test(url) ? url : null;
  return <Modal isOpen={isOpen} onClose={onClose} title={`Connect authorized session: ${domain}`} maxWidth="md">
    <div className="space-y-4 text-sm">
      <p>You control sign-in and MFA in an isolated browser. After signing in, return here to validate the connection.</p>
      {safeUrl ? <a className="text-deep-teal underline" href={safeUrl} target="_blank" rel="noopener noreferrer">Open hosted browser</a> : !error && <p>Preparing isolated browser…</p>}
      <p className="text-xs text-muted-ink">Session secrets are encrypted. Authenticated content is sent to AI only when you enable it in workspace settings.</p>
      {error && <p role="alert" className="text-ink border border-line p-3">{error}</p>}
      <div className="flex justify-end gap-3"><button onClick={onClose}>Cancel</button>
        <button disabled={!connection || busy} onClick={finish} className="px-4 py-2 rounded bg-deep-teal text-white disabled:opacity-50">{busy ? 'Validating…' : 'Finish connection'}</button></div>
    </div>
  </Modal>;
};
