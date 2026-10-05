import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Hook to guard against losing unsaved form changes on page unload or route change.
 */
export function useUnsavedChanges(isDirty: boolean, message = 'You have unsaved edits. Discard changes and leave?') {
  const [showPrompt, setShowPrompt] = useState(false);
  const [nextPath, setNextPath] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // 1. Browser reload / tab close guard
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, message]);

  // 2. Safe navigation helper for in-app clicks
  const proceedWithNavigation = useCallback(() => {
    setShowPrompt(false);
    if (nextPath) {
      navigate(nextPath);
      setNextPath(null);
    }
  }, [nextPath, navigate]);

  const cancelNavigation = useCallback(() => {
    setShowPrompt(false);
    setNextPath(null);
  }, []);

  const guardNavigation = useCallback(
    (to: string) => {
      if (isDirty) {
        setNextPath(to);
        setShowPrompt(true);
        return false;
      }
      navigate(to);
      return true;
    },
    [isDirty, navigate]
  );

  return {
    showPrompt,
    proceedWithNavigation,
    cancelNavigation,
    guardNavigation,
  };
}
