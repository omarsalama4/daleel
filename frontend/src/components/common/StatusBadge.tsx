import React from 'react';
import {
  Clock,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileQuestion,
  RefreshCw,
  Copy,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
  showIcon = true,
}) => {
  const norm = status.toLowerCase().replace(/_/g, ' ');

  // Quiet research styling: text + icon in ink or muted ink, subtle border, no rainbow styling
  let icon = <HelpCircle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />;
  let label = status.replace(/_/g, ' ');

  if (norm.includes('running') || norm.includes('in progress')) {
    icon = <Play className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-deep-teal`} />;
    label = 'Running';
  } else if (norm.includes('needs attention') || norm.includes('needs review') || norm.includes('drift')) {
    icon = <AlertTriangle className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-ink`} />;
    label = norm.includes('drift') ? 'Needs review (Drift)' : 'Needs attention';
  } else if (norm.includes('complete') || norm.includes('passed') || norm.includes('active') || norm.includes('approved') || norm.includes('healthy')) {
    icon = <CheckCircle2 className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-deep-teal`} />;
    label = norm.includes('complete') ? 'Complete' : norm.includes('active') ? 'Active' : norm.includes('approved') ? 'Approved' : 'Passed';
  } else if (norm.includes('paused')) {
    icon = <Pause className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-muted-ink`} />;
    label = 'Paused';
  } else if (norm.includes('partial')) {
    icon = <AlertTriangle className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-muted-ink`} />;
    label = 'Partial';
  } else if (norm.includes('failed')) {
    icon = <XCircle className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-ink`} />;
    label = 'Failed';
  } else if (norm.includes('cancelled') || norm.includes('revoked') || norm.includes('retired')) {
    icon = <XCircle className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-muted-ink`} />;
    label = norm.includes('cancelled') ? 'Cancelled' : norm.includes('revoked') ? 'Revoked' : 'Retired';
  } else if (norm.includes('awaiting approval') || norm.includes('previewed') || norm.includes('planning')) {
    icon = <Clock className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-muted-ink`} />;
    label = norm.includes('approval') ? 'Awaiting approval' : norm.includes('previewed') ? 'Previewed' : 'Planning';
  } else if (norm.includes('queued')) {
    icon = <RefreshCw className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-muted-ink animate-spin`} />;
    label = 'Queued';
  } else if (norm.includes('relevant') && !norm.includes('irrelevant')) {
    icon = <CheckCircle2 className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-deep-teal`} />;
    label = 'Relevant';
  } else if (norm.includes('irrelevant')) {
    icon = <XCircle className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-muted-ink`} />;
    label = 'Irrelevant';
  } else if (norm.includes('incomplete')) {
    icon = <FileQuestion className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-muted-ink`} />;
    label = 'Incomplete';
  } else if (norm.includes('duplicate')) {
    icon = <Copy className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-muted-ink`} />;
    label = 'Duplicate';
  } else if (norm.includes('verified')) {
    icon = <ShieldCheck className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-deep-teal`} />;
    label = 'Verified';
  } else if (norm.includes('unverified') || norm.includes('unknown')) {
    icon = <ShieldAlert className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-muted-ink`} />;
    label = norm.includes('unknown') ? 'Unknown' : 'Unverified';
  }

  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium border border-line rounded bg-surface text-ink capitalize ${sizeClasses} ${className}`}
    >
      {showIcon && icon}
      <span>{label}</span>
    </span>
  );
};
