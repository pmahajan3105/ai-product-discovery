/**
 * URL State Management Hook
 * Enables shareable and bookmarkable application states
 */

import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';

type UrlStateValue = string | number | boolean | string[] | Record<string, any> | null | undefined;

interface UseUrlStateOptions {
  defaultValue?: UrlStateValue;
  serialize?: (value: UrlStateValue) => string;
  deserialize?: (value: string | string[]) => UrlStateValue;
  replace?: boolean; // Use router.replace instead of router.push
}

/**
 * Custom hook for managing state in URL query parameters
 */
export function useUrlState<T extends UrlStateValue>(
  key: string,
  options: UseUrlStateOptions = {}
): [T, (value: T) => void] {
  const router = useRouter();
  const { 
    defaultValue, 
    serialize = defaultSerialize, 
    deserialize = defaultDeserialize,
    replace = false 
  } = options;

  // Get initial value from URL or use default
  const getInitialValue = useCallback((): T => {
    if (!router.isReady) return defaultValue as T;
    
    const urlValue = router.query[key];
    if (urlValue === undefined) return defaultValue as T;
    
    try {
      return deserialize(urlValue) as T;
    } catch (error) {
      console.warn(`Failed to deserialize URL parameter "${key}":`, error);
      return defaultValue as T;
    }
  }, [router.isReady, router.query, key, defaultValue, deserialize]);

  const [state, setState] = useState<T>(getInitialValue);

  // Update state when URL changes
  useEffect(() => {
    if (router.isReady) {
      setState(getInitialValue());
    }
  }, [router.isReady, getInitialValue]);

  // Function to update both state and URL
  const updateState = useCallback((newValue: T) => {
    setState(newValue);

    const newQuery = { ...router.query };
    
    if (newValue === null || newValue === undefined || newValue === defaultValue) {
      delete newQuery[key];
    } else {
      newQuery[key] = serialize(newValue);
    }

    const updateMethod = replace ? router.replace : router.push;
    updateMethod({
      pathname: router.pathname,
      query: newQuery,
    }, undefined, { shallow: true });
  }, [router, key, serialize, defaultValue, replace]);

  return [state, updateState];
}

/**
 * Hook for managing multiple URL state parameters
 */
export function useUrlStates<T extends Record<string, UrlStateValue>>(
  config: Record<keyof T, UseUrlStateOptions>
): [T, (updates: Partial<T>) => void] {
  const router = useRouter();
  const [states, setStates] = useState<T>({} as T);

  // Initialize states from URL
  useEffect(() => {
    if (!router.isReady) return;

    const initialStates = {} as T;
    Object.keys(config).forEach(key => {
      const options = config[key];
      const urlValue = router.query[key];
      
      if (urlValue === undefined) {
        initialStates[key as keyof T] = options.defaultValue as T[keyof T];
      } else {
        try {
          const deserializer = options.deserialize || defaultDeserialize;
          initialStates[key as keyof T] = deserializer(urlValue) as T[keyof T];
        } catch (error) {
          console.warn(`Failed to deserialize URL parameter "${key}":`, error);
          initialStates[key as keyof T] = options.defaultValue as T[keyof T];
        }
      }
    });

    setStates(initialStates);
  }, [router.isReady, router.query, config]);

  // Function to update multiple states at once
  const updateStates = useCallback((updates: Partial<T>) => {
    setStates(current => ({ ...current, ...updates }));

    const newQuery = { ...router.query };

    Object.keys(updates).forEach(key => {
      const newValue = updates[key as keyof T];
      const options = config[key];
      const serializer = options.serialize || defaultSerialize;

      if (newValue === null || newValue === undefined || newValue === options.defaultValue) {
        delete newQuery[key];
      } else {
        newQuery[key] = serializer(newValue);
      }
    });

    const firstOptions = Object.values(config)[0];
    const updateMethod = firstOptions?.replace ? router.replace : router.push;
    updateMethod({
      pathname: router.pathname,
      query: newQuery,
    }, undefined, { shallow: true });
  }, [router, config]);

  return [states, updateStates];
}

