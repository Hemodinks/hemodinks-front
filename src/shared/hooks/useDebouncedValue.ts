import { useEffect, useState } from 'react';

type UseDebouncedValueOptions<T> = {
  delayMs?: number;
  isEqual?: (current: T, debounced: T) => boolean;
  onCommit?: (value: T) => void;
};

export function useDebouncedValue<T>(
  value: T,
  { delayMs = 300, isEqual = Object.is, onCommit }: UseDebouncedValueOptions<T> = {},
) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    if (isEqual(value, debouncedValue)) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      onCommit?.(value);
      setDebouncedValue(value);
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [debouncedValue, delayMs, isEqual, onCommit, value]);

  return [debouncedValue, setDebouncedValue] as const;
}
