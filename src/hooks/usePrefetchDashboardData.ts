import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';

/**
 * Custom data-prefetching hook that begins fetching essential user dashboard data
 * immediately after successful authentication to hide latency.
 */
export function usePrefetchDashboardData() {
  const { currentUser, isPrefetched, prefetchDashboardData } = useApp();
  const [isPrefetching, setIsPrefetching] = useState(false);

  useEffect(() => {
    let active = true;
    if (currentUser && !isPrefetched && typeof prefetchDashboardData === 'function') {
      setIsPrefetching(true);
      prefetchDashboardData()
        .catch((err) => {
          console.warn('Dashboard prefetching failed in hook:', err);
        })
        .finally(() => {
          if (active) {
            setIsPrefetching(false);
          }
        });
    }
    return () => {
      active = false;
    };
  }, [currentUser?.uid, isPrefetched, prefetchDashboardData]);

  return {
    isPrefetching,
    isPrefetched
  };
}
