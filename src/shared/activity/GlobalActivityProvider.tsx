import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import {
  beginGlobalActivity,
  getGlobalActivitySnapshot,
  subscribeToGlobalActivity,
  withGlobalActivity,
  type GlobalActivityOptions,
} from '../../services/globalActivity';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { useDelayedVisibility } from '../hooks/useDelayedVisibility';

type GlobalActivityContextValue = {
  beginActivity: typeof beginGlobalActivity;
  runActivity: typeof withGlobalActivity;
};

const GlobalActivityContext = createContext<GlobalActivityContextValue | null>(null);

export function GlobalActivityProvider({ children }: PropsWithChildren) {
  const activity = useSyncExternalStore(
    subscribeToGlobalActivity,
    getGlobalActivitySnapshot,
    getGlobalActivitySnapshot,
  );
  const visible = useDelayedVisibility(Boolean(activity.foreground));
  const displayedActivityRef = useRef(activity.foreground);
  if (activity.foreground) {
    displayedActivityRef.current = activity.foreground;
  }
  const displayedActivity = displayedActivityRef.current;
  const beginActivity = useCallback(
    (options: GlobalActivityOptions) => beginGlobalActivity(options),
    [],
  );
  const runActivity = useCallback(
    <T,>(options: GlobalActivityOptions, operation: () => Promise<T>) =>
      withGlobalActivity(options, operation),
    [],
  );
  const context = useMemo(() => ({ beginActivity, runActivity }), [beginActivity, runActivity]);

  return (
    <GlobalActivityContext.Provider value={context}>
      {children}
      <LoadingOverlay
        active={visible}
        eyebrow={displayedActivity?.eyebrow}
        message={displayedActivity?.message}
      />
      {activity.backgroundCount > 0 ? (
        <div
          className="global-background-activity"
          role="status"
          aria-live="polite"
          aria-label="Atualizando informações em segundo plano"
        />
      ) : null}
    </GlobalActivityContext.Provider>
  );
}

export function useGlobalActivity() {
  const context = useContext(GlobalActivityContext);
  if (!context) {
    throw new Error('useGlobalActivity deve ser usado dentro de GlobalActivityProvider.');
  }
  return context;
}
