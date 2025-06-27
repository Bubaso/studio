import { useState, useEffect } from 'react';

// This hook delays updating a value until a specified amount of time has passed without any new changes.
// It's useful for "live search" or "live filtering" to avoid making too many API calls.
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up a timer to update the debounced value after the specified delay.
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timer if the value changes before the delay has passed.
    // This ensures that we only update when the user stops making changes.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Re-run the effect if the value or delay changes.

  return debouncedValue;
}
