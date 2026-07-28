type QueryActivityListener = () => void;

const listeners = new Set<QueryActivityListener>();
let activeQueries = 0;

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function beginQueryActivity() {
  activeQueries += 1;
  emitChange();
  let finished = false;

  return () => {
    if (finished) {
      return;
    }

    finished = true;
    activeQueries = Math.max(0, activeQueries - 1);
    emitChange();
  };
}

export function subscribeToQueryActivity(listener: QueryActivityListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getQueryActivitySnapshot() {
  return activeQueries > 0;
}

export function resetQueryActivityForTests() {
  activeQueries = 0;
  emitChange();
}
