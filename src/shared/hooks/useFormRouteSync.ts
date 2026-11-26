import { useEffect, useRef, useState } from 'react';

// False once the URL has moved on (another record, "novo", the list or another module): a late
// response must not fill the form, show an error or navigate on behalf of a route the user left.
export type IsCurrentRoute = () => boolean;

type FormRouteSyncOptions = {
  // True while the URL is this module's form route (<base>/novo or <base>/<id>) and the session can use it.
  active: boolean;
  recordId: number | null;
  openNew: () => void;
  openRecord: (recordId: number, isCurrent: IsCurrentRoute) => void | Promise<void>;
  // Called when a form route is left, before the next one opens (e.g. to clear a pending loading state).
  onLeave?: () => void;
};

// The URL is the source of truth for create/edit forms: clicking "novo"/"editar", back/forward,
// reload and shared links all reach the form through this single effect, once per route.
export function useFormRouteSync({ active, recordId, openNew, openRecord, onLeave }: FormRouteSyncOptions) {
  const openedRouteRef = useRef<string | null>(null);
  const generationRef = useRef(0);
  const handlersRef = useRef({ openNew, openRecord, onLeave });
  handlersRef.current = { openNew, openRecord, onLeave };

  useEffect(() => {
    const routeKey = active ? (recordId === null ? 'new' : String(recordId)) : null;
    if (openedRouteRef.current === routeKey) return;
    if (openedRouteRef.current !== null) {
      generationRef.current += 1;
      handlersRef.current.onLeave?.();
    }
    openedRouteRef.current = routeKey;
    if (routeKey === null) return;
    const generation = generationRef.current;
    const isCurrent = () => generationRef.current === generation;
    if (recordId === null) handlersRef.current.openNew();
    else void handlersRef.current.openRecord(recordId, isCurrent);
  }, [active, recordId]);

  // Leaving the screen entirely (logout, clinic switch) also invalidates pending loads.
  useEffect(() => () => { generationRef.current += 1; }, []);
}

// Error of a record that could not be opened from the URL. It is shown on the module list after the
// redirect and kept apart from the list error, which the list clears whenever its data arrives.
export function useRecordLoadError(moduleActive: boolean) {
  const [recordLoadError, setRecordLoadError] = useState('');
  useEffect(() => {
    if (!moduleActive) setRecordLoadError('');
  }, [moduleActive]);
  return [recordLoadError, setRecordLoadError] as const;
}
