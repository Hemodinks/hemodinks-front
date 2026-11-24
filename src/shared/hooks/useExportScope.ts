import { useEffect, useLayoutEffect, useRef } from 'react';

// A revision also invalidates A -> B -> A; equality against only the final scope
// must never reactivate a file that crossed another session/query in between.
export function useExportScope(values: readonly unknown[]) {
  const current = useRef({ values, revision: 0 });
  // #292: a revisão sobe no commit (antes de qualquer efeito, clique ou resposta assíncrona que a confira),
  // não durante a renderização. capture()/conferência continuam lendo sempre o valor mais recente.
  useLayoutEffect(() => {
    if (values.length !== current.current.values.length || values.some((value, index) => !Object.is(value, current.current.values[index]))) {
      current.current = { values, revision: current.current.revision + 1 };
    }
  });
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  return {
    isMounted: () => mounted.current,
    capture: () => {
      const revision = current.current.revision;
      return () => mounted.current && current.current.revision === revision;
    },
  };
}
