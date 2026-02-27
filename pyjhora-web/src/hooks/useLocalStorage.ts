import { useCallback, useState } from 'react';

/**
 * Hook that syncs state to localStorage.
 * Reads the initial value from storage (falling back to defaultValue),
 * and writes every update back.
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(nextValue));
        } catch {
          // Storage full or unavailable — silently ignore
        }
        return nextValue;
      });
    },
    [key],
  );

  return [storedValue, setValue];
}