/**
 * Hook specifically for dashboard filters with URL persistence
 */
export function useDashboardUrlState() {
  const [urlState, setUrlState] = useUrlStates({
    timeRange: {
      defaultValue: '7d',
      serialize: (value) => String(value),
      deserialize: (value) => String(value),
    },
    search: {
      defaultValue: '',
      serialize: (value) => String(value),
      deserialize: (value) => String(value),
    },
    filters: {
      defaultValue: [],
      serialize: (value) => JSON.stringify(value),
      deserialize: (value) => {
        try {
          return JSON.parse(String(value));
        } catch {
          return [];
        }
      },
    },
    view: {
      defaultValue: 'grid',
      serialize: (value) => String(value),
      deserialize: (value) => String(value),
    },
  });

  return {
    timeRange: urlState.timeRange as string,
    search: urlState.search as string,
    filters: urlState.filters as any[],
    view: urlState.view as string,
    updateState: setUrlState,
  };
}

/**
 * Hook for feedback table state with URL persistence
 */
export function useFeedbackTableUrlState() {
  const [urlState, setUrlState] = useUrlStates({
    page: {
      defaultValue: 1,
      serialize: (value) => String(value),
      deserialize: (value) => parseInt(String(value)) || 1,
    },
    limit: {
      defaultValue: 25,
      serialize: (value) => String(value),
      deserialize: (value) => parseInt(String(value)) || 25,
    },
    sortBy: {
      defaultValue: 'createdAt',
      serialize: (value) => String(value),
      deserialize: (value) => String(value),
    },
    sortOrder: {
      defaultValue: 'DESC',
      serialize: (value) => String(value),
      deserialize: (value) => String(value),
    },
    search: {
      defaultValue: '',
      serialize: (value) => String(value),
      deserialize: (value) => String(value),
    },
    status: {
      defaultValue: [],
      serialize: (value) => Array.isArray(value) ? value.join(',') : String(value),
      deserialize: (value) => String(value).split(',').filter(Boolean),
    },
    category: {
      defaultValue: [],
      serialize: (value) => Array.isArray(value) ? value.join(',') : String(value),
      deserialize: (value) => String(value).split(',').filter(Boolean),
    },
    assignedTo: {
      defaultValue: [],
      serialize: (value) => Array.isArray(value) ? value.join(',') : String(value),
      deserialize: (value) => String(value).split(',').filter(Boolean),
    },
  });

  return {
    page: urlState.page as number,
    limit: urlState.limit as number,
    sortBy: urlState.sortBy as string,
    sortOrder: urlState.sortOrder as 'ASC' | 'DESC',
    search: urlState.search as string,
    status: urlState.status as string[],
    category: urlState.category as string[],
    assignedTo: urlState.assignedTo as string[],
    updateState: setUrlState,
  };
}

// Default serialization functions
function defaultSerialize(value: UrlStateValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.join(',');
  return JSON.stringify(value);
}

function defaultDeserialize(value: string | string[]): UrlStateValue {
  if (Array.isArray(value)) {
    return value.length === 1 ? value[0] : value;
  }
  
  if (value === 'true') return true;
  if (value === 'false') return false;
  
  const numberValue = Number(value);
  if (!isNaN(numberValue) && isFinite(numberValue)) return numberValue;
  
  // Try to parse as JSON
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Utility function to generate shareable URLs
 */
export function generateShareableUrl(baseUrl: string, state: Record<string, any>): string {
  const url = new URL(baseUrl);
  
  Object.entries(state).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, defaultSerialize(value));
    }
  });
  
  return url.toString();
}

/**
 * Utility function to copy current URL to clipboard
 */
export function copyCurrentUrlToClipboard(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  
  return navigator.clipboard.writeText(window.location.href);
}