import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export type InterestCategory = 'jobs' | 'research' | 'organizations';

function storageKey(category: InterestCategory): string {
  return `interested_${category}_v1`;
}

export async function loadInterestedIds(category: InterestCategory): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(category));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveInterestedIds(category: InterestCategory, ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(category), JSON.stringify(ids));
  } catch {
    // ignore — persistence is best-effort
  }
}

/**
 * Tracks which items a user has marked "interested" in for a given category,
 * persisted to AsyncStorage so the selection survives app restarts.
 */
export function useInterested(category: InterestCategory) {
  const [interestedIds, setInterestedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    loadInterestedIds(category).then((ids) => {
      if (active) setInterestedIds(new Set(ids));
    });
    return () => {
      active = false;
    };
  }, [category]);

  const isInterested = useCallback((id: string) => interestedIds.has(id), [interestedIds]);

  const toggleInterested = useCallback((id: string) => {
    setInterestedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      void saveInterestedIds(category, Array.from(next));
      return next;
    });
  }, [category]);

  return { interestedIds, isInterested, toggleInterested };
}
