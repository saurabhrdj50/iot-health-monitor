import { useState, useEffect, useRef, useCallback } from 'react';

export default function useRealTime(fetchFn, intervalMs = 5000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await fetchFn();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, intervalMs);
    return () => clearInterval(intervalRef.current);
  }, [fetchData, intervalMs]);

  return { data, loading, error, refetch: fetchData };
}
