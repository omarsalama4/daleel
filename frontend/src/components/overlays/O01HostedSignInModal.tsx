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
  const [opened, setOpened] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setConnection(null); setError(''); setOpened(false);
    api.connectSite(domain).then(c => { if (active) setConnection(c); else void api.cancelSiteConnection(c.id).catch(() => {}); })
      .catch(e => { if (active) setError(e?.detail || e?.message || 'Hosted browser unavailable'); });
    return () => { active = false; };
  }, [api, domain, isOpen, attempt]);
  const restart = async () => {
    setBusy(true);
    try {
      if (connection) await api.cancelSiteConnection(connection.id);
      setAttempt(n => n + 1);
    } catch { setError('Could not close the previous browser. Close it in its tab and retry.'); }
    finally { setBusy(false); }
  };
  const close = () => {
    if (busy) return;
    if (connection) void api.cancelSiteConnection(connection.id).catch(() => {});
    onClose();
  };
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
  return <Modal isOpen={isOpen} onClose={close} title={`Connect authorized session: ${domain}`} maxWidth="md">
    <div className="space-y-4 text-sm">
      <p>Connect <strong>{domain}</strong> only if your research needs member-only information. Public research works without a connected account.</p>
      <ol className="space-y-3 rounded border border-line bg-subtle-surface p-4 list-decimal list-inside">
        <li>Open the isolated browser below.</li>
        <li>Sign in and complete any verification code or MFA yourself.</li>
        <li>Leave the browser on a normal signed-in site page, then return here and finish.</li>
      </ol>
      {safeUrl ? <a onClick={() => setOpened(true)} className="inline-flex px-4 py-2 rounded border border-line text-ink font-medium focus-visible:outline-2" href={safeUrl} target="_blank" rel="noopener noreferrer">Open hosted browser</a> : !error && <p role="status">Preparing isolated browser…</p>}
      {connection && <p className="text-xs text-muted-ink">This connection expires {new Date(connection.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Your saved session has its own expiry setting.</p>}
      <p className="text-xs text-muted-ink">Verification codes come from the site, your email, or your authenticator app. Do not change your password or MFA settings to connect Daleel.</p>
      <p className="text-xs text-muted-ink">Session secrets are encrypted. Authenticated content is sent to AI only when you enable it in workspace settings.</p>
      {error && <div role="alert" className="text-ink border border-line rounded p-3 space-y-2"><p>{error}</p>
        <p className="text-xs text-muted-ink">If you are already signed in, return to the site's home page in the hosted browser and retry. An expired connection needs a new browser.</p>
        <button disabled={busy} onClick={restart} className="underline text-sm">Start a new connection</button></div>}
      <div className="flex justify-end gap-3"><button disabled={busy} onClick={close}>Cancel</button>
        <button disabled={!connection || !opened || busy} onClick={finish} className="px-4 py-2 rounded bg-deep-teal text-white disabled:opacity-50">{busy ? 'Validating…' : 'Finish connection'}</button></div>
    </div>
  </Modal>;
};
