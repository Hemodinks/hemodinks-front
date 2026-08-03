export type GlobalActivityKind = 'query' | 'save' | 'upload' | 'export';
export type GlobalActivityPresentation = 'foreground' | 'background';

export type GlobalActivityOptions = {
  kind: GlobalActivityKind;
  presentation?: GlobalActivityPresentation;
  eyebrow?: string;
  message?: string;
};

export type GlobalActivity = Required<
  Pick<GlobalActivityOptions, 'kind' | 'presentation' | 'eyebrow' | 'message'>
> & {
  id: number;
};

export type GlobalActivitySnapshot = {
  foreground: GlobalActivity | null;
  backgroundCount: number;
};

type GlobalActivityListener = () => void;

const defaultCopy: Record<GlobalActivityKind, Pick<GlobalActivity, 'eyebrow' | 'message'>> = {
  query: { eyebrow: 'Consultando', message: 'Buscando informações...' },
  save: { eyebrow: 'Salvando', message: 'Gravando alterações...' },
  upload: { eyebrow: 'Enviando', message: 'Enviando arquivo...' },
  export: { eyebrow: 'Exportando', message: 'Preparando arquivo...' },
};

const listeners = new Set<GlobalActivityListener>();
const activities = new Map<number, GlobalActivity>();
let nextActivityId = 1;
let snapshot: GlobalActivitySnapshot = { foreground: null, backgroundCount: 0 };

function rebuildSnapshot() {
  const currentActivities = [...activities.values()];
  snapshot = {
    foreground:
      currentActivities.filter((activity) => activity.presentation === 'foreground').at(-1) ?? null,
    backgroundCount: currentActivities.filter((activity) => activity.presentation === 'background')
      .length,
  };
  listeners.forEach((listener) => listener());
}

export function beginGlobalActivity(options: GlobalActivityOptions) {
  const copy = defaultCopy[options.kind];
  const id = nextActivityId++;

  activities.set(id, {
    id,
    kind: options.kind,
    presentation: options.presentation ?? 'foreground',
    eyebrow: options.eyebrow ?? copy.eyebrow,
    message: options.message ?? copy.message,
  });
  rebuildSnapshot();

  let finished = false;
  return () => {
    if (finished) {
      return;
    }

    finished = true;
    activities.delete(id);
    rebuildSnapshot();
  };
}

export async function withGlobalActivity<T>(
  options: GlobalActivityOptions,
  operation: () => Promise<T>,
) {
  const finish = beginGlobalActivity(options);
  try {
    return await operation();
  } finally {
    finish();
  }
}

export function subscribeToGlobalActivity(listener: GlobalActivityListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getGlobalActivitySnapshot() {
  return snapshot;
}

export function resetGlobalActivityForTests() {
  activities.clear();
  nextActivityId = 1;
  rebuildSnapshot();
}
